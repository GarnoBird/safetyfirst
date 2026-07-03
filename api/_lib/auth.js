import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv, parseCookies, serializeCookie } from "./http.js";
import {
  getSupabaseAuthClient,
  getSupabaseServiceClient,
  throwIfSupabaseError,
} from "./supabase.js";

const COOKIE_NAME = "sf_staff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const STAFF_SELECT =
  "id, auth_user_id, username, email, display_name, role, active, last_login_at";

function getSessionSecret() {
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
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionToken(profile) {
  const payload = base64url(
    JSON.stringify({
      staffId: profile.id,
      authUserId: profile.auth_user_id,
      username: profile.username,
      email: profile.email,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  );
  return `${payload}.${signPayload(payload)}`;
}

function verifySessionToken(token) {
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
    return parsed;
  } catch {
    return null;
  }
}

export function setStaffSessionCookie(res, profile) {
  res.setHeader(
    "set-cookie",
    serializeCookie(COOKIE_NAME, createSessionToken(profile), {
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    }),
  );
}

export function clearStaffSessionCookie(res) {
  res.setHeader(
    "set-cookie",
    serializeCookie(COOKIE_NAME, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    }),
  );
}

export async function loginStaff(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername || !password) {
    const error = new Error("Username and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const supabase = getSupabaseServiceClient();
  const profile = throwIfSupabaseError(
    await supabase
      .from("staff_profiles")
      .select(STAFF_SELECT)
      .eq("username", normalizedUsername)
      .eq("active", true)
      .maybeSingle(),
    "Staff user was not found.",
  );
  if (!profile) {
    const error = new Error("Invalid username or password.");
    error.statusCode = 401;
    throw error;
  }

  const authResult = await getSupabaseAuthClient().auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (authResult.error || authResult.data?.user?.id !== profile.auth_user_id) {
    const error = new Error("Invalid username or password.");
    error.statusCode = 401;
    throw error;
  }

  const updated = throwIfSupabaseError(
    await supabase
      .from("staff_profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", profile.id)
      .select(STAFF_SELECT)
      .single(),
    "Staff login could not be finalized.",
  );

  return updated;
}

export async function verifyStaffPassword(staff, password) {
  if (!staff?.email || !staff?.auth_user_id) {
    const error = new Error("Staff login required.");
    error.statusCode = 401;
    throw error;
  }
  if (!password) {
    const error = new Error("Password is required.");
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }

  const authClient = createClient(
    getRequiredEnv("SUPABASE_URL"),
    process.env.SUPABASE_ANON_KEY || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
  const authResult = await authClient.auth.signInWithPassword({
    email: staff.email,
    password,
  });
  await authClient.auth.signOut().catch(() => {});

  if (authResult.error || authResult.data?.user?.id !== staff.auth_user_id) {
    const error = new Error("Invalid password.");
    error.statusCode = 401;
    error.exposeMessage = true;
    throw error;
  }

  return true;
}

export async function getStaffFromRequest(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  const session = verifySessionToken(token);
  if (!session?.staffId) return null;

  const profile = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_profiles")
      .select(STAFF_SELECT)
      .eq("id", session.staffId)
      .eq("active", true)
      .maybeSingle(),
    "Staff session could not be verified.",
  );

  return profile || null;
}

export async function requireStaff(req) {
  const staff = await getStaffFromRequest(req);
  if (!staff) {
    const error = new Error("Staff login required.");
    error.statusCode = 401;
    throw error;
  }
  return staff;
}

export function requireStaffRole(staff, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (allowed.includes(staff?.role)) return staff;
  const error = new Error("You do not have permission to perform this staff action.");
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

export function publicStaff(staff) {
  if (!staff) return null;
  return {
    id: staff.id,
    username: staff.username,
    email: staff.email,
    display_name: staff.display_name || staff.username,
    role: staff.role,
  };
}
