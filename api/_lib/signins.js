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
const WORKER_SIGNIN_ID_LIMIT = 100;
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
  const row = {
    ...cleaned,
    signed_in_at: now.toISOString(),
    sign_in_date_vancouver: getVancouverDate(now),
  };

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .insert(row)
      .select(WORKER_SIGNIN_SELECT)
      .single(),
    "Worker sign-in could not be saved.",
  );
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

export async function getCurrentWorkerSignInsByIds(ids) {
  const signInIds = cleanWorkerSignInIds(ids);
  if (!signInIds.length) return [];

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

export async function signOutWorkerSignInsByIds(ids) {
  const signInIds = cleanWorkerSignInIds(ids);
  if (!signInIds.length) {
    const error = new Error("At least one sign-in is required.");
    error.statusCode = 400;
    throw error;
  }

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
    const error = new Error("No open sign-ins were found for today.");
    error.statusCode = 404;
    throw error;
  }

  return orderSignInsByIds(rows, signInIds);
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

function getWorkerCookieSecret() {
  const secret = process.env.SESSION_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    const error = new Error("Missing SESSION_SECRET or CRON_SECRET.");
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
