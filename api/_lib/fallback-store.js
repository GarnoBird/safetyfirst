import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const RECORD_PREFIX = "__sf_form_platform__";

export async function listFallbackRecords(kind) {
  assertFallbackStoreAllowed();
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .select("company_name, trade_category, active, updated_at")
      .like("company_name", `${recordKeyPrefix(kind)}%`),
    "Fallback records could not be loaded.",
  );
  return rows.map(parseRecord).filter((record) => record?.kind === kind);
}

export async function getFallbackRecord(kind, id) {
  assertFallbackStoreAllowed();
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .select("company_name, trade_category, active, updated_at")
      .eq("company_name", recordKey(kind, id))
      .maybeSingle(),
    "Fallback record could not be loaded.",
  );
  const record = parseRecord(row);
  return record?.kind === kind ? record : null;
}

export async function upsertFallbackRecord(kind, id, record, staffId = null) {
  assertFallbackStoreAllowed();
  const payload = {
    ...record,
    kind,
    id,
    updated_at: record.updated_at || new Date().toISOString(),
  };
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .upsert(
        {
          company_name: recordKey(kind, id),
          trade_category: JSON.stringify(payload),
          active: payload.active !== false,
          updated_at: payload.updated_at,
          updated_by_staff_id: staffId || null,
        },
        { onConflict: "company_name" },
      )
      .select("company_name, trade_category, active, updated_at")
      .single(),
    "Fallback record could not be saved.",
  );
  return parseRecord(row);
}

export async function deleteFallbackRecord(kind, id) {
  assertFallbackStoreAllowed();
  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .delete()
      .eq("company_name", recordKey(kind, id)),
    "Fallback record could not be deleted.",
  );
}

export function assertFallbackStoreAllowed() {
  if (process.env.NODE_ENV !== "production" && process.env.DISABLE_FALLBACK_STORE !== "true") {
    return;
  }
  const error = new Error("Fallback data store is disabled. Run the latest Supabase migrations before using this feature.");
  error.statusCode = 503;
  error.exposeMessage = true;
  throw error;
}

function recordKey(kind, id) {
  return `${recordKeyPrefix(kind)}${id}`;
}

function recordKeyPrefix(kind) {
  return `${RECORD_PREFIX}:${kind}:`;
}

function parseRecord(row) {
  if (!row?.trade_category) return null;
  try {
    const record = JSON.parse(row.trade_category);
    return record && typeof record === "object" ? record : null;
  } catch {
    return null;
  }
}
