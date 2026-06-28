import crypto from "node:crypto";
import { createDraftActionItemsFromSiteInspection } from "./action-items.js";
import { assertDateString, getVancouverDate } from "./date.js";
import {
  deleteFallbackRecord,
  getFallbackRecord,
  listFallbackRecords,
  upsertFallbackRecord,
} from "./fallback-store.js";
import { buildOneDriveFilename, uploadBufferToOneDrive } from "./onedrive.js";
import { isOneDriveBackupEnabled } from "./settings.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

export const SUBMISSION_BUCKET = "safety-form-submissions";
export const FORM_TYPES = [
  "toolbox_talk",
  "site_inspection",
  "daily_hazard_assessment",
];
export const SUBMISSION_MODES = ["submit_file", "fill_form"];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FORM_TEXT_LENGTH = 600;
const MAX_FORM_LONG_TEXT_LENGTH = 4000;
const MAX_TOOLBOX_TOPICS = 80;
const MAX_TOOLBOX_ROWS = 80;
const MAX_SITE_INSPECTION_DEFICIENCIES = 80;
const ALLOWED_SUBMISSION_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const ALLOWED_UPLOAD_EXTENSIONS = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".heif": ["image/heic", "image/heif"],
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".txt": ["text/plain"],
};
const GENERIC_UPLOAD_MIME_TYPES = ["", "application/octet-stream"];
const STAFF_SORT_FIELDS = [
  "submitted_at",
  "company",
  "worker_phone",
  "worker_name",
  "form_type",
  "one_drive_backup_status",
];
const FILE_SELECT =
  "id, submission_id, bucket, storage_path, original_filename, mime_type, size_bytes, one_drive_item_id, one_drive_item_name, one_drive_web_url, one_drive_path, backup_status, backup_attempted_at, backup_error, app_deleted_at, created_at";
const SUBMISSION_SELECT =
  "id, worker_id, worker_name, worker_phone, worker_username, company, form_type, submission_mode, notes, form_data, submitted_at, submitted_date_vancouver, deleted_by_worker_at, deleted_by_staff_at, deleted_by_staff_id, app_purged_at, one_drive_backup_status, one_drive_item_id, one_drive_item_name, one_drive_web_url, one_drive_path, backup_attempted_at, backup_error";
const SUBMISSION_WITH_FILES_SELECT = `${SUBMISSION_SELECT}, submission_files(${FILE_SELECT})`;

export function publicSubmission(row) {
  return {
    ...row,
    files: row.submission_files || row.files || [],
    submission_files: undefined,
  };
}

async function uploadTargetPayload(worker, formType, file, storagePath, data) {
  await recordSubmissionUpload(worker, formType, file, storagePath);
  return {
    bucket: SUBMISSION_BUCKET,
    storagePath,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    formType,
    file,
  };
}

async function recordSubmissionUpload(worker, formType, file, storagePath) {
  try {
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_uploads")
        .insert({
          worker_id: worker.id,
          bucket: SUBMISSION_BUCKET,
          storage_path: storagePath,
          original_filename: file.originalFilename,
          mime_type: file.mimeType,
          size_bytes: file.sizeBytes,
          form_type: formType,
        }),
      "Upload tracking record could not be created.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
  }
}

async function markUploadAttached(storagePath, submissionId) {
  try {
    const result = await getSupabaseServiceClient()
      .from("submission_uploads")
      .update({
        attached_submission_id: submissionId,
        attached_at: new Date().toISOString(),
      })
      .eq("storage_path", storagePath);
    if (result.error && !isSupabaseMissingRelationError(result.error)) {
      throwIfSupabaseError(result, "Upload tracking record could not be updated.");
    }
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
  }
}

export async function createFileUploadTarget(worker, body) {
  const formType = cleanFormType(body?.formType || body?.form_type);
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = `${worker.id}/${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}-${sanitizeStorageFilename(file.originalFilename)}`;

  const result = await getSupabaseServiceClient()
    .storage
    .from(SUBMISSION_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (result.error) {
    if (isStorageBucketMissing(result.error)) {
      await ensureSubmissionBucket();
      const retry = await getSupabaseServiceClient()
        .storage
        .from(SUBMISSION_BUCKET)
        .createSignedUploadUrl(storagePath);
      if (!retry.error) {
        return uploadTargetPayload(worker, formType, file, storagePath, retry.data);
      }
      result.error = retry.error;
    }
    const error = new Error("Upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  return uploadTargetPayload(worker, formType, file, storagePath, result.data);
}

export async function createWorkerSubmission(worker, body) {
  const formType = cleanFormType(body?.formType || body?.form_type);
  const submissionMode = cleanSubmissionMode(body?.submissionMode || body?.submission_mode);
  const formData = cleanSubmissionFormData(
    formType,
    submissionMode,
    body?.formData ?? body?.form_data,
    worker,
  );
  const notes = buildSubmissionNotes(formType, submissionMode, body?.notes, formData);
  const now = new Date();

  let inserted;
  try {
    inserted = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .insert({
          worker_id: worker.id,
          worker_name: worker.name,
          worker_phone: worker.phone,
          worker_username: worker.username,
          company: worker.company,
          form_type: formType,
          submission_mode: submissionMode,
          notes,
          form_data: formData,
          submitted_at: now.toISOString(),
          submitted_date_vancouver: getVancouverDate(now),
          one_drive_backup_status: "pending",
        })
        .select(SUBMISSION_SELECT)
        .single(),
      "Submission could not be saved.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return createFallbackWorkerSubmission(worker, {
      body,
      formType,
      submissionMode,
      notes,
      now,
    });
  }

  if (submissionMode === "submit_file") {
    const file = cleanSubmittedFile(body?.file, worker.id);
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_files")
        .insert({
          submission_id: inserted.id,
          bucket: SUBMISSION_BUCKET,
          storage_path: file.storagePath,
          original_filename: file.originalFilename,
          mime_type: file.mimeType,
          size_bytes: file.sizeBytes,
          backup_status: "pending",
        }),
      "Submission file could not be saved.",
    );
    await markUploadAttached(file.storagePath, inserted.id);
  }

  if (submissionMode === "fill_form" && formType === "site_inspection") {
    await createDraftActionItemsFromSiteInspection(inserted, formData);
  }

  await backupSubmissionBestEffort(inserted.id);
  return getSubmissionById(inserted.id, { includeDeleted: true });
}

