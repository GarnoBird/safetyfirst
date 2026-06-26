import crypto from "node:crypto";
import { assertDateString, getVancouverDate } from "./date.js";
import { buildOneDriveFilename, uploadBufferToOneDrive } from "./onedrive.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

export const SUBMISSION_BUCKET = "safety-form-submissions";
export const FORM_TYPES = [
  "toolbox_talk",
  "site_inspection",
  "daily_hazard_assessment",
];
export const SUBMISSION_MODES = ["submit_file", "fill_form"];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
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
  "id, worker_id, worker_name, worker_phone, worker_username, company, form_type, submission_mode, notes, submitted_at, submitted_date_vancouver, deleted_by_worker_at, app_purged_at, one_drive_backup_status, one_drive_item_id, one_drive_item_name, one_drive_web_url, one_drive_path, backup_attempted_at, backup_error";
const SUBMISSION_WITH_FILES_SELECT = `${SUBMISSION_SELECT}, submission_files(${FILE_SELECT})`;

export function publicSubmission(row) {
  return {
    ...row,
    files: row.submission_files || row.files || [],
    submission_files: undefined,
  };
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
    const error = new Error("Upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    throw error;
  }

  return {
    bucket: SUBMISSION_BUCKET,
    storagePath,
    signedUrl: result.data.signedUrl,
    token: result.data.token,
    path: result.data.path,
    formType,
    file,
  };
}

export async function createWorkerSubmission(worker, body) {
  const formType = cleanFormType(body?.formType || body?.form_type);
  const submissionMode = cleanSubmissionMode(body?.submissionMode || body?.submission_mode);
  const notes = String(body?.notes || "").trim().slice(0, 4000);
  const now = new Date();

  const inserted = throwIfSupabaseError(
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
        submitted_at: now.toISOString(),
        submitted_date_vancouver: getVancouverDate(now),
        one_drive_backup_status: "pending",
      })
      .select(SUBMISSION_SELECT)
      .single(),
    "Submission could not be saved.",
  );

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
  }

  await backupSubmissionBestEffort(inserted.id);
  return getSubmissionById(inserted.id, { includeDeleted: true });
}

export async function listWorkerSubmissions(worker) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select(SUBMISSION_WITH_FILES_SELECT)
      .eq("worker_id", worker.id)
      .is("deleted_by_worker_at", null)
      .is("app_purged_at", null)
      .order("submitted_at", { ascending: false })
      .limit(200),
    "Submissions could not be loaded.",
  );
  return rows.map(publicSubmission);
}

export async function deleteWorkerSubmission(worker, submissionId) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select(SUBMISSION_WITH_FILES_SELECT)
      .eq("id", id)
      .eq("worker_id", worker.id)
      .is("app_purged_at", null)
      .maybeSingle(),
    "Submission could not be loaded.",
  );

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

  const rows = throwIfSupabaseError(
    await dbQuery.order(sort, { ascending: dir === "asc" }).limit(500),
    "Submissions could not be loaded.",
  );

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
  if (!includeDeleted) query = query.is("deleted_by_worker_at", null);

  const row = throwIfSupabaseError(
    await query.maybeSingle(),
    "Submission could not be loaded.",
  );
  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  return publicSubmission(row);
}

export async function retrySubmissionBackup(id) {
  await backupSubmission(cleanUuid(id, "Submission id is not valid."));
  return getSubmissionById(id, { includeDeleted: true });
}

export async function runSubmissionMaintenance() {
  const retryRows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select("id")
      .in("one_drive_backup_status", ["pending", "failed"])
      .is("app_purged_at", null)
      .order("submitted_at", { ascending: true })
      .limit(25),
    "Pending backups could not be loaded.",
  );

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
  ).filter((row) => row.submitted_at < cutoff || row.deleted_by_worker_at);

  const purgeResults = [];
  for (const row of purgeCandidates) {
    try {
      await purgeSubmissionAppCopy(row);
      purgeResults.push({ id: row.id, purged: true });
    } catch (error) {
      purgeResults.push({ id: row.id, purged: false, error: error.message });
    }
  }

  return {
    retried: backupResults.length,
    backups: backupResults,
    purged: purgeResults.length,
    purgeResults,
  };
}

async function backupSubmissionBestEffort(id) {
  try {
    await backupSubmission(id);
  } catch {
    // Backup status is persisted by backupSubmission; submission creation should still succeed.
  }
}

async function backupSubmission(id) {
  const submission = await getSubmissionById(id, { includeDeleted: true });
  if (submission.one_drive_backup_status === "backed_up") return submission;

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
  const cleaned = {
    originalFilename: String(file?.originalFilename || file?.name || "").trim(),
    mimeType: String(file?.mimeType || file?.type || "application/octet-stream").trim(),
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

function sanitizeStorageFilename(value) {
  return String(value || "submission")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
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
