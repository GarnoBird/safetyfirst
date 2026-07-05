import crypto from "node:crypto";
import { assertDateString } from "./date.js";
import {
  getSupabaseServiceClient,
  throwIfSupabaseError,
} from "./supabase.js";

const CERTIFICATE_BUCKET = "safety-form-submissions";
const MAX_TEXT = 600;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const GENERIC_UPLOAD_MIME_TYPES = ["", "application/octet-stream"];
const ALLOWED_CERTIFICATE_FILE_EXTENSIONS = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".heif": ["image/heic", "image/heif"],
  ".pdf": ["application/pdf"],
};

const CERTIFICATE_TYPE_SELECT =
  "id, slug, name, required, source, source_metadata, archived_at, created_by_staff_id, updated_by_staff_id, created_at, updated_at";
const CERTIFICATE_PROVIDER_SELECT =
  "id, slug, name, source, source_metadata, archived_at, created_by_staff_id, updated_by_staff_id, created_at, updated_at";
const CERTIFICATE_FILE_SELECT =
  "id, certificate_id, bucket, storage_path, original_filename, mime_type, size_bytes, uploaded_by_staff_id, app_deleted_at, source, source_external_id, source_metadata, imported_at, created_at";
const CERTIFICATE_SELECT =
  "id, worker_name, certificate_type_id, certificate_type_name, certificate_provider_id, certificate_provider_name, issue_date, expiry_date, status, archived_at, source, source_external_id, source_metadata, imported_at, created_by_staff_id, updated_by_staff_id, created_at, updated_at";
const CERTIFICATE_WITH_FILES_SELECT = `${CERTIFICATE_SELECT}, certificate_files(${CERTIFICATE_FILE_SELECT})`;

export async function listCertificates(query) {
  const filters = cleanCertificateFilters(query);
  let dbQuery = getSupabaseServiceClient()
    .from("certificates")
    .select(CERTIFICATE_WITH_FILES_SELECT);

  if (!filters.includeArchived) dbQuery = dbQuery.is("archived_at", null);
  if (filters.search) {
    const value = `%${escapeLike(filters.search)}%`;
    dbQuery = dbQuery.or(
      [
        `worker_name.ilike.${value}`,
        `certificate_type_name.ilike.${value}`,
        `certificate_provider_name.ilike.${value}`,
      ].join(","),
    );
  }

  const rows = throwIfSupabaseError(
    await dbQuery.order("expiry_date", { ascending: true, nullsFirst: false }).limit(500),
    "Certificates could not be loaded.",
  );

  return { rows: rows.map(publicCertificate) };
}

export async function getCertificate(certificateId, { includeArchived = false } = {}) {
  let query = getSupabaseServiceClient()
    .from("certificates")
    .select(CERTIFICATE_WITH_FILES_SELECT)
    .eq("id", cleanUuid(certificateId, "Certificate id is not valid."));
  if (!includeArchived) query = query.is("archived_at", null);

  const row = throwIfSupabaseError(
    await query.maybeSingle(),
    "Certificate could not be loaded.",
  );
  if (!row) throwNotFound("Certificate was not found.");
  return publicCertificate(row);
}

export async function createCertificate(body, staff) {
  const input = await cleanCertificateInput(body, staff, {});
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificates")
      .insert({
        ...input,
        status: "approved",
        created_by_staff_id: staff?.id || null,
        updated_by_staff_id: staff?.id || null,
      })
      .select(CERTIFICATE_WITH_FILES_SELECT)
      .single(),
    "Certificate could not be created.",
  );
  return publicCertificate(row);
}

export async function updateCertificate(certificateId, body, staff) {
  const current = await getCertificate(certificateId, { includeArchived: true });
  const patch = await cleanCertificateInput(body, staff, current, { partial: true });
  if (!Object.keys(patch).length) return current;
  patch.updated_by_staff_id = staff?.id || null;
  patch.updated_at = new Date().toISOString();

  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificates")
      .update(patch)
      .eq("id", current.id)
      .select(CERTIFICATE_WITH_FILES_SELECT)
      .single(),
    "Certificate could not be updated.",
  );
  return publicCertificate(row);
}