export async function listWorkerSubmissions(worker) {
  let rows;
  try {
    rows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .select(SUBMISSION_WITH_FILES_SELECT)
        .eq("worker_id", worker.id)
        .is("deleted_by_worker_at", null)
        .is("deleted_by_staff_at", null)
        .is("app_purged_at", null)
        .order("submitted_at", { ascending: false })
        .limit(200),
      "Submissions could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    rows = await listFallbackWorkerSubmissions(worker);
  }
  return rows.map(publicSubmission);
}

export async function deleteWorkerSubmission(worker, submissionId) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  let row;
  try {
    row = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .select(SUBMISSION_WITH_FILES_SELECT)
        .eq("id", id)
        .eq("worker_id", worker.id)
        .is("deleted_by_worker_at", null)
        .is("deleted_by_staff_at", null)
        .is("app_purged_at", null)
        .maybeSingle(),
      "Submission could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return deleteFallbackWorkerSubmission(worker, id);
  }

  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (row.one_drive_backup_status === "backed_up") {
    await purgeSubmissionAppCopy(row);
    return { deleted: true, purged: true };
  }

  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .update({ deleted_by_worker_at: new Date().toISOString() })
      .eq("id", id),
    "Submission could not be deleted.",
  );
  await backupSubmissionBestEffort(id);
  return { deleted: true, purged: false };
}

export async function deleteStaffSubmission(staff, submissionId) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  let row;
  try {
    row = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .select(SUBMISSION_WITH_FILES_SELECT)
        .eq("id", id)
        .is("deleted_by_staff_at", null)
        .is("app_purged_at", null)
        .maybeSingle(),
      "Submission could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return deleteFallbackStaffSubmission(staff, id);
  }

  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (row.one_drive_backup_status === "backed_up") {
    await purgeSubmissionAppCopy(row);
    return { id, deleted: true, purged: true, submission: publicSubmission(row) };
  }

  const deletedAt = new Date().toISOString();
  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .update({
        deleted_by_staff_at: deletedAt,
        deleted_by_staff_id: staff?.id || null,
      })
      .eq("id", id),
    "Submission could not be deleted.",
  );
  await backupSubmissionBestEffort(id);
  return {
    id,
    deleted: true,
    purged: false,
    submission: publicSubmission({
      ...row,
      deleted_by_staff_at: deletedAt,
      deleted_by_staff_id: staff?.id || null,
    }),
  };
}

