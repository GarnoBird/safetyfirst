import { recordAuditEvent, requestMeta } from "./audit.js";
import { createSystemAlert } from "./ops.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

const LOGIN_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 10;

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

function cleanScope(value) {
  const scope = String(value || "").trim().toLowerCase();
  return scope === "worker" ? "worker" : "staff";
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase().slice(0, 200);
}
