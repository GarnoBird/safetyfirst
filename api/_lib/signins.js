import crypto from "node:crypto";
import { getVancouverDate } from "./date.js";
import { parseCookies, serializeCookie } from "./http.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

export const SIGNIN_FIELDS = ["name", "phone", "trade", "company"];
export const SORT_FIELDS = [
  "name",
  "phone",
  "trade",
  "company",
  "signed_in_at",
  "signed_out_at",
];
export const GROUP_FIELDS = ["none", "trade", "company"];

const WORKER_COOKIE_NAME = "sf_worker_signin";
const WORKER_COOKIE_TTL_SECONDS = 60 * 60 * 36;
const WORKER_SIGNOUT_TOKEN_TTL_SECONDS = WORKER_COOKIE_TTL_SECONDS;
const WORKER_SIGNIN_ID_LIMIT = 100;
const WORKER_SIGNOUT_TOKEN_LIMIT = 100;
const WORKER_SIGNIN_SELECT =
  "id, name, phone, trade, company, signed_in_at, signed_out_at, sign_in_date_vancouver, sign_out_date_vancouver";

export function cleanSignInInput(body) {
  const cleaned = {};
  SIGNIN_FIELDS.forEach((field) => {
    cleaned[field] = String(body?.[field] || "").trim();
  });

  const missing = SIGNIN_FIELDS.filter((field) => !cleaned[field]);
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  return cleaned;
}

export async function createWorkerSignIn(body) {
  const cleaned = cleanSignInInput(body);
  const now = new Date();
  const signInDate = getVancouverDate(now);
  const existingSignIn = await findOpenWorkerSignInByIdentity({
    date: signInDate,
    name: cleaned.name,
    company: cleaned.company,
  });
  if (existingSignIn) return { signIn: existingSignIn, created: false };

  const row = {
    ...cleaned,
    signed_in_at: now.toISOString(),
    sign_in_date_vancouver: signInDate,
  };

  const result = await getSupabaseServiceClient()
    .from("worker_signins")
    .insert(row)
    .select(WORKER_SIGNIN_SELECT)
    .single();

  if (!result.error) return { signIn: result.data, created: true };

  if (isOpenWorkerSignInDedupeConflict(result.error)) {
    const racedSignIn = await findOpenWorkerSignInByIdentity({
      date: signInDate,
      name: cleaned.name,
      company: cleaned.company,
    });
    if (racedSignIn) return { signIn: racedSignIn, created: false };
  }

  return {
    signIn: throwIfSupabaseError(result, "Worker sign-in could not be saved."),
    created: true,
  };
}

export function normalizeWorkerSignInIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

async function findOpenWorkerSignInByIdentity({ date, name, company }) {
  const normalizedName = normalizeWorkerSignInIdentity(name);
  const normalizedCompany = normalizeWorkerSignInIdentity(company);
  if (!date || !normalizedName || !normalizedCompany) return null;

  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select(WORKER_SIGNIN_SELECT)
      .eq("sign_in_date_vancouver", date)
      .is("signed_out_at", null)
      .order("signed_in_at", { ascending: true })
      .order("id", { ascending: true }),
    "Worker sign-in could not be loaded.",
  );

  return (
    rows.find(
      (row) =>
        normalizeWorkerSignInIdentity(row.name) === normalizedName &&
        normalizeWorkerSignInIdentity(row.company) === normalizedCompany,
    ) || null
  );
}

function isOpenWorkerSignInDedupeConflict(error) {
  return error?.code === "23505";
}

export function setWorkerSignInCookie(res, signInId) {
  res.setHeader(
    "set-cookie",
    serializeCookie(WORKER_COOKIE_NAME, createWorkerToken(signInId), {
      httpOnly: true,
      maxAge: WORKER_COOKIE_TTL_SECONDS,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    }),
  );
}

export function clearWorkerSignInCookie(res) {
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

export async function getCurrentWorkerSignIn(req) {
  const signInId = verifyWorkerToken(parseCookies(req)[WORKER_COOKIE_NAME]);
  if (!signInId) return null;

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select(WORKER_SIGNIN_SELECT)
      .eq("id", signInId)
      .eq("sign_in_date_vancouver", getVancouverDate())
      .is("signed_out_at", null)
      .maybeSingle(),
    "Worker sign-in could not be loaded.",
  );
}

export async function getCurrentWorkerSignInsByIds(ids, { signOutTokens } = {}) {
  const signInIds = cleanWorkerSignInIds(ids);
  if (!signInIds.length) return [];
  assertWorkerSignOutAuthorized(signInIds, signOutTokens);

  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select(WORKER_SIGNIN_SELECT)
      .in("id", signInIds)
      .eq("sign_in_date_vancouver", getVancouverDate())
      .is("signed_out_at", null),
    "Worker sign-ins could not be loaded.",
  );

  return orderSignInsByIds(rows, signInIds);
}

export async function signOutCurrentWorker(req) {
  const currentSignIn = await getCurrentWorkerSignIn(req);
  if (!currentSignIn) {
    const error = new Error("No open sign-in was found on this phone for today.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .update({
        signed_out_at: now.toISOString(),
        sign_out_date_vancouver: getVancouverDate(now),
      })
      .eq("id", currentSignIn.id)
      .is("signed_out_at", null)
      .select(WORKER_SIGNIN_SELECT)
      .single(),
    "Worker sign-out could not be saved.",
  );
}

