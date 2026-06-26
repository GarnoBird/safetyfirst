import crypto from "node:crypto";
import { promisify } from "node:util";
import {
  getFallbackRecord,
  listFallbackRecords,
  upsertFallbackRecord,
} from "./fallback-store.js";
import { parseCookies, serializeCookie } from "./http.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

const scrypt = promisify(crypto.scrypt);

const WORKER_COOKIE_NAME = "sf_worker_session";
const STATELESS_SESSION_PREFIX = "sfw1";
const REMEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 400;
const STANDARD_SESSION_TTL_SECONDS = 60 * 60 * 12;
const WORKER_SELECT =
  "id, name, company, phone, phone_normalized, username, active, created_at, updated_at";

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

export function cleanWorkerProfileInput(body, { requirePassword = false } = {}) {
  const cleaned = {
    name: String(body?.name || "").trim(),
    company: String(body?.company || "").trim(),
    phone: String(body?.phone || "").trim(),
    username: normalizeUsername(body?.username),
    active: body?.active === undefined ? true : Boolean(body.active),
  };
  cleaned.phone_normalized = normalizePhone(cleaned.phone);

  const missing = ["name", "company", "phone", "username"].filter(
    (field) => !cleaned[field],
  );
  if (!cleaned.phone_normalized) missing.push("phone digits");
  if (requirePassword && !String(body?.password || "")) missing.push("password");

  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  if (!/^[a-z0-9._-]{2,64}$/.test(cleaned.username)) {
    const error = new Error("Username can use letters, numbers, dots, dashes, and underscores.");
    error.statusCode = 400;
    throw error;
  }

  return cleaned;
}