export async function deleteStaffSubmissions(staff, submissionIds) {
  const ids = Array.from(
    new Set(
      (Array.isArray(submissionIds) ? submissionIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!ids.length) {
    const error = new Error("Select at least one form submission to delete.");
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }
  if (ids.length > 100) {
    const error = new Error("Delete 100 or fewer form submissions at a time.");
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }

  const results = [];
  for (const id of ids) {
    try {
      results.push(await deleteStaffSubmission(staff, id));
    } catch (error) {
      results.push({
        id,
        deleted: false,
        purged: false,
        error: error.exposeMessage || error.statusCode === 404 ? error.message : "Delete failed.",
      });
    }
  }

  return {
    requested: ids.length,
    deleted: results.filter((result) => result.deleted).length,
    failed: results.filter((result) => !result.deleted).length,
    results,
  };
}

export async function listStaffSubmissions(query) {
  const from = query.get("from") ? assertDateString(query.get("from")) : "";
  const to = query.get("to") ? assertDateString(query.get("to")) : "";
  const company = String(query.get("company") || "").trim();
  const phone = String(query.get("phone") || "").trim();
  const name = String(query.get("name") || "").trim();
  const formType = query.get("formType") || query.get("form_type") || "";
  const backupStatus = query.get("backupStatus") || query.get("backup_status") || "";
  const sort = STAFF_SORT_FIELDS.includes(query.get("sort"))
    ? query.get("sort")
    : "submitted_at";
  const dir = query.get("dir") === "asc" ? "asc" : "desc";

  let dbQuery = getSupabaseServiceClient()
    .from("form_submissions")
    .select(SUBMISSION_WITH_FILES_SELECT)
    .is("deleted_by_worker_at", null)
    .is("deleted_by_staff_at", null)
    .is("app_purged_at", null);

  if (from) dbQuery = dbQuery.gte("submitted_date_vancouver", from);
  if (to) dbQuery = dbQuery.lte("submitted_date_vancouver", to);
  if (company) dbQuery = dbQuery.ilike("company", `%${escapeLike(company)}%`);
  if (phone) dbQuery = dbQuery.ilike("worker_phone", `%${escapeLike(phone)}%`);
  if (name) dbQuery = dbQuery.ilike("worker_name", `%${escapeLike(name)}%`);
  if (FORM_TYPES.includes(formType)) dbQuery = dbQuery.eq("form_type", formType);
  if (["pending", "backed_up", "failed"].includes(backupStatus)) {
    dbQuery = dbQuery.eq("one_drive_backup_status", backupStatus);
  }

  let rows;
  try {
    rows = throwIfSupabaseError(
      await dbQuery.order(sort, { ascending: dir === "asc" }).limit(500),
      "Submissions could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    rows = await listFallbackStaffSubmissions({
      from,
      to,
      company,
      phone,
      name,
      formType,
      backupStatus,
      sort,
      dir,
    });
  }

  return {
    rows: rows.map(publicSubmission),
    sort,
    dir,
  };
}

export async function getSubmissionById(id, { includeDeleted = false } = {}) {
  let query = getSupabaseServiceClient()
    .from("form_submissions")
    .select(SUBMISSION_WITH_FILES_SELECT)
    .eq("id", cleanUuid(id, "Submission id is not valid."))
    .is("app_purged_at", null);
  if (!includeDeleted) {
    query = query.is("deleted_by_worker_at", null).is("deleted_by_staff_at", null);
  }

  let row;
  try {
    row = throwIfSupabaseError(
      await query.maybeSingle(),
      "Submission could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    row = await getFallbackSubmissionById(id, { includeDeleted });
  }
  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  return publicSubmission(row);
}

export async function createStaffSubmissionFileAccess(submissionId, fileId) {
  const submission = await getSubmissionById(submissionId, { includeDeleted: true });
  const cleanFileId = cleanUuid(fileId, "File id is not valid.");
  const file = (submission.files || []).find((item) => item.id === cleanFileId);
  if (!file) {
    const error = new Error("Submission file was not found.");
    error.statusCode = 404;
    throw error;
  }
  if (file.app_deleted_at || !file.storage_path) {
    const error = new Error("The app copy of this file is no longer available.");
    error.statusCode = 410;
    error.exposeMessage = true;
    throw error;
  }

  const bucket = file.bucket || SUBMISSION_BUCKET;
  const storage = getSupabaseServiceClient().storage.from(bucket);
  const preview = await storage.createSignedUrl(file.storage_path, 10 * 60);
  if (preview.error) {
    const error = new Error("File preview URL could not be created.");
    error.cause = preview.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  let downloadUrl = preview.data.signedUrl;
  try {
    const download = await storage.createSignedUrl(file.storage_path, 10 * 60, {
      download: file.original_filename || true,
    });
    if (!download.error) downloadUrl = download.data.signedUrl;
  } catch {
    downloadUrl = preview.data.signedUrl;
  }

  return {
    file: {
      id: file.id,
      original_filename: file.original_filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      backup_status: file.backup_status,
      one_drive_web_url: file.one_drive_web_url,
    },
    url: preview.data.signedUrl,
    downloadUrl,
    expiresInSeconds: 10 * 60,
  };
}

export async function retrySubmissionBackup(id) {
  const cleanId = cleanUuid(id, "Submission id is not valid.");
  try {
    await backupSubmission(cleanId);
    return getSubmissionById(cleanId, { includeDeleted: true });
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    await backupFallbackSubmission(cleanId);
    return getFallbackSubmissionById(cleanId, { includeDeleted: true });
  }
}

export async function retryFailedSubmissionBackups({ limit = 50 } = {}) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select("id")
      .eq("one_drive_backup_status", "failed")
      .is("app_purged_at", null)
      .order("backup_attempted_at", { ascending: true, nullsFirst: true })
      .limit(Math.min(100, Math.max(1, Number(limit) || 50))),
    "Failed backups could not be loaded.",
  );

  const results = [];
  for (const row of rows) {
    try {
      await backupSubmission(row.id);
      results.push({ id: row.id, status: "backed_up" });
    } catch (error) {
      results.push({ id: row.id, status: "failed", error: error.message });
    }
  }
  return { attempted: results.length, results };
}

export async function runSubmissionMaintenance() {
  const backupEnabled = await isOneDriveBackupEnabled();
  let retryRows;
  try {
    retryRows = backupEnabled
      ? throwIfSupabaseError(
          await getSupabaseServiceClient()
            .from("form_submissions")
            .select("id")
            .in("one_drive_backup_status", ["pending", "failed"])
            .is("app_purged_at", null)
            .order("submitted_at", { ascending: true })
            .limit(25),
          "Pending backups could not be loaded.",
        )
      : [];
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return runFallbackSubmissionMaintenance({ backupEnabled });
  }

  const backupResults = [];
  for (const row of retryRows) {
    try {
      await backupSubmission(row.id);
      backupResults.push({ id: row.id, status: "backed_up" });
    } catch (error) {
      backupResults.push({ id: row.id, status: "failed", error: error.message });
    }
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const purgeCandidates = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select(SUBMISSION_WITH_FILES_SELECT)
      .eq("one_drive_backup_status", "backed_up")
      .is("app_purged_at", null)
      .order("submitted_at", { ascending: true })
      .limit(100),
    "Purge candidates could not be loaded.",
  ).filter((row) => row.submitted_at < cutoff || row.deleted_by_worker_at || row.deleted_by_staff_at);

  const purgeResults = [];
  for (const row of purgeCandidates) {
    try {
      await purgeSubmissionAppCopy(row);
      purgeResults.push({ id: row.id, purged: true });
    } catch (error) {
      purgeResults.push({ id: row.id, purged: false, error: error.message });
    }
  }

  const abandonedUploads = await cleanupAbandonedUploads();

  return {
    retried: backupResults.length,
    backups: backupResults,
    backupSkipped: !backupEnabled,
    backupSkipReason: backupEnabled ? "" : oneDriveBackupDisabledMessage(),
    purged: purgeResults.length,
    purgeResults,
    abandonedUploads,
  };
}

async function backupSubmissionBestEffort(id) {
  if (!(await isOneDriveBackupEnabled())) return;
  try {
    await backupSubmission(id);
  } catch {
    // Backup status is persisted by backupSubmission; submission creation should still succeed.
  }
}

async function backupSubmission(id) {
  const submission = await getSubmissionById(id, { includeDeleted: true });
  if (submission.one_drive_backup_status === "backed_up") return submission;
  await assertOneDriveBackupEnabled();

  if (submission.submission_mode === "fill_form") {
    return backupFilledSubmission(submission);
  }
  return backupFileSubmission(submission);
}

async function backupFilledSubmission(submission) {
  const attemptedAt = new Date().toISOString();
  try {
    const buffer = Buffer.from(
      JSON.stringify(
        {
          id: submission.id,
          formType: submission.form_type,
          mode: submission.submission_mode,
          company: submission.company,
          worker: {
            id: submission.worker_id,
            name: submission.worker_name,
            phone: submission.worker_phone,
            username: submission.worker_username,
          },
          notes: submission.notes,
          formData: submission.form_data || {},
          submittedAt: submission.submitted_at,
          submittedDate: submission.submitted_date_vancouver,
        },
        null,
        2,
      ),
      "utf8",
    );
    const oneDrive = await uploadBufferToOneDrive({
      buffer,
      filename: buildOneDriveFilename({
        submission,
        file: {
          original_filename: "filled-form.json",
          mime_type: "application/json",
        },
      }),
      mimeType: "application/json",
    });
    await updateSubmissionBackupStatus(submission.id, "backed_up", attemptedAt, "", oneDrive);
    return oneDrive;
  } catch (error) {
    await updateSubmissionBackupStatus(submission.id, "failed", attemptedAt, error.message);
    throw error;
  }
}

async function backupFileSubmission(submission) {
  const files = submission.files || [];
  if (!files.length) {
    const error = new Error("Submission file is missing.");
    await updateSubmissionBackupStatus(submission.id, "failed", new Date().toISOString(), error.message);
    throw error;
  }

  const results = [];
  for (const file of files) {
    if (file.backup_status === "backed_up") {
      results.push(file);
      continue;
    }

    const attemptedAt = new Date().toISOString();
    try {
      const downloaded = await getSupabaseServiceClient()
        .storage
        .from(file.bucket || SUBMISSION_BUCKET)
        .download(file.storage_path);
      if (downloaded.error) throw downloaded.error;
      const arrayBuffer = await downloaded.data.arrayBuffer();
      const oneDrive = await uploadBufferToOneDrive({
        buffer: Buffer.from(arrayBuffer),
        filename: buildOneDriveFilename({ submission, file }),
        mimeType: file.mime_type,
      });
      const updatedFile = await updateFileBackupStatus(file.id, "backed_up", attemptedAt, "", oneDrive);
      results.push(updatedFile);
    } catch (error) {
      await updateFileBackupStatus(file.id, "failed", attemptedAt, error.message);
      await updateSubmissionBackupStatus(submission.id, "failed", attemptedAt, error.message);
      throw error;
    }
  }

  const firstBackedUp = results.find((file) => file.one_drive_item_id) || results[0];
  await updateSubmissionBackupStatus(submission.id, "backed_up", new Date().toISOString(), "", {
    itemId: firstBackedUp.one_drive_item_id,
    itemName: firstBackedUp.one_drive_item_name,
    webUrl: firstBackedUp.one_drive_web_url,
    path: firstBackedUp.one_drive_path,
  });
  return results;
}

async function purgeSubmissionAppCopy(row) {
  const files = row.submission_files || row.files || [];
  const paths = files
    .filter((file) => !file.app_deleted_at && file.storage_path)
    .map((file) => file.storage_path);

  if (paths.length) {
    const result = await getSupabaseServiceClient()
      .storage
      .from(SUBMISSION_BUCKET)
      .remove(paths);
    if (result.error) {
      const error = new Error("Stored app files could not be removed.");
      error.cause = result.error;
      error.statusCode = 500;
      throw error;
    }
  }

  if (files.length) {
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_files")
        .update({ app_deleted_at: new Date().toISOString() })
        .eq("submission_id", row.id),
      "Submission file purge status could not be saved.",
    );
  }

  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .update({ app_purged_at: new Date().toISOString() })
      .eq("id", row.id),
    "Submission purge status could not be saved.",
  );

  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .delete()
      .eq("id", row.id),
    "Submission row could not be purged.",
  );
}