export async function signOutWorkerSignInsByIds(ids, { signOutTokens, skipAuthorization = false } = {}) {
  const signInIds = cleanWorkerSignInIds(ids);
  if (!signInIds.length) {
    const error = new Error("At least one sign-in is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!skipAuthorization) assertWorkerSignOutAuthorized(signInIds, signOutTokens);

  const now = new Date();
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .update({
        signed_out_at: now.toISOString(),
        sign_out_date_vancouver: getVancouverDate(now),
      })
      .in("id", signInIds)
      .eq("sign_in_date_vancouver", getVancouverDate(now))
      .is("signed_out_at", null)
      .select(WORKER_SIGNIN_SELECT),
    "Worker sign-outs could not be saved.",
  );

  if (!rows.length) {
    const error = new Error(
      skipAuthorization
        ? "No open sign-ins were found for today."
        : "Sign-out token is no longer usable.",
    );
    error.statusCode = skipAuthorization ? 404 : 403;
    error.exposeMessage = true;
    throw error;
  }

  return orderSignInsByIds(rows, signInIds);
}

export function createWorkerSignOutToken(ids, now = new Date()) {
  const signInIds = cleanWorkerSignInIds(ids);
  if (!signInIds.length) {
    const error = new Error("At least one sign-in is required.");
    error.statusCode = 400;
    throw error;
  }
  const payload = base64url(
    JSON.stringify({
      signInIds,
      date: getVancouverDate(now),
      exp: Math.floor(now.getTime() / 1000) + WORKER_SIGNOUT_TOKEN_TTL_SECONDS,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
}

export async function listSignIns({ date, sort = "signed_in_at", dir = "asc" }) {
  const sortField = SORT_FIELDS.includes(sort) ? sort : "signed_in_at";
  const ascending = dir !== "desc";

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select(WORKER_SIGNIN_SELECT)
      .eq("sign_in_date_vancouver", date)
      .order(sortField, { ascending }),
    "Sign-ins could not be loaded.",
  );
}

export function groupSignIns(rows, group) {
  if (!GROUP_FIELDS.includes(group) || group === "none") return [];
  const groups = new Map();
  rows.forEach((row) => {
    const key = row[group] || "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.entries()]
    .map(([label, items]) => ({ label, count: items.length, items }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function cleanWorkerSignInIds(value) {
  const rawIds = Array.isArray(value) ? value : String(value || "").split(",");
  const ids = rawIds.map((id) => String(id || "").trim()).filter(Boolean);
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length > WORKER_SIGNIN_ID_LIMIT) {
    const error = new Error(`No more than ${WORKER_SIGNIN_ID_LIMIT} sign-ins can be signed out at once.`);
    error.statusCode = 400;
    throw error;
  }

  const invalid = uniqueIds.find((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (invalid) {
    const error = new Error("Sign-in id is not valid.");
    error.statusCode = 400;
    throw error;
  }

  return uniqueIds;
}

function orderSignInsByIds(rows, ids) {
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function assertWorkerSignOutAuthorized(signInIds, signOutTokens) {
  const tokenList = cleanWorkerSignOutTokens(signOutTokens);
  if (!tokenList.length) {
    const error = new Error("Sign-out token is required.");
    error.statusCode = 401;
    error.exposeMessage = true;
    throw error;
  }

  const today = getVancouverDate();
  const authorizedIds = new Set();
  let validTokenCount = 0;
  tokenList.forEach((token) => {
    const payload = verifyWorkerSignOutToken(token);
    if (!payload || payload.date !== today) return;
    validTokenCount += 1;
    payload.signInIds.forEach((id) => authorizedIds.add(id));
  });

  if (!validTokenCount) {
    const error = new Error("Sign-out token is not valid.");
    error.statusCode = 401;
    error.exposeMessage = true;
    throw error;
  }

  if (signInIds.every((id) => authorizedIds.has(id))) return;
  const error = new Error("Sign-out token does not match the requested sign-ins.");
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

function cleanWorkerSignOutTokens(value) {
  const rawTokens = Array.isArray(value) ? value : String(value || "").split(",");
  const tokens = rawTokens.map((token) => String(token || "").trim()).filter(Boolean);
  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length > WORKER_SIGNOUT_TOKEN_LIMIT) {
    const error = new Error(`No more than ${WORKER_SIGNOUT_TOKEN_LIMIT} sign-out tokens can be used at once.`);
    error.statusCode = 400;
    throw error;
  }
  return uniqueTokens;
}

function verifyWorkerSignOutToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, signatureBytes)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    const signInIds = cleanWorkerSignInIds(parsed.signInIds || parsed.signInId);
    if (!signInIds.length) return null;
    return {
      signInIds,
      date: String(parsed.date || "").trim(),
    };
  } catch {
    return null;
  }
}

function getWorkerCookieSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    const error = new Error("Missing SESSION_SECRET.");
    error.statusCode = 503;
    throw error;
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload) {
  return crypto
    .createHmac("sha256", getWorkerCookieSecret())
    .update(payload)
    .digest("base64url");
}

function createWorkerToken(signInId) {
  const payload = base64url(
    JSON.stringify({
      signInId,
      exp: Math.floor(Date.now() / 1000) + WORKER_COOKIE_TTL_SECONDS,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
}

function verifyWorkerToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);
  if (
    expectedBytes.length !== signatureBytes.length ||
    !crypto.timingSafeEqual(expectedBytes, signatureBytes)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.signInId || null;
  } catch {
    return null;
  }
}
