import { parseQuery } from "./http.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

const AUDIT_SELECT =
  "id, actor_staff_id, actor_username, actor_role, action, target_type, target_id, summary, metadata, ip_address, user_agent, created_at";
const MAX_AUDIT_LIMIT = 500;

export function requestMeta(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "");
  const ipAddress =
    forwardedFor.split(",").map((part) => part.trim()).filter(Boolean)[0] ||
    String(req?.headers?.["x-real-ip"] || req?.socket?.remoteAddress || "").trim();
  return {
    ipAddress,
    userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 500),
  };
}

export async function recordAuditEvent({
  req,
  staff = null,
  action,
  targetType = "",
  targetId = "",
  summary = "",
  metadata = {},
}) {
  if (!action) return null;
  const meta = requestMeta(req);
  try {
    return throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("audit_events")
        .insert({
          actor_staff_id: staff?.id || null,
          actor_username: staff?.username || null,
          actor_role: staff?.role || null,
          action: String(action).slice(0, 120),
          target_type: String(targetType || "").slice(0, 120),
          target_id: String(targetId || "").slice(0, 200),
          summary: String(summary || "").slice(0, 1000),
          metadata: metadata && typeof metadata === "object" ? metadata : {},
          ip_address: meta.ipAddress || null,
          user_agent: meta.userAgent || null,
        })
        .select(AUDIT_SELECT)
        .single(),
      "Audit event could not be recorded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) {
      console.warn("Audit log failed", error.message);
    }
    return null;
  }
}

export async function listAuditEvents(req) {
  const query = parseQuery(req);
  const action = String(query.get("action") || "").trim();
  const actor = String(query.get("actor") || "").trim().toLowerCase();
  const targetType = String(query.get("targetType") || query.get("target_type") || "").trim();
  const targetId = String(query.get("targetId") || query.get("target_id") || "").trim();
  const search = String(query.get("search") || "").trim();
  const from = cleanDate(query.get("from"));
  const to = cleanDate(query.get("to"));
  const limit = Math.min(
    MAX_AUDIT_LIMIT,
    Math.max(1, Number(query.get("limit") || 200) || 200),
  );

  let dbQuery = getSupabaseServiceClient()
    .from("audit_events")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (action) dbQuery = dbQuery.eq("action", action);
  if (targetType) dbQuery = dbQuery.eq("target_type", targetType);
  if (targetId) dbQuery = dbQuery.eq("target_id", targetId);
  if (from) dbQuery = dbQuery.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) dbQuery = dbQuery.lte("created_at", `${to}T23:59:59.999Z`);

  let rows = throwIfSupabaseError(await dbQuery, "Audit events could not be loaded.");

  if (actor) {
    rows = rows.filter((row) =>
      [row.actor_username, row.actor_role, row.actor_staff_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(actor)),
    );
  }

  if (search) {
    const normalized = search.toLowerCase();
    rows = rows.filter((row) =>
      [
        row.action,
        row.summary,
        row.target_type,
        row.target_id,
        row.actor_username,
        row.ip_address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }

  return { rows, limit };
}

function cleanDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}