async function cleanupAbandonedUploads() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let rows;
  try {
    rows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_uploads")
        .select("id, bucket, storage_path")
        .is("attached_submission_id", null)
        .is("deleted_at", null)
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(100),
      "Abandoned uploads could not be loaded.",
    );
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return { checked: false, deleted: 0, errors: [] };
    throw error;
  }

  const deleted = [];
  const errors = [];
  for (const row of rows) {
    const result = await getSupabaseServiceClient()
      .storage
      .from(row.bucket || SUBMISSION_BUCKET)
      .remove([row.storage_path]);
    if (result.error) {
      errors.push({ id: row.id, path: row.storage_path, error: result.error.message });
      continue;
    }
    const update = await getSupabaseServiceClient()
      .from("submission_uploads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id);
    if (update.error) {
      errors.push({ id: row.id, path: row.storage_path, error: update.error.message });
      continue;
    }
    deleted.push(row.id);
  }

  return { checked: true, scanned: rows.length, deleted: deleted.length, errors };
}

async function updateSubmissionBackupStatus(id, status, attemptedAt, errorMessage = "", oneDrive = {}) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .update({
        one_drive_backup_status: status,
        one_drive_item_id: oneDrive.itemId || null,
        one_drive_item_name: oneDrive.itemName || null,
        one_drive_web_url: oneDrive.webUrl || null,
        one_drive_path: oneDrive.path || null,
        backup_attempted_at: attemptedAt,
        backup_error: errorMessage || null,
      })
      .eq("id", id)
      .select(SUBMISSION_SELECT)
      .single(),
    "Backup status could not be saved.",
  );
}

async function updateFileBackupStatus(id, status, attemptedAt, errorMessage = "", oneDrive = {}) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("submission_files")
      .update({
        backup_status: status,
        one_drive_item_id: oneDrive.itemId || null,
        one_drive_item_name: oneDrive.itemName || null,
        one_drive_web_url: oneDrive.webUrl || null,
        one_drive_path: oneDrive.path || null,
        backup_attempted_at: attemptedAt,
        backup_error: errorMessage || null,
      })
      .eq("id", id)
      .select(FILE_SELECT)
      .single(),
    "File backup status could not be saved.",
  );
}

async function createFallbackWorkerSubmission(worker, { body, formType, submissionMode, notes, now }) {
  const formData = cleanSubmissionFormData(
    formType,
    submissionMode,
    body?.formData ?? body?.form_data,
    worker,
  );
  const submission = {
    id: crypto.randomUUID(),
    worker_id: worker.id,
    worker_name: worker.name,
    worker_phone: worker.phone,
    worker_username: worker.username,
    company: worker.company,
    form_type: formType,
    submission_mode: submissionMode,
    notes,
    form_data: formData,
    submitted_at: now.toISOString(),
    submitted_date_vancouver: getVancouverDate(now),
    deleted_by_worker_at: null,
    app_purged_at: null,
    one_drive_backup_status: "pending",
    one_drive_item_id: null,
    one_drive_item_name: null,
    one_drive_web_url: null,
    one_drive_path: null,
    backup_attempted_at: null,
    backup_error: null,
    files: [],
  };

  if (submissionMode === "submit_file") {
    const file = cleanSubmittedFile(body?.file, worker.id);
    submission.files = [
      {
        id: crypto.randomUUID(),
        submission_id: submission.id,
        bucket: SUBMISSION_BUCKET,
        storage_path: file.storagePath,
        original_filename: file.originalFilename,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        one_drive_item_id: null,
        one_drive_item_name: null,
        one_drive_web_url: null,
        one_drive_path: null,
        backup_status: "pending",
        backup_attempted_at: null,
        backup_error: null,
        app_deleted_at: null,
        created_at: now.toISOString(),
      },
    ];
  }

  await saveFallbackSubmission(submission);
  await backupFallbackSubmissionBestEffort(submission.id);
  return getFallbackSubmissionById(submission.id, { includeDeleted: true });
}