export async function archiveCertificate(certificateId, staff) {
  const current = await getCertificate(certificateId, { includeArchived: true });
  const archivedAt = new Date().toISOString();
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificates")
      .update({
        status: "archived",
        archived_at: current.archivedAt || archivedAt,
        updated_by_staff_id: staff?.id || null,
        updated_at: archivedAt,
      })
      .eq("id", current.id)
      .select(CERTIFICATE_WITH_FILES_SELECT)
      .single(),
    "Certificate could not be archived.",
  );
  return publicCertificate(row);
}

export async function createCertificateFileUploadTarget(certificateId, body, staff) {
  const certificate = await getCertificate(certificateId, { includeArchived: true });
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = `certificates/${certificate.id}/${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}-${sanitizeStorageFilename(file.originalFilename)}`;

  const result = await getSupabaseServiceClient()
    .storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (result.error) {
    const error = new Error("Certificate file upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  return {
    bucket: CERTIFICATE_BUCKET,
    storagePath,
    signedUrl: result.data.signedUrl,
    token: result.data.token,
    path: result.data.path,
    file,
    uploadedBy: staff?.id || null,
  };
}

export async function attachCertificateFile(certificateId, body, staff) {
  const certificate = await getCertificate(certificateId, { includeArchived: true });
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = cleanString(body?.storagePath || body?.storage_path, 1000);
  if (!storagePath.startsWith(`certificates/${certificate.id}/`)) {
    throwBadRequest("Uploaded file path is not valid for this certificate.");
  }

  const inserted = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificate_files")
      .insert({
        certificate_id: certificate.id,
        bucket: CERTIFICATE_BUCKET,
        storage_path: storagePath,
        original_filename: file.originalFilename,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        uploaded_by_staff_id: staff?.id || null,
      })
      .select(CERTIFICATE_FILE_SELECT)
      .single(),
    "Certificate file could not be saved.",
  );

  return {
    certificate: await getCertificate(certificate.id, { includeArchived: true }),
    file: publicCertificateFile(inserted),
  };
}

export async function createCertificateFileAccess(certificateId, fileId) {
  const certificate = await getCertificate(certificateId, { includeArchived: true });
  const cleanFileId = cleanUuid(fileId, "File id is not valid.");
  const file = (certificate.files || []).find((candidate) => candidate.id === cleanFileId);
  if (!file) throwNotFound("Certificate file was not found.");
  if (file.app_deleted_at || file.appDeletedAt || !file.storage_path && !file.storagePath) {
    const error = new Error("The app copy of this certificate file is no longer available.");
    error.statusCode = 410;
    error.exposeMessage = true;
    throw error;
  }

  const storagePath = file.storage_path || file.storagePath;
  const bucket = file.bucket || CERTIFICATE_BUCKET;
  const storage = getSupabaseServiceClient().storage.from(bucket);
  const preview = await storage.createSignedUrl(storagePath, 10 * 60);
  if (preview.error) {
    const error = new Error("Certificate file preview URL could not be created.");
    error.cause = preview.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  let downloadUrl = preview.data.signedUrl;
  try {
    const download = await storage.createSignedUrl(storagePath, 10 * 60, {
      download: file.original_filename || file.originalFilename || true,
    });
    if (!download.error) downloadUrl = download.data.signedUrl;
  } catch {
    downloadUrl = preview.data.signedUrl;
  }

  return {
    file: {
      id: file.id,
      original_filename: file.original_filename || file.originalFilename,
      mime_type: file.mime_type || file.mimeType,
      size_bytes: file.size_bytes ?? file.sizeBytes ?? 0,
    },
    url: preview.data.signedUrl,
    downloadUrl,
    expiresInSeconds: 10 * 60,
  };
}

export async function listCertificateTypes(query) {
  return listCertificateOptions({
    query,
    select: CERTIFICATE_TYPE_SELECT,
    table: "certificate_types",
    mapper: publicCertificateType,
  });
}

export async function listCertificateProviders(query) {
  return listCertificateOptions({
    query,
    select: CERTIFICATE_PROVIDER_SELECT,
    table: "certificate_providers",
    mapper: publicCertificateProvider,
  });
}

export async function createCertificateType(body, staff) {
  const option = await createCertificateOption({
    body,
    select: CERTIFICATE_TYPE_SELECT,
    staff,
    table: "certificate_types",
    mapper: publicCertificateType,
    extra: { required: Boolean(body?.required) },
  });
  return option;
}

export async function createCertificateProvider(body, staff) {
  return createCertificateOption({
    body,
    select: CERTIFICATE_PROVIDER_SELECT,
    staff,
    table: "certificate_providers",
    mapper: publicCertificateProvider,
  });
}

export async function updateCertificateType(id, body, staff) {
  return updateCertificateOption({
    body,
    id,
    select: CERTIFICATE_TYPE_SELECT,
    staff,
    table: "certificate_types",
    mapper: publicCertificateType,
    extra: body?.required === undefined ? {} : { required: Boolean(body.required) },
  });
}

export async function updateCertificateProvider(id, body, staff) {
  return updateCertificateOption({
    body,
    id,
    select: CERTIFICATE_PROVIDER_SELECT,
    staff,
    table: "certificate_providers",
    mapper: publicCertificateProvider,
  });
}

export async function archiveCertificateType(id, staff) {
  return archiveCertificateOption({
    id,
    select: CERTIFICATE_TYPE_SELECT,
    staff,
    table: "certificate_types",
    mapper: publicCertificateType,
  });
}

export async function archiveCertificateProvider(id, staff) {
  return archiveCertificateOption({
    id,
    select: CERTIFICATE_PROVIDER_SELECT,
    staff,
    table: "certificate_providers",
    mapper: publicCertificateProvider,
  });
}

async function listCertificateOptions({ query, table, select, mapper }) {
  const includeArchived = query.get("includeArchived") === "true";
  const search = cleanString(query.get("search") || query.get("q"), MAX_TEXT);
  let dbQuery = getSupabaseServiceClient().from(table).select(select);
  if (!includeArchived) dbQuery = dbQuery.is("archived_at", null);
  if (search) dbQuery = dbQuery.ilike("name", `%${escapeLike(search)}%`);
  const rows = throwIfSupabaseError(
    await dbQuery.order("name", { ascending: true }).limit(500),
    "Certificate options could not be loaded.",
  );
  return rows.map(mapper);
}

async function createCertificateOption({ body, table, select, mapper, staff, extra = {} }) {
  const name = requireText(body?.name, "Name");
  const slug = slugifyOptionName(name);
  await assertOptionSlugAvailable(table, slug);
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from(table)
      .insert({
        slug,
        name,
        source: "safety_first",
        source_metadata: {},
        created_by_staff_id: staff?.id || null,
        updated_by_staff_id: staff?.id || null,
        ...extra,
      })
      .select(select)
      .single(),
    "Certificate option could not be created.",
  );
  return mapper(row);
}

