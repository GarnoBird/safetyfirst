import crypto from "node:crypto";
import {
  getSupabaseServiceClient,
  throwIfSupabaseError,
} from "./supabase.js";

const ASSET_SELECT =
  "id, asset_key, name, asset_type, serial_number, current_site, status, hours, last_used_at, notes, source, source_id, source_metadata, imported_by_staff_id, updated_by_staff_id, archived_at, created_at, updated_at";
const MAX_TEXT = 600;
const MAX_ASSET_ROWS = 2000;
const HEADER_ALIASES = {
  name: ["name", "asset", "asset name", "title", "equipment", "description"],
  asset_type: ["type", "asset type", "category", "equipment type", "class"],
  serial_number: ["vin", "serial", "serial #", "serial number", "serial no", "serial no.", "asset number", "asset #", "unit number", "unit #"],
  current_site: ["current site", "site", "location", "project", "current location"],
  status: ["status", "state"],
  hours: ["hours", "hour", "hour meter", "meter", "odometer"],
  last_used_at: ["last used", "last used at", "last_used", "last_used_at", "last seen"],
  notes: ["notes", "note", "comments", "comment", "remarks"],
  source_id: ["id", "asset id", "source id", "salus id", "uuid"],
};

export async function listAssets({ q = "", type = "", site = "", status = "", includeArchived = false, limit = 100 } = {}) {
  let query = getSupabaseServiceClient()
    .from("assets")
    .select(ASSET_SELECT)
    .order("name", { ascending: true })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 500));

  if (!includeArchived) query = query.is("archived_at", null);
  if (type) query = query.ilike("asset_type", `%${escapeIlike(type)}%`);
  if (site) query = query.ilike("current_site", `%${escapeIlike(site)}%`);
  if (status) query = query.eq("status", normalizeStatus(status));
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    query = query.or([
      `name.ilike.${pattern}`,
      `asset_type.ilike.${pattern}`,
      `serial_number.ilike.${pattern}`,
      `current_site.ilike.${pattern}`,
      `status.ilike.${pattern}`,
    ].join(","));
  }

  return throwIfSupabaseError(await query, "Assets could not be loaded.").map(publicAsset);
}

export async function importAssets(body, staff) {
  const rows = parseAssetRows(body);
  if (!rows.length) {
    const error = new Error("Upload a CSV or JSON file with at least one asset row.");
    error.statusCode = 400;
    throw error;
  }

  const cleanedRows = rows
    .slice(0, MAX_ASSET_ROWS)
    .map((row) => cleanImportedAsset(row, staff))
    .filter(Boolean);
  const cleaned = Array.from(
    cleanedRows.reduce((byKey, asset) => byKey.set(asset.asset_key, asset), new Map()).values(),
  );
  if (!cleaned.length) {
    const error = new Error("No usable assets were found. Each row needs at least a name, serial/VIN, or asset id.");
    error.statusCode = 400;
    throw error;
  }

  const keys = cleaned.map((asset) => asset.asset_key);
  const existing = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("assets")
      .select("asset_key")
      .in("asset_key", keys),
    "Existing assets could not be checked.",
  );
  const existingKeys = new Set(existing.map((asset) => asset.asset_key));
  const result = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("assets")
      .upsert(cleaned, { onConflict: "asset_key" })
      .select(ASSET_SELECT),
    "Assets could not be imported.",
  );

  return {
    rows: result.map(publicAsset),
    inserted: cleaned.filter((asset) => !existingKeys.has(asset.asset_key)).length,
    updated: cleaned.filter((asset) => existingKeys.has(asset.asset_key)).length,
    skipped: Math.max(0, rows.length - cleaned.length),
  };
}

export async function updateAsset(assetId, body, staff) {
  const id = cleanString(assetId, 80);
  if (!id) throwBadRequest("Asset id is required.");
  const patch = {};
  if (body?.name !== undefined) patch.name = cleanString(body.name, MAX_TEXT);
  if (body?.assetType !== undefined || body?.asset_type !== undefined || body?.type !== undefined) {
    patch.asset_type = cleanString(body.assetType ?? body.asset_type ?? body.type, MAX_TEXT);
  }
  if (body?.serialNumber !== undefined || body?.serial_number !== undefined || body?.vin !== undefined) {
    patch.serial_number = cleanString(body.serialNumber ?? body.serial_number ?? body.vin, MAX_TEXT);
  }
  if (body?.currentSite !== undefined || body?.current_site !== undefined || body?.site !== undefined) {
    patch.current_site = cleanString(body.currentSite ?? body.current_site ?? body.site, MAX_TEXT);
  }
  if (body?.status !== undefined) patch.status = normalizeStatus(body.status);
  if (body?.notes !== undefined) patch.notes = cleanString(body.notes, 4000);
  if (body?.hours !== undefined) patch.hours = cleanNumberOrNull(body.hours);
  if (body?.lastUsedAt !== undefined || body?.last_used_at !== undefined) {
    patch.last_used_at = cleanDateTimeOrNull(body.lastUsedAt ?? body.last_used_at);
  }
  if (!Object.keys(patch).length) throwBadRequest("No asset updates were provided.");
  patch.updated_by_staff_id = staff?.id || null;
  patch.updated_at = new Date().toISOString();

  const updated = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("assets")
      .update(patch)
      .eq("id", id)
      .select(ASSET_SELECT)
      .single(),
    "Asset could not be updated.",
  );
  return publicAsset(updated);
}