async function listFallbackWorkerSubmissions(worker) {
  return (await listFallbackSubmissions())
    .filter((row) => row.worker_id === worker.id)
    .filter((row) => !row.deleted_by_worker_at && !row.deleted_by_staff_at && !row.app_purged_at)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, 200);
}

async function deleteFallbackWorkerSubmission(worker, id) {
  const row = await getFallbackSubmissionById(id, { includeDeleted: true });
  if (
    !row ||
    row.worker_id !== worker.id ||
    row.deleted_by_worker_at ||
    row.deleted_by_staff_at ||
    row.app_purged_at
  ) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (row.one_drive_backup_status === "backed_up") {
    await purgeFallbackSubmissionAppCopy(row);
    return { deleted: true, purged: true };
  }

  row.deleted_by_worker_at = new Date().toISOString();
  await saveFallbackSubmission(row);
  await backupFallbackSubmissionBestEffort(id);
  return { deleted: true, purged: false };
}

async function deleteFallbackStaffSubmission(staff, id) {
  const row = await getFallbackSubmissionById(id, { includeDeleted: true });
  if (!row || row.deleted_by_staff_at || row.app_purged_at) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (row.one_drive_backup_status === "backed_up") {
    await purgeFallbackSubmissionAppCopy(row);
    return { id, deleted: true, purged: true, submission: publicSubmission(row) };
  }

  row.deleted_by_staff_at = new Date().toISOString();
  row.deleted_by_staff_id = staff?.id || null;
  await saveFallbackSubmission(row);
  await backupFallbackSubmissionBestEffort(id);
  return { id, deleted: true, purged: false, submission: publicSubmission(row) };
}

async function listFallbackStaffSubmissions(filters) {
  const {
    from,
    to,
    company,
    phone,
    name,
    formType,
    backupStatus,
    sort,
    dir,
  } = filters;

  return (await listFallbackSubmissions())
    .filter((row) => !row.deleted_by_worker_at && !row.deleted_by_staff_at && !row.app_purged_at)
    .filter((row) => !from || row.submitted_date_vancouver >= from)
    .filter((row) => !to || row.submitted_date_vancouver <= to)
    .filter((row) => textIncludes(row.company, company))
    .filter((row) => textIncludes(row.worker_phone, phone))
    .filter((row) => textIncludes(row.worker_name, name))
    .filter((row) => !FORM_TYPES.includes(formType) || row.form_type === formType)
    .filter((row) =>
      !["pending", "backed_up", "failed"].includes(backupStatus) ||
      row.one_drive_backup_status === backupStatus
    )
    .sort((a, b) => compareFallbackSubmissions(a, b, sort, dir))
    .slice(0, 500);
}

async function getFallbackSubmissionById(id, { includeDeleted = false } = {}) {
  const row = normalizeFallbackSubmission(await getFallbackRecord("submission", id));
  if (!row || row.app_purged_at) return null;
  if (!includeDeleted && (row.deleted_by_worker_at || row.deleted_by_staff_at)) return null;
  return row;
}

async function listFallbackSubmissions() {
  return (await listFallbackRecords("submission"))
    .map(normalizeFallbackSubmission)
    .filter(Boolean);
}

async function saveFallbackSubmission(submission) {
  const normalized = normalizeFallbackSubmission(submission);
  normalized.updated_at = new Date().toISOString();
  return normalizeFallbackSubmission(
    await upsertFallbackRecord("submission", normalized.id, normalized),
  );
}

async function backupFallbackSubmissionBestEffort(id) {
  if (!(await isOneDriveBackupEnabled())) return;
  try {
    await backupFallbackSubmission(id);
  } catch {
    // Backup status is persisted; submission creation should still succeed.
  }
}

async function backupFallbackSubmission(id) {
  const submission = await getFallbackSubmissionById(id, { includeDeleted: true });
  if (!submission) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  if (submission.one_drive_backup_status === "backed_up") return submission;
  await assertOneDriveBackupEnabled();

  const attemptedAt = new Date().toISOString();
  try {
    if (submission.submission_mode === "fill_form") {
      const buffer = Buffer.from(
        JSON.stringify(
          {
            id: submission.id,
            formType: submission.form_type,
            mode: submission.submission_mode,
            company: submission.company,
            worker: {
              id: submission.worker_id,
              name: submission.worker_name,
              phone: submission.worker_phone,
              username: submission.worker_username,
            },
            notes: submission.notes,
            formData: submission.form_data || {},
            submittedAt: submission.submitted_at,
            submittedDate: submission.submitted_date_vancouver,
          },
          null,
          2,
        ),
        "utf8",
      );
      const oneDrive = await uploadBufferToOneDrive({
        buffer,
        filename: buildOneDriveFilename({
          submission,
          file: {
            original_filename: "filled-form.json",
            mime_type: "application/json",
          },
        }),
        mimeType: "application/json",
      });
      applyFallbackSubmissionBackupStatus(submission, "backed_up", attemptedAt, "", oneDrive);
      await saveFallbackSubmission(submission);
      return submission;
    }

    const files = submission.files || [];
    if (!files.length) throw new Error("Submission file is missing.");
    for (const file of files) {
      if (file.backup_status === "backed_up") continue;
      const downloaded = await getSupabaseServiceClient()
        .storage
        .from(file.bucket || SUBMISSION_BUCKET)
        .download(file.storage_path);
      if (downloaded.error) throw downloaded.error;
      const arrayBuffer = await downloaded.data.arrayBuffer();
      const oneDrive = await uploadBufferToOneDrive({
        buffer: Buffer.from(arrayBuffer),
        filename: buildOneDriveFilename({ submission, file }),
        mimeType: file.mime_type,
      });
      Object.assign(file, {
        backup_status: "backed_up",
        backup_attempted_at: attemptedAt,
        backup_error: null,
        one_drive_item_id: oneDrive.itemId || null,
        one_drive_item_name: oneDrive.itemName || null,
        one_drive_web_url: oneDrive.webUrl || null,
        one_drive_path: oneDrive.path || null,
      });
    }

    const firstBackedUp = files.find((file) => file.one_drive_item_id) || files[0];
    applyFallbackSubmissionBackupStatus(submission, "backed_up", attemptedAt, "", {
      itemId: firstBackedUp.one_drive_item_id,
      itemName: firstBackedUp.one_drive_item_name,
      webUrl: firstBackedUp.one_drive_web_url,
      path: firstBackedUp.one_drive_path,
    });
    await saveFallbackSubmission(submission);
    return submission;
  } catch (error) {
    applyFallbackSubmissionBackupStatus(submission, "failed", attemptedAt, error.message);
    submission.files = (submission.files || []).map((file) =>
      file.backup_status === "backed_up"
        ? file
        : {
            ...file,
            backup_status: "failed",
            backup_attempted_at: attemptedAt,
            backup_error: error.message,
          },
    );
    await saveFallbackSubmission(submission);
    throw error;
  }
}

