import { getVancouverDate } from "./date.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

export const SIGNIN_FIELDS = ["name", "phone", "trade", "company"];
export const SORT_FIELDS = ["name", "phone", "trade", "company", "signed_in_at"];
export const GROUP_FIELDS = ["none", "trade", "company"];

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
      .select("id, signed_in_at, sign_in_date_vancouver")
      .single(),
    "Worker sign-in could not be saved.",
  );
}

export async function listSignIns({ date, sort = "signed_in_at", dir = "asc" }) {
  const sortField = SORT_FIELDS.includes(sort) ? sort : "signed_in_at";
  const ascending = dir !== "desc";

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select("id, name, phone, trade, company, signed_in_at, sign_in_date_vancouver")
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