export async function archiveAsset(assetId, staff) {
  const id = cleanString(assetId, 80);
  if (!id) throwBadRequest("Asset id is required.");
  const updated = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("assets")
      .update({
        archived_at: new Date().toISOString(),
        updated_by_staff_id: staff?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ASSET_SELECT)
      .single(),
    "Asset could not be archived.",
  );
  return publicAsset(updated);
}

function parseAssetRows(body) {
  if (Array.isArray(body?.assets)) return body.assets;
  if (Array.isArray(body?.rows)) return body.rows;
  if (Array.isArray(body)) return body;
  const text = cleanString(body?.text || body?.content || body?.fileText || "", 4_000_000);
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.assets)) return parsed.assets;
      if (Array.isArray(parsed.rows)) return parsed.rows;
    } catch {
      throwBadRequest("Asset JSON could not be parsed.");
    }
  }
  return parseCsv(trimmed);
}

function cleanImportedAsset(row, staff) {
  const normalized = normalizeImportRow(row);
  const name = fieldValue(normalized, "name");
  const assetType = fieldValue(normalized, "asset_type") || "General";
  const serialNumber = fieldValue(normalized, "serial_number");
  const sourceId = fieldValue(normalized, "source_id");
  const fallbackName = name || serialNumber || sourceId;
  if (!fallbackName) return null;
  const currentSite = fieldValue(normalized, "current_site");
  const assetKey = createAssetKey({
    sourceId,
    name: fallbackName,
    assetType,
    serialNumber,
    currentSite,
  });
  const now = new Date().toISOString();
  return {
    asset_key: assetKey,
    name: fallbackName,
    asset_type: assetType,
    serial_number: serialNumber,
    current_site: currentSite,
    status: normalizeStatus(fieldValue(normalized, "status")),
    hours: cleanNumberOrNull(fieldValue(normalized, "hours")),
    last_used_at: cleanDateTimeOrNull(fieldValue(normalized, "last_used_at")),
    notes: fieldValue(normalized, "notes", 4000),
    source: "local_import",
    source_id: sourceId,
    source_metadata: { original: row },
    imported_by_staff_id: staff?.id || null,
    updated_by_staff_id: staff?.id || null,
    archived_at: null,
    updated_at: now,
  };
}

function normalizeImportRow(row) {
  const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
  return Object.entries(source).reduce((cleaned, [rawKey, rawValue]) => {
    const key = normalizeHeader(rawKey);
    cleaned[key] = rawValue;
    return cleaned;
  }, {});
}

function normalizeHeader(value) {
  const key = cleanString(value, 120).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const match = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(key));
  return match ? match[0] : key.replace(/\s+/g, "_");
}

function fieldValue(row, key, max = MAX_TEXT) {
  return cleanString(row?.[key], max);
}

function createAssetKey({ sourceId, name, assetType, serialNumber, currentSite }) {
  const raw = sourceId
    ? `source:${sourceId}`
    : [assetType, name, serialNumber, currentSite].map(normalizeIdentityPart).join("|");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function normalizeIdentityPart(value) {
  return cleanString(value, MAX_TEXT).toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeStatus(value) {
  const status = cleanString(value, MAX_TEXT).toLowerCase().replace(/\s+/g, "_");
  if (!status) return "active";
  if (["available", "in_service", "in-use", "in_use", "used"].includes(status)) return "active";
  if (["retired", "out_of_service", "out-of-service", "removed"].includes(status)) return "retired";
  if (["inactive", "unavailable", "not_available"].includes(status)) return "inactive";
  return status.slice(0, 80);
}

function cleanNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function cleanDateTimeOrNull(value) {
  const text = cleanString(value, MAX_TEXT);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function publicAsset(asset) {
  return {
    id: asset.id,
    name: asset.name || "",
    assetType: asset.asset_type || "",
    serialNumber: asset.serial_number || "",
    currentSite: asset.current_site || "",
    status: asset.status || "active",
    hours: asset.hours ?? null,
    lastUsedAt: asset.last_used_at || null,
    notes: asset.notes || "",
    source: asset.source || "",
    sourceId: asset.source_id || "",
    archivedAt: asset.archived_at || null,
    createdAt: asset.created_at || null,
    updatedAt: asset.updated_at || null,
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => cleanString(value, MAX_TEXT))) rows.push(row);
  const [headers = [], ...records] = rows;
  return records.map((record) =>
    headers.reduce((item, header, index) => {
      item[cleanString(header, MAX_TEXT)] = record[index] ?? "";
      return item;
    }, {}),
  );
}

function escapeIlike(value) {
  return cleanString(value, MAX_TEXT).replace(/[\\%_]/g, (char) => `\\${char}`).replace(/,/g, " ");
}

function cleanString(value, max = MAX_TEXT) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}
