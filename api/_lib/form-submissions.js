import crypto from "node:crypto";
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
    if (isStorageBucketMissing(result.error)) {
      await ensureSubmissionBucket();
      const retry = await getSupabaseServiceClient()
        .storage
        .from(SUBMISSION_BUCKET)
        .createSignedUploadUrl(storagePath);
      if (!retry.error) {
        return {
          bucket: SUBMISSION_BUCKET,
          storagePath,
          signedUrl: retry.data.signedUrl,
          token: retry.data.token,
          path: retry.data.path,
          formType,
          file,
        };
      }
      result.error = retry.error;
    }
    const error = new Error("Upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
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
  if (!includeDeleted) query = query.is("deleted_by_worker_at", null);

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
    backupSkipped: !backupEnabled,
    backupSkipReason: backupEnabled ? "" : oneDriveBackupDisabledMessage(),
    purged: purgeResults.length,
    purgeResults,
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

async function createFallbackWorkerSubmission(worker, { body, formType, submissionMode, notes, now }) {
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
    .filter((row) => !row.deleted_by_worker_at && !row.app_purged_at)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, 200);
}

async function deleteFallbackWorkerSubmission(worker, id) {
  const row = await getFallbackSubmissionById(id, { includeDeleted: true });
  if (!row || row.worker_id !== worker.id || row.app_purged_at) {
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
    .filter((row) => !row.deleted_by_worker_at && !row.app_purged_at)
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
  if (!includeDeleted && row.deleted_by_worker_at) return null;
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
    .filter((row) => row.submitted_at < cutoff || row.deleted_by_worker_at)
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
