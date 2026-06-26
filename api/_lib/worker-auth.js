import crypto from "node:crypto";
import { promisify } from "node:util";
import { parseCookies, serializeCookie } from "./http.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const scrypt = promisify(crypto.scrypt);

const WORKER_COOKIE_NAME = "sf_worker_session";
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

  const worker = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_profiles")
      .update(update)
      .eq("id", id)
      .select(WORKER_SELECT)
      .single(),
    "Worker account could not be updated.",
  );

  if (body?.active === false) await revokeWorkerSessions(id);
  return worker;
}

export async function listWorkerProfiles({ search = "", company = "", active = "all" } = {}) {
  let query = getSupabaseServiceClient()
    .from("worker_profiles")
    .select(WORKER_SELECT)
    .order("company", { ascending: true })
    .order("name", { ascending: true });

  if (company) query = query.eq("company", company);
  if (active === "true") query = query.eq("active", true);
  if (active === "false") query = query.eq("active", false);

  const rows = throwIfSupabaseError(
    await query,
    "Worker accounts could not be loaded.",
  );

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
    sessionToken: await createWorkerSession(worker.id, rememberMe),
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
  const tokenHash = hashSessionToken(token);

  const session = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_sessions")
      .select(`id, worker_id, expires_at, revoked_at, worker_profiles!inner(${WORKER_SELECT})`)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
    "Worker session could not be verified.",
  );

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
  await getSupabaseServiceClient()
    .from("worker_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashSessionToken(token))
    .is("revoked_at", null);
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

  const rows = throwIfSupabaseError(await query, "Worker account could not be loaded.");
  return rows[0] || null;
}

async function createWorkerSession(workerId, rememberMe) {
  const token = crypto.randomBytes(32).toString("base64url");
  const ttl = rememberMe ? REMEMBER_SESSION_TTL_SECONDS : STANDARD_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  throwIfSupabaseError(
    await getSupabaseServiceClient().from("worker_sessions").insert({
      worker_id: workerId,
      token_hash: hashSessionToken(token),
      remember_me: Boolean(rememberMe),
      expires_at: expiresAt,
    }),
    "Worker session could not be created.",
  );
  return token;
}

async function revokeWorkerSessions(workerId) {
  await getSupabaseServiceClient()
    .from("worker_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("worker_id", workerId)
    .is("revoked_at", null);
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

function cleanUuid(value, message) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return id;
}