async function updateCertificateOption({ id, body, table, select, mapper, staff, extra = {} }) {
  const current = await getCertificateOption(table, select, id, mapper);
  const patch = { ...extra };
  if (body?.name !== undefined) {
    const name = requireText(body.name, "Name");
    const slug = slugifyOptionName(name);
    await assertOptionSlugAvailable(table, slug, current.id);
    patch.name = name;
    patch.slug = slug;
  }
  if (!Object.keys(patch).length) return current;
  patch.updated_by_staff_id = staff?.id || null;
  patch.updated_at = new Date().toISOString();
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from(table)
      .update(patch)
      .eq("id", current.id)
      .select(select)
      .single(),
    "Certificate option could not be updated.",
  );
  return mapper(row);
}

async function archiveCertificateOption({ id, table, select, mapper, staff }) {
  const current = await getCertificateOption(table, select, id, mapper);
  const now = new Date().toISOString();
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from(table)
      .update({
        archived_at: current.archivedAt || now,
        updated_by_staff_id: staff?.id || null,
        updated_at: now,
      })
      .eq("id", current.id)
      .select(select)
      .single(),
    "Certificate option could not be archived.",
  );
  return mapper(row);
}

async function getCertificateOption(table, select, id, mapper) {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from(table)
      .select(select)
      .eq("id", cleanUuid(id, "Certificate option id is not valid."))
      .maybeSingle(),
    "Certificate option could not be loaded.",
  );
  if (!row) throwNotFound("Certificate option was not found.");
  return mapper(row);
}

async function assertOptionSlugAvailable(table, slug, currentId = "") {
  const existing = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from(table)
      .select("id")
      .eq("slug", slug)
      .maybeSingle(),
    "Certificate option could not be checked.",
  );
  if (existing && existing.id !== currentId) {
    throwBadRequest("A certificate option with that name already exists.");
  }
}