async function runFallbackSubmissionMaintenance({ backupEnabled } = {}) {
  const canBackup =
    backupEnabled === undefined ? await isOneDriveBackupEnabled() : backupEnabled;
  const submissions = await listFallbackSubmissions();
  const retryRows = canBackup
    ? submissions
        .filter((row) => ["pending", "failed"].includes(row.one_drive_backup_status))
        .filter((row) => !row.app_purged_at)
        .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
        .slice(0, 25)
    : [];

  const backupResults = [];
  for (const row of retryRows) {
    try {
      await backupFallbackSubmission(row.id);
      backupResults.push({ id: row.id, status: "backed_up" });
    } catch (error) {
      backupResults.push({ id: row.id, status: "failed", error: error.message });
    }
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const purgeRows = submissions
    .filter((row) => row.one_drive_backup_status === "backed_up")
    .filter((row) => !row.app_purged_at)
    .filter((row) => row.submitted_at < cutoff || row.deleted_by_worker_at || row.deleted_by_staff_at)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
    .slice(0, 100);

  const purgeResults = [];
  for (const row of purgeRows) {
    try {
      await purgeFallbackSubmissionAppCopy(row);
      purgeResults.push({ id: row.id, purged: true });
    } catch (error) {
      purgeResults.push({ id: row.id, purged: false, error: error.message });
    }
  }

  return {
    retried: backupResults.length,
    backups: backupResults,
    backupSkipped: !canBackup,
    backupSkipReason: canBackup ? "" : oneDriveBackupDisabledMessage(),
    purged: purgeResults.length,
    purgeResults,
  };
}

async function assertOneDriveBackupEnabled() {
  if (await isOneDriveBackupEnabled()) return;
  const error = new Error(oneDriveBackupDisabledMessage());
  error.statusCode = 409;
  error.exposeMessage = true;
  throw error;
}

function oneDriveBackupDisabledMessage() {
  return "OneDrive backup is turned off in Staff Settings.";
}

async function purgeFallbackSubmissionAppCopy(row) {
  const files = row.files || [];
  const paths = files
    .filter((file) => !file.app_deleted_at && file.storage_path)
    .map((file) => file.storage_path);

  if (paths.length) {
    const result = await getSupabaseServiceClient()
      .storage
      .from(SUBMISSION_BUCKET)
      .remove(paths);
    if (result.error) {
      const error = new Error("Stored app files could not be removed.");
      error.cause = result.error;
      error.statusCode = 500;
      throw error;
    }
  }

  await deleteFallbackRecord("submission", row.id);
}

async function ensureSubmissionBucket() {
  const result = await getSupabaseServiceClient().storage.createBucket(
    SUBMISSION_BUCKET,
    {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_SUBMISSION_MIME_TYPES,
    },
  );
  if (result.error && !isStorageBucketAlreadyExists(result.error)) {
    const error = new Error("Submission storage bucket could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }
}

function applyFallbackSubmissionBackupStatus(
  submission,
  status,
  attemptedAt,
  errorMessage = "",
  oneDrive = {},
) {
  Object.assign(submission, {
    one_drive_backup_status: status,
    one_drive_item_id: oneDrive.itemId || null,
    one_drive_item_name: oneDrive.itemName || null,
    one_drive_web_url: oneDrive.webUrl || null,
    one_drive_path: oneDrive.path || null,
    backup_attempted_at: attemptedAt,
    backup_error: errorMessage || null,
  });
}

function normalizeFallbackSubmission(row) {
  if (!row) return null;
  const files = Array.isArray(row.files) ? row.files : row.submission_files || [];
  return {
    ...row,
    form_data: row.form_data && typeof row.form_data === "object" ? row.form_data : {},
    deleted_by_staff_at: row.deleted_by_staff_at || null,
    deleted_by_staff_id: row.deleted_by_staff_id || null,
    files,
    submission_files: files,
  };
}

function compareFallbackSubmissions(a, b, sort, dir) {
  const aValue = String(a[sort] || "");
  const bValue = String(b[sort] || "");
  const result = aValue.localeCompare(bValue);
  return dir === "asc" ? result : -result;
}

function textIncludes(value, search) {
  if (!search) return true;
  return String(value || "").toLowerCase().includes(String(search).toLowerCase());
}

function isStorageBucketMissing(error) {
  const message = String(error?.message || error?.error || "");
  return String(error?.statusCode || error?.status || "") === "404" || /bucket.*not found/i.test(message);
}

function isStorageBucketAlreadyExists(error) {
  const message = String(error?.message || error?.error || "");
  return String(error?.statusCode || error?.status || "") === "409" || /already exists/i.test(message);
}

function cleanFormType(value) {
  const formType = String(value || "").trim();
  if (!FORM_TYPES.includes(formType)) {
    const error = new Error("Form type is not valid.");
    error.statusCode = 400;
    throw error;
  }
  return formType;
}

function cleanSubmissionMode(value) {
  const mode = String(value || "").trim();
  if (!SUBMISSION_MODES.includes(mode)) {
    const error = new Error("Submission mode is not valid.");
    error.statusCode = 400;
    throw error;
  }
  return mode;
}

function cleanFileMetadata(file) {
  const originalFilename = String(file?.originalFilename || file?.name || "").trim();
  const extension = fileExtension(originalFilename);
  const allowedMimeTypes = ALLOWED_UPLOAD_EXTENSIONS[extension] || [];
  const rawMimeType = String(file?.mimeType || file?.type || "").trim().toLowerCase();
  const mimeType = GENERIC_UPLOAD_MIME_TYPES.includes(rawMimeType)
    ? allowedMimeTypes[0] || "application/octet-stream"
    : rawMimeType;
  const cleaned = {
    originalFilename,
    mimeType,
    sizeBytes: Number(file?.sizeBytes || file?.size || 0),
  };
  if (!cleaned.originalFilename) {
    const error = new Error("File name is required.");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(cleaned.sizeBytes) || cleaned.sizeBytes < 1) {
    const error = new Error("File size is required.");
    error.statusCode = 400;
    throw error;
  }
  if (cleaned.sizeBytes > MAX_FILE_SIZE_BYTES) {
    const error = new Error("File must be 50 MiB or smaller.");
    error.statusCode = 400;
    throw error;
  }
  if (!allowedMimeTypes.length) {
    const error = new Error("File type is not allowed. Use an image, PDF, Word, Excel, or text file.");
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }
  if (!allowedMimeTypes.includes(cleaned.mimeType)) {
    const error = new Error("File extension and file type do not match.");
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }
  return cleaned;
}

function cleanSubmittedFile(file, workerId) {
  const metadata = cleanFileMetadata(file);
  const storagePath = String(file?.storagePath || file?.storage_path || "").trim();
  if (!storagePath.startsWith(`${workerId}/`)) {
    const error = new Error("Uploaded file path is not valid for this worker.");
    error.statusCode = 400;
    throw error;
  }
  return { ...metadata, storagePath };
}

function cleanSubmissionFormData(formType, submissionMode, value, worker) {
  if (submissionMode !== "fill_form") return {};
  if (formType === "toolbox_talk") return cleanToolboxTalkFormData(value, worker);
  if (formType === "site_inspection") return cleanSiteInspectionFormData(value, worker);
  return {};
}

function buildSubmissionNotes(formType, submissionMode, value, formData) {
  if (submissionMode === "fill_form" && formType === "toolbox_talk") {
    const header = formData.header || {};
    const topicLabels = (formData.topics?.selected || [])
      .map((topic) => topic.label)
      .filter(Boolean)
      .slice(0, 4);
    const topicSummary = topicLabels.length
      ? topicLabels.join(", ")
      : cleanText(formData.topics?.other || "", MAX_FORM_TEXT_LENGTH);
    const attendeeCount = (formData.attendance || []).length;
    return [
      `Project: ${header.projectName}`,
      topicSummary ? `Topics: ${topicSummary}` : "",
      `${attendeeCount} attendee${attendeeCount === 1 ? "" : "s"}`,
    ]
      .filter(Boolean)
      .join(" / ")
      .slice(0, MAX_FORM_LONG_TEXT_LENGTH);
  }

  if (submissionMode === "fill_form" && formType === "site_inspection") {
    const header = formData.header || {};
    const deficiencyCount = (formData.deficiencies || []).length;
    return [
      `Project: ${header.project}`,
      header.areaInspected ? `Area: ${header.areaInspected}` : "",
      deficiencyCount
        ? `${deficiencyCount} deficienc${deficiencyCount === 1 ? "y" : "ies"}`
        : "No deficiencies found",
    ]
      .filter(Boolean)
      .join(" / ")
      .slice(0, MAX_FORM_LONG_TEXT_LENGTH);
  }

  return String(value || "").trim().slice(0, MAX_FORM_LONG_TEXT_LENGTH);
}

function cleanToolboxTalkFormData(value, worker) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwBadRequest("Toolbox talk form data is required.");
  }

  const headerInput = value.header || {};
  const header = {
    projectName: requireText(headerInput.projectName, "Project name"),
    address: requireText(headerInput.address, "Address"),
    date: cleanDate(headerInput.date, "Date"),
    time: cleanTime(headerInput.time, "Time"),
    presenter: requireText(headerInput.presenter || worker?.name, "Presenter"),
    supervisor: requireText(headerInput.supervisor, "Supervisor"),
  };

  const selectedTopics = cleanSelectedToolboxTopics(value.topics?.selected);
  const otherTopics = cleanText(value.topics?.other || "", MAX_FORM_LONG_TEXT_LENGTH);
  if (!selectedTopics.length && !otherTopics) {
    throwBadRequest("Select at least one topic or enter an additional topic.");
  }

  const incidentInput = value.incidentReview || {};
  const nearMissReviewed = cleanChoice(
    incidentInput.nearMissReviewed,
    ["", "yes", "no"],
    "Near miss review",
  );

  const safetyConcerns = cleanRows(value.safetyConcerns, (row) => ({
    concern: cleanText(row?.concern, MAX_FORM_TEXT_LENGTH),
    actionToTake: cleanText(row?.actionToTake ?? row?.action, MAX_FORM_TEXT_LENGTH),
    dateTaken: cleanOptionalDate(row?.dateTaken),
  })).filter((row) => row.concern || row.actionToTake || row.dateTaken);

  const attendance = cleanRows(value.attendance, (row) => ({
    name: cleanText(row?.name, MAX_FORM_TEXT_LENGTH),
  })).filter((row) => row.name);
  if (!attendance.length) {
    throwBadRequest("Add at least one attendee.");
  }

  const confirmationInput = value.confirmation || {};
  if (confirmationInput.confirmed !== true) {
    throwBadRequest("Confirm that the listed workers participated.");
  }

  return {
    kind: "toolbox_talk_v1",
    version: 1,
    header,
    topics: {
      selected: selectedTopics,
      other: otherTopics,
    },
    incidentReview: {
      firstAidCount: cleanOptionalCount(incidentInput.firstAidCount),
      medicalAidCount: cleanOptionalCount(incidentInput.medicalAidCount),
      nearMissReviewed,
      nearMissDescription: cleanText(
        incidentInput.nearMissDescription,
        MAX_FORM_LONG_TEXT_LENGTH,
      ),
      lessonsLearned: cleanText(incidentInput.lessonsLearned, MAX_FORM_LONG_TEXT_LENGTH),
    },
    safetyConcerns,
    attendance,
    additionalComments: cleanText(value.additionalComments, MAX_FORM_LONG_TEXT_LENGTH),
    confirmation: {
      name: requireText(confirmationInput.name, "Presenter confirmation name"),
      date: cleanDate(confirmationInput.date, "Confirmation date"),
      confirmed: true,
    },
  };
}

function cleanSelectedToolboxTopics(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .slice(0, MAX_TOOLBOX_TOPICS)
    .map((topic) => ({
      categoryId: cleanText(topic?.categoryId, 80),
      categoryLabel: cleanText(topic?.categoryLabel, MAX_FORM_TEXT_LENGTH),
      topicId: cleanText(topic?.topicId, 120),
      label: cleanText(topic?.label, MAX_FORM_TEXT_LENGTH),
    }))
    .filter((topic) => topic.categoryId && topic.topicId && topic.label);
}

function cleanSiteInspectionFormData(value, worker) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwBadRequest("Site inspection form data is required.");
  }

  const headerInput = value.header || {};
  const header = {
    project: requireText(headerInput.project || headerInput.projectName, "Project"),
    address: cleanText(headerInput.address, MAX_FORM_TEXT_LENGTH),
    areaInspected: requireText(headerInput.areaInspected || headerInput.area, "Area inspected"),
    date: cleanDate(headerInput.date, "Date"),
    time: cleanTime(headerInput.time, "Time"),
    inspector: requireText(headerInput.inspector || worker?.name, "Inspector"),
    tradesPresent: cleanText(headerInput.tradesPresent, MAX_FORM_TEXT_LENGTH),
    reviewer: cleanText(headerInput.reviewer || headerInput.supervisor, MAX_FORM_TEXT_LENGTH),
  };

  const noDeficiencies = value.noDeficiencies === true;
  const deficiencies = cleanRows(value.deficiencies, cleanSiteInspectionDeficiency)
    .filter((row) =>
      row.category ||
      row.location ||
      row.description ||
      row.immediateControl ||
      row.recommendedAction ||
      row.suggestedAssignee ||
      row.dueDate,
    )
    .slice(0, MAX_SITE_INSPECTION_DEFICIENCIES);

  if (!noDeficiencies && !deficiencies.length) {
    throwBadRequest("Add at least one deficiency or mark no deficiencies found.");
  }

  if (deficiencies.length) {
    deficiencies.forEach((row, index) => {
      if (!row.description) {
        throwBadRequest(`Deficiency ${index + 1} needs a description.`);
      }
    });
  }

  return {
    kind: "site_inspection_v1",
    version: 1,
    header,
    observations: {
      positive: cleanText(value.observations?.positive || value.positiveObservations, MAX_FORM_LONG_TEXT_LENGTH),
      highRiskWork: cleanText(value.observations?.highRiskWork || value.highRiskWorkObserved, MAX_FORM_LONG_TEXT_LENGTH),
      immediateControls: cleanText(value.observations?.immediateControls || value.immediateControls, MAX_FORM_LONG_TEXT_LENGTH),
      followUpNotes: cleanText(value.observations?.followUpNotes || value.followUpNotes, MAX_FORM_LONG_TEXT_LENGTH),
    },
    noDeficiencies,
    deficiencies,
  };
}

