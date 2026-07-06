import { recordAuditEvent, requestMeta } from "./audit.js";
import { createSystemAlert } from "./ops.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 60;
const rateLimitBuckets = new Map();

export async function assertLoginAllowed({ scope, identifier, req }) {
  const normalizedScope = cleanScope(scope);
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const meta = requestMeta(req);
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();

  try {
    const [identifierCount, ipCount] = await Promise.all([
      countFailedAttempts({
        scope: normalizedScope,
        field: "identifier",
        value: normalizedIdentifier,
        cutoff,
      }),
      meta.ipAddress
        ? countFailedAttempts({
            scope: normalizedScope,
            field: "ip_address",
            value: meta.ipAddress,
            cutoff,
          })
        : 0,
    ]);

    if (Math.max(identifierCount, ipCount) < MAX_FAILED_ATTEMPTS) return;
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return;
    throw error;
  }

  await recordAuditEvent({
    req,
    action: `${normalizedScope}_login_rate_limited`,
    targetType: normalizedScope,
    targetId: normalizedIdentifier,
    summary: `${normalizedScope} login was rate limited.`,
    metadata: { identifier: normalizedIdentifier, windowMinutes: LOGIN_WINDOW_MINUTES },
  });
  await createSystemAlert({
    source: "auth",
    alertKey: `${normalizedScope}_login_rate_limit_${normalizedIdentifier || meta.ipAddress || "unknown"}`,
    severity: "critical",
    title: `${normalizedScope} login rate limit triggered`,
    body: "Repeated failed login attempts were blocked.",
    metadata: {
      scope: normalizedScope,
      identifier: normalizedIdentifier,
      ipAddress: meta.ipAddress,
      windowMinutes: LOGIN_WINDOW_MINUTES,
    },
  });

  const error = new Error("Too many failed login attempts. Try again later.");
  error.statusCode = 429;
  error.exposeMessage = true;
  throw error;
}

export async function recordLoginAttempt({
  scope,
  identifier,
  success,
  failureReason = "",
  req,
}) {
  const meta = requestMeta(req);
  try {
    return throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("security_login_attempts")
        .insert({
          scope: cleanScope(scope),
          identifier: normalizeIdentifier(identifier),
          ip_address: meta.ipAddress || "",
          user_agent: meta.userAgent || null,
          success: Boolean(success),
          failure_reason: success ? null : String(failureReason || "").slice(0, 500),
        })
        .select("id, scope, identifier, success, created_at")
        .single(),
      "Login attempt could not be recorded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) {
      console.warn("Login attempt log failed", error.message);
    }
    return null;
  }
}

export function assertTrustedOrigin(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;

  const source = req.headers.origin || req.headers.referer || "";
  if (!source) return;

  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    throwForbiddenOrigin();
  }

  const trustedHosts = new Set([
    req.headers.host,
    req.headers["x-forwarded-host"],
    hostFromUrl(process.env.APP_PUBLIC_URL),
    process.env.VERCEL_URL,
  ].filter(Boolean).map((host) => String(host).toLowerCase()));

  if (trustedHosts.has(sourceUrl.host.toLowerCase())) return;
  throwForbiddenOrigin();
}

export function assertRateLimit({
  req,
  scope,
  identifier = "",
  limit = DEFAULT_RATE_LIMIT_MAX,
  windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
} = {}) {
  const meta = requestMeta(req);
  const key = [
    cleanRateLimitPart(scope || "api"),
    cleanRateLimitPart(identifier || meta.ipAddress || "unknown"),
  ].join(":");
  const now = Date.now();
  pruneRateLimitBuckets(now);
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return;

  const error = new Error("Too many requests. Try again later.");
  error.statusCode = 429;
  error.exposeMessage = true;
  throw error;
}

async function countFailedAttempts({ scope, field, value, cutoff }) {
  if (!value) return 0;
  const result = await getSupabaseServiceClient()
    .from("security_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scope", scope)
    .eq(field, value)
    .eq("success", false)
    .gte("created_at", cutoff);
  if (result.error) {
    if (isSupabaseMissingRelationError(result.error)) return 0;
    throwIfSupabaseError(result, "Login attempts could not be checked.");
  }
  return result.count || 0;
}

function pruneRateLimitBuckets(now) {
  if (rateLimitBuckets.size < 1000) return;
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

function cleanRateLimitPart(value) {
  return String(value || "").trim().toLowerCase().slice(0, 200) || "unknown";
}

function hostFromUrl(value) {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function throwForbiddenOrigin() {
  const error = new Error("Request origin is not allowed.");
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

function cleanScope(value) {
  const scope = String(value || "").trim().toLowerCase();
  return scope === "worker" ? "worker" : "staff";
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase().slice(0, 200);
}