async function cleanCertificateInput(body, staff, current, { partial = false } = {}) {
  const patch = {};

  if (!partial || body?.workerName !== undefined || body?.worker_name !== undefined) {
    patch.worker_name = requireText(body?.workerName ?? body?.worker_name, "Worker name");
  }
  if (!partial || body?.certificateTypeId !== undefined || body?.certificate_type_id !== undefined) {
    const typeId = cleanUuid(body?.certificateTypeId ?? body?.certificate_type_id, "Certificate type is required.");
    const currentTypeId = current.certificateTypeId || current.certificate_type_id || "";
    if (partial && typeId === currentTypeId) {
      patch.certificate_type_id = currentTypeId;
      patch.certificate_type_name = current.certificateTypeName || current.certificate_type_name || "";
    } else {
      const type = await getActiveType(typeId);
      patch.certificate_type_id = type.id;
      patch.certificate_type_name = type.name;
    }
  }
  if (!partial || body?.providerId !== undefined || body?.certificateProviderId !== undefined || body?.certificate_provider_id !== undefined) {
    const providerId = cleanUuid(body?.providerId ?? body?.certificateProviderId ?? body?.certificate_provider_id, "Provider is required.");
    const currentProviderId = current.providerId || current.certificateProviderId || current.certificate_provider_id || "";
    if (partial && providerId === currentProviderId) {
      patch.certificate_provider_id = currentProviderId;
      patch.certificate_provider_name = current.providerName || current.certificateProviderName || current.certificate_provider_name || "";
    } else {
      const provider = await getActiveProvider(providerId);
      patch.certificate_provider_id = provider.id;
      patch.certificate_provider_name = provider.name;
    }
  }
  if (!partial || body?.issueDate !== undefined || body?.issue_date !== undefined) {
    patch.issue_date = cleanRequiredDate(body?.issueDate ?? body?.issue_date, "Issue date");
  }
  if (!partial || body?.expiryDate !== undefined || body?.expiry_date !== undefined) {
    patch.expiry_date = cleanRequiredDate(body?.expiryDate ?? body?.expiry_date, "Expiry date");
  }

  if (patch.issue_date && patch.expiry_date && patch.expiry_date < patch.issue_date) {
    throwBadRequest("Expiry date cannot be before issue date.");
  }
  const nextIssueDate = patch.issue_date || current.issueDate || current.issue_date;
  const nextExpiryDate = patch.expiry_date || current.expiryDate || current.expiry_date;
  if (partial && nextIssueDate && nextExpiryDate && nextExpiryDate < nextIssueDate) {
    throwBadRequest("Expiry date cannot be before issue date.");
  }

  return patch;
}

async function getActiveType(id) {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificate_types")
      .select(CERTIFICATE_TYPE_SELECT)
      .eq("id", cleanUuid(id, "Certificate type is required."))
      .is("archived_at", null)
      .maybeSingle(),
    "Certificate type could not be loaded.",
  );
  if (!row) throwBadRequest("Certificate type is not available.");
  return publicCertificateType(row);
}

async function getActiveProvider(id) {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("certificate_providers")
      .select(CERTIFICATE_PROVIDER_SELECT)
      .eq("id", cleanUuid(id, "Provider is required."))
      .is("archived_at", null)
      .maybeSingle(),
    "Certificate provider could not be loaded.",
  );
  if (!row) throwBadRequest("Provider is not available.");
  return publicCertificateProvider(row);
}

function publicCertificate(row) {
  const files = [...(row?.certificate_files || row?.files || [])]
    .filter((file) => !file.app_deleted_at && !file.appDeletedAt)
    .sort((a, b) => String(b.created_at || b.createdAt || "").localeCompare(String(a.created_at || a.createdAt || "")))
    .map(publicCertificateFile);
  return {
    id: row.id,
    workerName: row.worker_name || "",
    certificateTypeId: row.certificate_type_id || null,
    certificateTypeName: row.certificate_type_name || "",
    providerId: row.certificate_provider_id || null,
    providerName: row.certificate_provider_name || "",
    issueDate: row.issue_date || null,
    expiryDate: row.expiry_date || null,
    status: row.status || "approved",
    archivedAt: row.archived_at || null,
    source: row.source || "safety_first",
    sourceExternalId: row.source_external_id || null,
    sourceMetadata: row.source_metadata || {},
    importedAt: row.imported_at || null,
    createdByStaffId: row.created_by_staff_id || null,
    updatedByStaffId: row.updated_by_staff_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    files,
  };
}