function cleanSiteInspectionDeficiency(row) {
  return {
    category: cleanText(row?.category, MAX_FORM_TEXT_LENGTH),
    location: cleanText(row?.location, MAX_FORM_TEXT_LENGTH),
    description: cleanText(row?.description || row?.deficiency, MAX_FORM_LONG_TEXT_LENGTH),
    priority: cleanChoice(row?.priority || "medium", ["low", "medium", "high", "critical"], "Priority"),
    immediateControl: cleanText(row?.immediateControl, MAX_FORM_LONG_TEXT_LENGTH),
    recommendedAction: cleanText(row?.recommendedAction, MAX_FORM_LONG_TEXT_LENGTH),
    suggestedAssignee: cleanText(row?.suggestedAssignee, MAX_FORM_TEXT_LENGTH),
    dueDate: cleanOptionalDate(row?.dueDate),
  };
}

function cleanRows(value, cleaner) {
  const rows = Array.isArray(value) ? value : [];
  return rows.slice(0, MAX_TOOLBOX_ROWS).map(cleaner);
}

function requireText(value, label) {
  const cleaned = cleanText(value, MAX_FORM_TEXT_LENGTH);
  if (!cleaned) throwBadRequest(`${label} is required.`);
  return cleaned;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanDate(value, label) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throwBadRequest(`${label} must use YYYY-MM-DD format.`);
  }
  return date;
}

function cleanOptionalDate(value) {
  const date = String(value || "").trim();
  if (!date) return "";
  return cleanDate(date, "Date taken");
}

function cleanTime(value, label) {
  const time = String(value || "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throwBadRequest(`${label} must use HH:MM format.`);
  }
  return time;
}

function cleanChoice(value, choices, label) {
  const choice = String(value || "").trim();
  if (!choices.includes(choice)) throwBadRequest(`${label} is not valid.`);
  return choice;
}

function cleanOptionalCount(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{1,4}$/.test(text)) throwBadRequest("Counts must be whole numbers.");
  return Number(text);
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}

function sanitizeStorageFilename(value) {
  return String(value || "submission")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function fileExtension(value) {
  const name = String(value || "").trim().toLowerCase();
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index);
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

function escapeLike(value) {
  return String(value).replace(/[%_]/g, "\\$&");
}