export async function hashWorkerPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = await scrypt(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("base64url")}`;
}

export async function verifyWorkerPassword(password, storedHash) {
  const [scheme, salt, expectedHash] = String(storedHash || "").split("$");
  if (scheme !== "scrypt" || !salt || !expectedHash) return false;
  const derived = await scrypt(String(password), salt, 64);
  const expected = Buffer.from(expectedHash, "base64url");
  const actual = Buffer.from(derived);
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
}

export async function createWorkerProfile(body, staffId) {
  const cleaned = cleanWorkerProfileInput(body, { requirePassword: true });
  const password_hash = await hashWorkerPassword(body.password);
  try {
    return throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("worker_profiles")
        .insert({
          ...cleaned,
          password_hash,
          created_by_staff_id: staffId,
          updated_by_staff_id: staffId,
        })
        .select(WORKER_SELECT)
        .single(),
      "Worker account could not be created.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return createFallbackWorkerProfile(cleaned, password_hash, staffId);
  }
}

export async function updateWorkerProfile(body, staffId) {
  const id = cleanUuid(body?.id, "Worker id is not valid.");
  const update = {};
  ["name", "company", "phone", "username"].forEach((field) => {
    if (body?.[field] !== undefined) update[field] = String(body[field] || "").trim();
  });
  if (update.username !== undefined) update.username = normalizeUsername(update.username);
  if (update.phone !== undefined) update.phone_normalized = normalizePhone(update.phone);
  if (body?.active !== undefined) update.active = Boolean(body.active);
  if (body?.password) update.password_hash = await hashWorkerPassword(body.password);

  if (update.username !== undefined && !/^[a-z0-9._-]{2,64}$/.test(update.username)) {
    const error = new Error("Username can use letters, numbers, dots, dashes, and underscores.");
    error.statusCode = 400;
    throw error;
  }
  if (update.phone !== undefined && !update.phone_normalized) {
    const error = new Error("Phone number must include digits.");
    error.statusCode = 400;
    throw error;
  }

  update.updated_at = new Date().toISOString();
  update.updated_by_staff_id = staffId;

  let worker;
  try {
    worker = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("worker_profiles")
        .update(update)
        .eq("id", id)
        .select(WORKER_SELECT)
        .single(),
      "Worker account could not be updated.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    worker = await updateFallbackWorkerProfile(id, update, staffId);
  }

  if (body?.active === false) await revokeWorkerSessions(id);
  return worker;
}

export async function listWorkerProfiles({ search = "", company = "", active = "all" } = {}) {
  let rows;
  try {
    let query = getSupabaseServiceClient()
      .from("worker_profiles")
      .select(WORKER_SELECT)
      .order("company", { ascending: true })
      .order("name", { ascending: true });

    if (company) query = query.eq("company", company);
    if (active === "true") query = query.eq("active", true);
    if (active === "false") query = query.eq("active", false);

    rows = throwIfSupabaseError(
      await query,
      "Worker accounts could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    rows = await listFallbackWorkers({ company, active });
  }

  const normalizedSearch = String(search || "").trim().toLowerCase();
  if (!normalizedSearch) return rows;
  return rows.filter((worker) =>
    [worker.name, worker.company, worker.phone, worker.username]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
  );
}

export async function loginWorker(identifier, password, rememberMe = false) {
  const cleanedIdentifier = String(identifier || "").trim();
  if (!cleanedIdentifier || !password) {
    const error = new Error("Username or phone and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const worker = await findWorkerForLogin(cleanedIdentifier);
  if (!worker || !(await verifyWorkerPassword(password, worker.password_hash))) {
    const error = new Error("Invalid username, phone, or password.");
    error.statusCode = 401;
    throw error;
  }

  return {
    worker: publicWorker(worker),
    sessionToken: await createWorkerSession(worker, rememberMe),
  };
}

export function setWorkerSessionCookie(res, token, rememberMe = false) {
  res.setHeader(
    "set-cookie",
    serializeCookie(WORKER_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: rememberMe
        ? REMEMBER_SESSION_TTL_SECONDS
        : STANDARD_SESSION_TTL_SECONDS,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    }),
  );
}

export function clearWorkerSessionCookie(res) {
  res.setHeader(
    "set-cookie",
    serializeCookie(WORKER_COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    }),
  );
}

export async function getWorkerFromRequest(req) {
  const token = parseCookies(req)[WORKER_COOKIE_NAME];
  if (!token) return null;

  if (String(token).startsWith(`${STATELESS_SESSION_PREFIX}.`)) {
    const session = verifyStatelessWorkerSession(token);
    if (!session?.workerId) return null;
    const worker = await loadWorkerById(session.workerId);
    return worker?.active ? publicWorker(worker) : null;
  }

  const tokenHash = hashSessionToken(token);

  let session;
  try {
    session = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("worker_sessions")
        .select(`id, worker_id, expires_at, revoked_at, worker_profiles!inner(${WORKER_SELECT})`)
        .eq("token_hash", tokenHash)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle(),
      "Worker session could not be verified.",
    );
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return null;
    throw error;
  }

  if (!session?.worker_profiles?.active) return null;

  await getSupabaseServiceClient()
    .from("worker_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return publicWorker(session.worker_profiles);
}

export async function requireWorker(req) {
  const worker = await getWorkerFromRequest(req);
  if (!worker) {
    const error = new Error("Worker login required.");
    error.statusCode = 401;
    throw error;
  }
  return worker;
}

export async function logoutWorker(req) {
  const token = parseCookies(req)[WORKER_COOKIE_NAME];
  if (!token) return;
  if (String(token).startsWith(`${STATELESS_SESSION_PREFIX}.`)) return;
  const result = await getSupabaseServiceClient()
      .from("worker_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashSessionToken(token))
      .is("revoked_at", null);
  if (result.error && !isSupabaseMissingRelationError(result.error)) {
    throwIfSupabaseError(result, "Worker session could not be ended.");
  }
}

async function findWorkerForLogin(identifier) {
  const username = normalizeUsername(identifier);
  const phoneNormalized = normalizePhone(identifier);
  let query = getSupabaseServiceClient()
    .from("worker_profiles")
    .select(`${WORKER_SELECT}, password_hash`)
    .eq("active", true)
    .limit(1);

  if (phoneNormalized && /^[\d\s()+.-]+$/.test(identifier)) {
    query = query.eq("phone_normalized", phoneNormalized);
  } else {
    query = query.eq("username", username);
  }

  try {
    const rows = throwIfSupabaseError(await query, "Worker account could not be loaded.");
    return rows[0] || null;
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return findFallbackWorkerForLogin(identifier);
  }
}

async function createWorkerSession(worker, rememberMe) {
  if (worker._fallbackStore) return createStatelessWorkerSession(worker.id, rememberMe);

  const token = crypto.randomBytes(32).toString("base64url");
  const ttl = rememberMe ? REMEMBER_SESSION_TTL_SECONDS : STANDARD_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  try {
    throwIfSupabaseError(
      await getSupabaseServiceClient().from("worker_sessions").insert({
        worker_id: worker.id,
        token_hash: hashSessionToken(token),
        remember_me: Boolean(rememberMe),
        expires_at: expiresAt,
      }),
      "Worker session could not be created.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return createStatelessWorkerSession(worker.id, rememberMe);
  }
  return token;
}

async function revokeWorkerSessions(workerId) {
  const result = await getSupabaseServiceClient()
    .from("worker_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("worker_id", workerId)
    .is("revoked_at", null);
  if (result.error && !isSupabaseMissingRelationError(result.error)) {
    throwIfSupabaseError(result, "Worker sessions could not be revoked.");
  }
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("base64url");
}

function publicWorker(worker) {
  return {
    id: worker.id,
    name: worker.name,
    company: worker.company,
    phone: worker.phone,
    username: worker.username,
    active: worker.active,
  };
}

async function createFallbackWorkerProfile(cleaned, passwordHash, staffId) {
  const existing = await listFallbackWorkers();
  assertFallbackWorkerUnique(existing, cleaned);

  const now = new Date().toISOString();
  const saved = await upsertFallbackRecord(
    "worker",
    crypto.randomUUID(),
    {
      ...cleaned,
      password_hash: passwordHash,
      active: cleaned.active,
      created_at: now,
      updated_at: now,
      created_by_staff_id: staffId,
      updated_by_staff_id: staffId,
      _fallbackStore: true,
    },
    staffId,
  );
  return staffWorker(saved);
}

async function updateFallbackWorkerProfile(id, update, staffId) {
  const worker = await getFallbackRecord("worker", id);
  if (!worker) {
    const error = new Error("Worker account was not found.");
    error.statusCode = 404;
    throw error;
  }

  const next = {
    ...worker,
    ...update,
    id,
    phone_normalized:
      update.phone !== undefined ? normalizePhone(update.phone) : worker.phone_normalized,
    updated_at: new Date().toISOString(),
    updated_by_staff_id: staffId,
    _fallbackStore: true,
  };

  const existing = await listFallbackWorkers();
  assertFallbackWorkerUnique(existing.filter((row) => row.id !== id), next);
  return staffWorker(await upsertFallbackRecord("worker", id, next, staffId));
}

async function listFallbackWorkers({ company = "", active = "all", includeSecrets = false } = {}) {
  return (await listFallbackRecords("worker"))
    .map((worker) => ({ ...worker, _fallbackStore: true }))
    .filter((worker) => !company || worker.company === company)
    .filter((worker) => active === "all" || String(Boolean(worker.active)) === active)
    .sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name))
    .map((worker) => (includeSecrets ? worker : staffWorker(worker)));
}

async function findFallbackWorkerForLogin(identifier) {
  const username = normalizeUsername(identifier);
  const phoneNormalized = normalizePhone(identifier);
  const workers = await listFallbackWorkers({ active: "true", includeSecrets: true });
  return (
    workers.find((worker) =>
      phoneNormalized && /^[\d\s()+.-]+$/.test(identifier)
        ? worker.phone_normalized === phoneNormalized
        : worker.username === username,
    ) || null
  );
}

async function loadWorkerById(id) {
  try {
    const row = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("worker_profiles")
        .select(WORKER_SELECT)
        .eq("id", id)
        .maybeSingle(),
      "Worker account could not be loaded.",
    );
    return row;
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    const fallback = await getFallbackRecord("worker", id);
    return fallback ? { ...fallback, _fallbackStore: true } : null;
  }
}

function assertFallbackWorkerUnique(existing, worker) {
  const sameUsername = existing.find((row) => row.username === worker.username);
  if (sameUsername) {
    const error = new Error("Username is already in use.");
    error.statusCode = 409;
    throw error;
  }
  const samePhone = existing.find(
    (row) => row.phone_normalized && row.phone_normalized === worker.phone_normalized,
  );
  if (samePhone) {
    const error = new Error("Phone number is already in use.");
    error.statusCode = 409;
    throw error;
  }
}

function staffWorker(worker) {
  return {
    id: worker.id,
    name: worker.name,
    company: worker.company,
    phone: worker.phone,
    phone_normalized: worker.phone_normalized,
    username: worker.username,
    active: worker.active,
    created_at: worker.created_at,
    updated_at: worker.updated_at,
  };
}

function createStatelessWorkerSession(workerId, rememberMe) {
  const ttl = rememberMe ? REMEMBER_SESSION_TTL_SECONDS : STANDARD_SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      workerId,
      exp: Math.floor(Date.now() / 1000) + ttl,
    }),
  ).toString("base64url");
  return `${STATELESS_SESSION_PREFIX}.${payload}.${signWorkerSessionPayload(payload)}`;
}

function verifyStatelessWorkerSession(token) {
  const [prefix, payload, signature] = String(token || "").split(".");
  if (prefix !== STATELESS_SESSION_PREFIX || !payload || !signature) return null;
  const expected = signWorkerSessionPayload(payload);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, signatureBytes)
  ) {
    return null;
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function signWorkerSessionPayload(payload) {
  return crypto
    .createHmac("sha256", getWorkerSessionSecret())
    .update(payload)
    .digest("base64url");
}

function getWorkerSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    const error = new Error("Missing SESSION_SECRET or CRON_SECRET.");
    error.statusCode = 503;
    throw error;
  }
  return secret;
}

function cleanUuid(value, message) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return id;
}