function publicCertificateFile(file) {
  return {
    id: file.id,
    certificateId: file.certificate_id || file.certificateId,
    bucket: file.bucket || CERTIFICATE_BUCKET,
    storagePath: file.storage_path || file.storagePath || "",
    originalFilename: file.original_filename || file.originalFilename || "",
    mimeType: file.mime_type || file.mimeType || "",
    sizeBytes: file.size_bytes ?? file.sizeBytes ?? 0,
    uploadedByStaffId: file.uploaded_by_staff_id || file.uploadedByStaffId || null,
    appDeletedAt: file.app_deleted_at || file.appDeletedAt || null,
    source: file.source || "safety_first",
    sourceExternalId: file.source_external_id || file.sourceExternalId || null,
    sourceMetadata: file.source_metadata || file.sourceMetadata || {},
    importedAt: file.imported_at || file.importedAt || null,
    createdAt: file.created_at || file.createdAt || null,
    original_filename: file.original_filename || file.originalFilename || "",
    mime_type: file.mime_type || file.mimeType || "",
    size_bytes: file.size_bytes ?? file.sizeBytes ?? 0,
  };
}

function publicCertificateType(row) {
  return {
    id: row.id,
    slug: row.slug || "",
    name: row.name || "",
    required: Boolean(row.required),
    source: row.source || "",
    sourceMetadata: row.source_metadata || {},
    archivedAt: row.archived_at || null,
    createdByStaffId: row.created_by_staff_id || null,
    updatedByStaffId: row.updated_by_staff_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function publicCertificateProvider(row) {
  return {
    id: row.id,
    slug: row.slug || "",
    name: row.name || "",
    source: row.source || "",
    sourceMetadata: row.source_metadata || {},
    archivedAt: row.archived_at || null,
    createdByStaffId: row.created_by_staff_id || null,
    updatedByStaffId: row.updated_by_staff_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function cleanCertificateFilters(query) {
  return {
    includeArchived: query.get("includeArchived") === "true",
    search: cleanString(query.get("search") || query.get("q"), MAX_TEXT),
  };
}

function cleanFileMetadata(file) {
  const originalFilename = cleanString(file?.originalFilename || file?.name, MAX_TEXT);
  const extension = fileExtension(originalFilename);
  const allowedMimeTypes = ALLOWED_CERTIFICATE_FILE_EXTENSIONS[extension] || [];
  const rawMimeType = cleanString(file?.mimeType || file?.type, MAX_TEXT).toLowerCase();
  const mimeType = GENERIC_UPLOAD_MIME_TYPES.includes(rawMimeType)
    ? allowedMimeTypes[0] || "application/octet-stream"
    : rawMimeType;
  const cleaned = {
    originalFilename,
    mimeType,
    sizeBytes: Number(file?.sizeBytes || file?.size || 0),
  };
  if (!cleaned.originalFilename) throwBadRequest("File name is required.");
  if (!Number.isFinite(cleaned.sizeBytes) || cleaned.sizeBytes < 1) throwBadRequest("File size is required.");
  if (cleaned.sizeBytes > MAX_FILE_SIZE_BYTES) throwBadRequest("File must be 50 MiB or smaller.");
  if (!allowedMimeTypes.length) throwBadRequest("Use an image or PDF certificate file.");
  if (!allowedMimeTypes.includes(cleaned.mimeType)) throwBadRequest("File extension and file type do not match.");
  return cleaned;
}

function requireText(value, label) {
  const cleaned = cleanString(value, MAX_TEXT);
  if (!cleaned) throwBadRequest(`${label} is required.`);
  return cleaned;
}

function cleanRequiredDate(value, label) {
  const date = cleanString(value, 40);
  if (!date) throwBadRequest(`${label} is required.`);
  return assertDateString(date);
}

function cleanString(value, max) {
  return String(value || "").trim().slice(0, max);
}

function cleanUuid(value, message) {
  const id = cleanString(value, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throwBadRequest(message);
  }
  return id;
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}

function throwNotFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  error.exposeMessage = true;
  throw error;
}

function slugifyOptionName(value) {
  const slug = cleanString(value, MAX_TEXT)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug || crypto.randomBytes(8).toString("hex");
}

function sanitizeStorageFilename(value) {
  return cleanString(value || "certificate", MAX_TEXT)
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function fileExtension(value) {
  const name = cleanString(value, MAX_TEXT).toLowerCase();
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index);
}

function escapeLike(value) {
  return String(value).replace(/[%_]/g, "\\$&");
}
