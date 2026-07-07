import crypto from "node:crypto";
import { Resend } from "resend";
import {
  createDraftActionItemsFromSiteInspection,
  createDraftActionItemsFromTemplateActionRows,
} from "./action-items.js";
import { assertDateString, getVancouverDate } from "./date.js";
import {
  deleteFallbackRecord,
  getFallbackRecord,
  listFallbackRecords,
  upsertFallbackRecord,
} from "./fallback-store.js";
import {
  buildTemplateSubmissionNotes,
  cleanTemplateSubmissionFieldsForSchema,
  collectTemplateMediaUploadFiles,
  getPublishedWorkerFormTemplate,
  validateTemplateSubmissionFormData,
} from "./form-templates.js";
import { getRequiredEnv } from "./http.js";
import { buildOneDriveFilename, uploadBufferToOneDrive } from "./onedrive.js";
import { renderSubmittedFormPdf } from "./submission-pdf.js";
import { isOneDriveBackupEnabled } from "./settings.js";
import { assertStoredObjectMatches } from "./storage-validation.js";
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
const CUSTOM_FORM_TYPES = ["toolbox_talk", "site_inspection"];
export const SUBMISSION_MODES = ["submit_file", "fill_form"];

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FORM_TEXT_LENGTH = 600;
const MAX_FORM_LONG_TEXT_LENGTH = 4000;
const MAX_STAFF_SIGNATURE_DATA_URL_LENGTH = 750000;
const MAX_SUBMISSION_EMAIL_PDF_BYTES = 18 * 1024 * 1024;
const STAFF_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF_SIGNATURE_DATA_URL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const MAX_TOOLBOX_TOPICS = 80;
const MAX_TOOLBOX_ROWS = 80;
const TOOLBOX_TALK_SPECIAL_BLOCK_ORDER = [
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
];
const TOOLBOX_TALK_SPECIAL_BLOCK_TYPES = new Set(TOOLBOX_TALK_SPECIAL_BLOCK_ORDER);
const TOOLBOX_TALK_HEADER_FIELD_CONFIGS = [
  { key: "projectName", id: "toolbox_project_name", label: "Project Name", required: true },
  { key: "address", id: "toolbox_address", label: "Address", required: true },
  { key: "date", id: "toolbox_date", label: "Date", required: true },
  { key: "time", id: "toolbox_time", label: "Time", required: true },
  { key: "presenter", id: "toolbox_presenter", label: "Presenter", required: true },
  { key: "supervisor", id: "toolbox_supervisor", label: "Supervisor", required: true },
];
const TOOLBOX_INCIDENT_REVIEW_FIELD_CONFIGS = [
  { key: "firstAidCount", defaultValue: "" },
  { key: "medicalAidCount", defaultValue: "" },
  { key: "nearMissReviewed", defaultValue: "" },
  { key: "nearMissDescription", defaultValue: "" },
  { key: "lessonsLearned", defaultValue: "" },
];
const TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS = [
  { key: "concern", defaultValue: "" },
  { key: "actionToTake", defaultValue: "" },
  { key: "dateTaken", defaultValue: "" },
];
const TOOLBOX_COMPOSITE_BLOCK_CONFIGS = {
  toolbox_incident_review: {
    settingsKey: "toolboxIncidentReview",
    fieldConfigs: TOOLBOX_INCIDENT_REVIEW_FIELD_CONFIGS,
  },
  toolbox_safety_concerns: {
    settingsKey: "toolboxSafetyConcerns",
    fieldConfigs: TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS,
  },
};
const TOOLBOX_TALK_HEADER_FIELD_ALIASES = {
  address: "address",
  project: "projectName",
  project_name: "projectName",
  projectname: "projectName",
  supervisor: "supervisor",
  presenter: "presenter",
  date: "date",
  time: "time",
  toolbox_address: "address",
  toolbox_project_name: "projectName",
  toolbox_supervisor: "supervisor",
  toolbox_presenter: "presenter",
  toolbox_date: "date",
  toolbox_time: "time",
};
const SITE_INSPECTION_HEADER_FIELD_CONFIGS = [
  { key: "project", id: "site_project", label: "Project", required: true },
  { key: "areaInspected", id: "site_area_inspected", label: "Area inspected", required: true },
  { key: "address", id: "site_address", label: "Address", required: false },
  { key: "date", id: "site_date", label: "Date", required: true },
  { key: "time", id: "site_time", label: "Time", required: true },
  { key: "inspector", id: "site_inspector", label: "Inspector", required: true },
  { key: "tradesPresent", id: "site_trades_present", label: "Trades present", required: false },
  { key: "reviewer", id: "site_reviewer", label: "Reviewer / Supervisor", required: false },
];
const SITE_INSPECTION_HEADER_FIELD_ALIASES = {
  address: "address",
  area: "areaInspected",
  area_inspected: "areaInspected",
  areainspected: "areaInspected",
  date: "date",
  inspector: "inspector",
  project: "project",
  project_name: "project",
  reviewer: "reviewer",
  reviewer_supervisor: "reviewer",
  site_address: "address",
  site_area_inspected: "areaInspected",
  site_date: "date",
  site_inspector: "inspector",
  site_project: "project",
  site_reviewer: "reviewer",
  site_time: "time",
  site_trades_present: "tradesPresent",
  supervisor: "reviewer",
  time: "time",
  trades: "tradesPresent",
  trades_present: "tradesPresent",
  tradespresent: "tradesPresent",
};
const SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS = [
  { key: "positive", id: "site_positive_observations", label: "Positive observations", required: false },
  { key: "highRiskWork", id: "site_high_risk_work", label: "High-risk work observed", required: false },
  { key: "immediateControls", id: "site_immediate_controls", label: "Immediate controls", required: false },
  { key: "followUpNotes", id: "site_follow_up_notes", label: "Follow-up notes", required: false },
];
const SITE_INSPECTION_OBSERVATION_FIELD_ALIASES = {
  follow_up: "followUpNotes",
  follow_up_notes: "followUpNotes",
  followup: "followUpNotes",
  followup_notes: "followUpNotes",
  high_risk: "highRiskWork",
  high_risk_work: "highRiskWork",
  high_risk_work_observed: "highRiskWork",
  highriskwork: "highRiskWork",
  immediate_control: "immediateControls",
  immediate_controls: "immediateControls",
  positive: "positive",
  positive_observations: "positive",
  site_follow_up_notes: "followUpNotes",
  site_high_risk_work: "highRiskWork",
  site_immediate_controls: "immediateControls",
  site_positive_observations: "positive",
};
const MAX_SITE_INSPECTION_DEFICIENCIES = 80;
const ACTION_ITEM_ROW_FIELD_CONFIGS = [
  { key: "category", defaultValue: "" },
  { key: "location", defaultValue: "" },
  { key: "priority", defaultValue: "medium" },
  { key: "suggestedAssignee", defaultValue: "" },
  { key: "description", defaultValue: "", lockedVisible: true },
  { key: "immediateControl", defaultValue: "" },
  { key: "recommendedAction", defaultValue: "" },
  { key: "dueDate", defaultValue: "" },
];
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
  "id, worker_id, worker_name, worker_phone, worker_username, company, form_type, submission_mode, notes, form_data, form_template_version_id, form_schema_snapshot, staff_signoffs, staff_reviewed_at, staff_reviewed_by_staff_id, submitted_at, submitted_date_vancouver, deleted_by_worker_at, deleted_by_staff_at, deleted_by_staff_id, app_purged_at, one_drive_backup_status, one_drive_item_id, one_drive_item_name, one_drive_web_url, one_drive_path, backup_attempted_at, backup_error";
const SUBMISSION_WITH_FILES_SELECT = `${SUBMISSION_SELECT}, submission_files(${FILE_SELECT})`;
const STAFF_SUBMISSION_LIST_SELECT =
  "id, worker_id, worker_name, worker_phone, worker_username, company, form_type, submission_mode, submitted_at, submitted_date_vancouver, one_drive_backup_status, backup_attempted_at, backup_error";
const DEFAULT_STAFF_SUBMISSIONS_LIMIT = 50;
const MAX_STAFF_SUBMISSIONS_LIMIT = 100;

export function publicSubmission(row) {
  return {
    ...row,
    staff_signoffs: normalizeStaffSignoffs(row?.staff_signoffs),
    staff_reviewed_at: row?.staff_reviewed_at || null,
    staff_reviewed_by_staff_id: row?.staff_reviewed_by_staff_id || null,
    files: row.submission_files || row.files || [],
    submission_files: undefined,
  };
}

export function publicSubmissionSummary(row) {
  return {
    id: row?.id || "",
    worker_id: row?.worker_id || null,
    worker_name: row?.worker_name || "",
    worker_phone: row?.worker_phone || "",
    worker_username: row?.worker_username || "",
    company: row?.company || "",
    form_type: row?.form_type || "",
    form_current_label: row?.form_current_label || null,
    submission_mode: row?.submission_mode || "",
    submitted_at: row?.submitted_at || "",
    submitted_date_vancouver: row?.submitted_date_vancouver || "",
    one_drive_backup_status: row?.one_drive_backup_status || "pending",
    backup_attempted_at: row?.backup_attempted_at || null,
    backup_error: row?.backup_error || null,
  };
}

function workerSubmitter(worker) {
  return {
    kind: "worker",
    id: worker.id,
    storagePrefix: worker.id,
    workerId: worker.id,
    name: worker.name,
    phone: worker.phone,
    username: worker.username,
    user_name: worker.username,
    company: worker.company,
  };
}

function staffSubmitter(staff) {
  const name = staffSubmitterName(staff);
  return {
    kind: "staff",
    id: staff.id,
    storagePrefix: `staff/${staff.id}`,
    workerId: null,
    name,
    phone: staff.phone || "",
    username: staff.username || staff.email || "staff",
    user_name: staff.username || staff.email || "staff",
    company: staffSubmitterCompany(staff, name),
  };
}

function staffSubmitterName(staff) {
  return String(staff?.display_name || staff?.username || staff?.email || "Staff").trim();
}

function staffSubmitterCompany(staff, name = staffSubmitterName(staff)) {
  return `Appia ${staffSubmitterRoleLabel(staff?.role)} (${name})`;
}

function staffSubmitterRoleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Staff";
}

async function withStaffSubmitterLabels(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const staffRows = rows.filter(shouldEnrichStaffSubmitter);
  if (!staffRows.length) return rows;

  const usernames = [...new Set(
    staffRows
      .map((row) => String(row.worker_username || "").trim().toLowerCase())
      .filter(Boolean),
  )];
  const profileByUsername = new Map();
  if (usernames.length) {
    const profiles = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .select("username, display_name, role, phone")
        .in("username", usernames),
      "Staff submitters could not be loaded.",
    );
    profiles.forEach((profile) => {
      profileByUsername.set(String(profile.username || "").trim().toLowerCase(), profile);
    });
  }

  return rows.map((row) => {
    if (!shouldEnrichStaffSubmitter(row)) return row;
    const username = String(row.worker_username || "").trim().toLowerCase();
    const profile = profileByUsername.get(username) || {};
    const name = staffSubmitterName({
      display_name: profile.display_name || row.worker_name,
      username: row.worker_username,
    });
    const company = shouldRewriteStaffSubmitterCompany(row)
      ? staffSubmitterCompany({ role: profile.role || legacyStaffRoleFromCompany(row.company) }, name)
      : row.company;
    return {
      ...row,
      company,
      worker_name: row.worker_name || name,
      worker_phone: row.worker_phone || profile.phone || "",
    };
  });
}

async function withCurrentFormLabels(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const formTypes = [...new Set(rows.map((row) => String(row?.form_type || "").trim()).filter(Boolean))];
  if (!formTypes.length) return rows;

  let templates = [];
  try {
    templates = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_templates")
        .select("form_type, label")
        .in("form_type", formTypes),
      "Form template labels could not be loaded.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return rows;
  }

  const labelByType = new Map(
    templates
      .map((template) => [String(template.form_type || "").trim(), cleanText(template.label || "", MAX_FORM_TEXT_LENGTH)])
      .filter(([type, label]) => type && label),
  );
  return rows.map((row) => ({
    ...row,
    form_current_label: labelByType.get(String(row?.form_type || "").trim()) || null,
  }));
}

function shouldEnrichStaffSubmitter(row) {
  if (row?.worker_id) return false;
  const company = String(row?.company || "").trim();
  return !company || /^Appia (Staff|Admin|Owner)(?:\s+\(.+\))?$/i.test(company);
}

function shouldRewriteStaffSubmitterCompany(row) {
  const company = String(row?.company || "").trim();
  return !company || /^Appia (Staff|Admin|Owner)$/i.test(company);
}

function legacyStaffRoleFromCompany(company) {
  const role = String(company || "").trim().toLowerCase().replace(/^appia\s+/, "");
  if (role === "owner" || role === "admin") return role;
  return "staff";
}

async function uploadTargetPayload(submitter, formType, file, storagePath, data) {
  await recordSubmissionUpload(submitter, formType, file, storagePath);
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

async function recordSubmissionUpload(submitter, formType, file, storagePath) {
  try {
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_uploads")
        .insert({
          worker_id: submitter.workerId,
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

function cleanSubmissionFilesForBody({ body, formData, submissionMode, storagePrefix }) {
  const files = [];
  if (submissionMode === "submit_file") {
    files.push(cleanSubmittedFile(body?.file, storagePrefix));
  }
  if (
    submissionMode === "fill_form" &&
    ["template_submission_v1", "toolbox_talk_v1", "site_inspection_v1"].includes(formData?.kind)
  ) {
    collectTemplateMediaUploadFiles(formData).forEach((file) => {
      files.push(cleanSubmittedFile(file, storagePrefix));
    });
  }
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.storagePath)) return false;
    seen.add(file.storagePath);
    return true;
  });
}

function submissionFileRecord(submissionId, file, now = new Date()) {
  return {
    id: crypto.randomUUID(),
    submission_id: submissionId,
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
  };
}

export async function createFileUploadTarget(worker, body) {
  return createSubmitterFileUploadTarget(workerSubmitter(worker), body);
}

export async function createStaffFileUploadTarget(staff, body) {
  return createSubmitterFileUploadTarget(staffSubmitter(staff), body);
}

async function createSubmitterFileUploadTarget(submitter, body) {
  const formType = await cleanWorkerFormType(body?.formType || body?.form_type);
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = `${submitter.storagePrefix}/${Date.now()}-${crypto
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
        return uploadTargetPayload(submitter, formType, file, storagePath, retry.data);
      }
      result.error = retry.error;
    }
    const error = new Error("Upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  return uploadTargetPayload(submitter, formType, file, storagePath, result.data);
}

export async function createWorkerSubmission(worker, body) {
  return createSubmitterSubmission(workerSubmitter(worker), body);
}

export async function createStaffSubmission(staff, body) {
  return createSubmitterSubmission(staffSubmitter(staff), body);
}

async function createSubmitterSubmission(submitter, body) {
  const formType = await cleanWorkerFormType(body?.formType || body?.form_type);
  const submissionMode = cleanSubmissionMode(body?.submissionMode || body?.submission_mode);
  const cleanedForm = await cleanSubmissionFormData(
    formType,
    submissionMode,
    body?.formData ?? body?.form_data,
    submitter,
  );
  const formData = cleanedForm.formData;
  const submittedFiles = cleanSubmissionFilesForBody({
    body,
    formData,
    submissionMode,
    storagePrefix: submitter.storagePrefix,
  });
  await verifySubmittedFiles(submittedFiles, submitter.storagePrefix);
  const notes = buildSubmissionNotes(formType, submissionMode, body?.notes, formData);
  const now = new Date();

  let inserted;
  try {
    inserted = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .insert({
          worker_id: submitter.workerId,
          worker_name: submitter.name,
          worker_phone: submitter.phone,
          worker_username: submitter.username,
          company: submitter.company,
          form_type: formType,
          submission_mode: submissionMode,
          notes,
          form_data: formData,
          form_template_version_id: cleanedForm.formTemplateVersionId,
          form_schema_snapshot: cleanedForm.formSchemaSnapshot || {},
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
    return createFallbackWorkerSubmission(submitter, {
      body,
      formType,
      submissionMode,
      notes,
      cleanedForm,
      now,
    });
  }

  if (submittedFiles.length) {
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("submission_files")
        .insert(submittedFiles.map((file) => ({
          submission_id: inserted.id,
          bucket: SUBMISSION_BUCKET,
          storage_path: file.storagePath,
          original_filename: file.originalFilename,
          mime_type: file.mimeType,
          size_bytes: file.sizeBytes,
          backup_status: "pending",
        }))),
      "Submission file could not be saved.",
    );
    await Promise.all(submittedFiles.map((file) => markUploadAttached(file.storagePath, inserted.id)));
  }

  if (submissionMode === "fill_form" && formData?.kind === "site_inspection_v1") {
    await createDraftActionItemsFromSiteInspection(inserted, formData);
  }
  if (
    submissionMode === "fill_form" &&
    ["template_submission_v1", "toolbox_talk_v1", "site_inspection_v1"].includes(formData?.kind)
  ) {
    await createDraftActionItemsFromTemplateActionRows(inserted, formData);
  }

  await backupSubmissionBestEffort(inserted.id);
  return getSubmissionById(inserted.id, { includeDeleted: true });
}

async function verifySubmittedFiles(files, storagePrefix) {
  await Promise.all(
    files.map((file) =>
      assertStoredObjectMatches({
        bucket: SUBMISSION_BUCKET,
        storagePath: file.storagePath,
        allowedPrefix: `${storagePrefix}/`,
        expectedSizeBytes: file.sizeBytes,
        expectedMimeType: file.mimeType,
        maxSizeBytes: MAX_FILE_SIZE_BYTES,
      }),
    ),
  );
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
  return (await withCurrentFormLabels(rows)).map(publicSubmission);
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
  const limit = clampStaffSubmissionsLimit(query.get("limit"));
  const offset = clampStaffSubmissionsOffset(query.get("offset"));

  const filterCompanyAfterEnrichment = company && /^Appia\s+/i.test(company);
  const filterPhoneAfterEnrichment = Boolean(phone);
  const paginateAfterEnrichment = Boolean(filterCompanyAfterEnrichment || filterPhoneAfterEnrichment);
  let paginateLocally = paginateAfterEnrichment;
  let dbQuery = getSupabaseServiceClient()
    .from("form_submissions")
    .select(STAFF_SUBMISSION_LIST_SELECT, paginateAfterEnrichment ? undefined : { count: "exact" })
    .is("deleted_by_worker_at", null)
    .is("deleted_by_staff_at", null)
    .is("app_purged_at", null);

  if (from) dbQuery = dbQuery.gte("submitted_date_vancouver", from);
  if (to) dbQuery = dbQuery.lte("submitted_date_vancouver", to);
  if (company && !filterCompanyAfterEnrichment) dbQuery = dbQuery.ilike("company", `%${escapeLike(company)}%`);
  if (name) dbQuery = dbQuery.ilike("worker_name", `%${escapeLike(name)}%`);
  if (isValidFormTypeSlug(formType)) dbQuery = dbQuery.eq("form_type", formType);
  if (["pending", "backed_up", "failed"].includes(backupStatus)) {
    dbQuery = dbQuery.eq("one_drive_backup_status", backupStatus);
  }

  let rows;
  let total = 0;
  try {
    const orderedQuery = dbQuery.order(sort, { ascending: dir === "asc" });
    const result = paginateAfterEnrichment
      ? await orderedQuery.limit(500)
      : await orderedQuery.range(offset, offset + limit - 1);
    if (result.error) {
      const error = new Error("Submissions could not be loaded.");
      error.cause = result.error;
      error.statusCode = isSupabaseMissingRelationError(result.error) ? 503 : 500;
      error.exposeMessage = isSupabaseMissingRelationError(result.error);
      throw error;
    }
    rows = result.data || [];
    total = Number(result.count ?? rows.length) || 0;
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    paginateLocally = true;
    rows = await listFallbackStaffSubmissions({
      from,
      to,
      company: filterCompanyAfterEnrichment ? "" : company,
      phone: "",
      name,
      formType,
      backupStatus,
      sort,
      dir,
    });
    total = rows.length;
  }
  rows = await withStaffSubmitterLabels(rows);
  rows = await withCurrentFormLabels(rows);
  if (filterCompanyAfterEnrichment) {
    rows = rows.filter((row) => textIncludes(row.company, company));
  }
  if (filterPhoneAfterEnrichment) {
    rows = rows.filter((row) => textIncludes(row.worker_phone, phone));
  }
  if (paginateLocally) {
    total = rows.length;
    rows = rows.slice(offset, offset + limit);
  }

  return {
    rows: rows.map(publicSubmissionSummary),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
    sort,
    dir,
  };
}

export async function listStaffSubmissionFilters() {
  let companyOptions = [];
  let formOptions = [];

  try {
    const companyRows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_submissions")
        .select("worker_id, worker_name, worker_username, company")
        .is("deleted_by_worker_at", null)
        .is("deleted_by_staff_at", null)
        .is("app_purged_at", null)
        .order("company", { ascending: true })
        .limit(1000),
      "Submission companies could not be loaded.",
    );
    companyOptions = submittedCompanyOptions(await withStaffSubmitterLabels(companyRows));
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    companyOptions = submittedCompanyOptions(
      await withStaffSubmitterLabels(
        (await listFallbackSubmissions())
          .filter((row) => !row.deleted_by_worker_at && !row.deleted_by_staff_at && !row.app_purged_at),
      ),
    );
  }

  try {
    formOptions = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_templates")
        .select("form_type, label")
        .is("archived_at", null)
        .order("display_order", { ascending: true })
        .order("label", { ascending: true }),
      "Form template filters could not be loaded.",
    )
      .map((row) => ({
        id: row.form_type,
        label: row.label,
      }))
      .filter((row) => row.id && row.label);
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    formOptions = [];
  }

  return { companyOptions, formOptions };
}

function clampStaffSubmissionsLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_STAFF_SUBMISSIONS_LIMIT;
  return Math.min(MAX_STAFF_SUBMISSIONS_LIMIT, Math.max(1, Math.trunc(parsed)));
}

function clampStaffSubmissionsOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
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
  return publicSubmission((await withCurrentFormLabels(await withStaffSubmitterLabels([row])))[0]);
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

export async function appendStaffSubmissionSignoff(staff, submissionId, body = {}) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const signature = cleanStaffSignatureDataUrl(
    body.signatureDataUrl || body.signature_data_url || body.signature,
  );
  const comments = cleanText(body.comments || body.comment || "", MAX_FORM_LONG_TEXT_LENGTH);
  const signedAt = new Date().toISOString();
  const signoff = {
    id: crypto.randomUUID(),
    staff_id: staff?.id || null,
    staff_name: cleanText(staff?.display_name || staff?.username || "Staff", MAX_FORM_TEXT_LENGTH),
    staff_username: cleanText(staff?.username || "", MAX_FORM_TEXT_LENGTH),
    signature_data_url: signature,
    comments,
    signed_at: signedAt,
  };

  let existing;
  try {
    existing = await getSubmissionById(id);
    return publicSubmission(
      throwIfSupabaseError(
        await getSupabaseServiceClient()
          .from("form_submissions")
          .update({
            staff_signoffs: [...normalizeStaffSignoffs(existing.staff_signoffs), signoff],
            staff_reviewed_at: signedAt,
            staff_reviewed_by_staff_id: staff?.id || null,
          })
          .eq("id", id)
          .is("deleted_by_worker_at", null)
          .is("deleted_by_staff_at", null)
          .is("app_purged_at", null)
          .select(SUBMISSION_WITH_FILES_SELECT)
          .single(),
        "Staff sign-off could not be saved.",
      ),
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return appendFallbackStaffSubmissionSignoff(staff, id, signoff);
  }
}

export async function updateStaffSubmission(staff, submissionId, body = {}) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const existing = await getSubmissionById(id);
  const updated = cleanStaffSubmissionEdit(existing, body);

  try {
    return publicSubmission(
      throwIfSupabaseError(
        await getSupabaseServiceClient()
          .from("form_submissions")
          .update({
            notes: updated.notes,
            form_data: updated.form_data,
            form_template_version_id: updated.form_template_version_id,
            form_schema_snapshot: updated.form_schema_snapshot,
            one_drive_backup_status: "pending",
            one_drive_item_id: null,
            one_drive_item_name: null,
            one_drive_web_url: null,
            one_drive_path: null,
            backup_attempted_at: null,
            backup_error: null,
          })
          .eq("id", id)
          .is("deleted_by_worker_at", null)
          .is("deleted_by_staff_at", null)
          .is("app_purged_at", null)
          .select(SUBMISSION_WITH_FILES_SELECT)
          .single(),
        "Submission edit could not be saved.",
      ),
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
    return updateFallbackStaffSubmission(id, updated);
  }
}

export async function emailStaffSubmissionPdf(staff, submissionId, body = {}) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const recipientEmail = cleanStaffEmail(staff?.email);
  const submission = await getSubmissionById(id, { includeDeleted: true });
  assertSubmissionEmailConfig();
  const attachment = await createSubmissionPdfAttachment(submission, body);

  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const from = getRequiredEnv("REPORT_FROM_EMAIL");
  const subject = `${submissionEmailTitle(submission)} PDF`;
  const { data, error } = await resend.emails.send({
    from,
    to: [recipientEmail],
    subject,
    html: submissionPdfEmailHtml(submission, staff),
    attachments: [
      {
        filename: attachment.fileName,
        content: attachment.content,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) throw createSubmissionEmailSendError(error);

  return {
    emailId: data?.id || null,
    fileName: attachment.fileName,
    recipientEmail,
    sizeBytes: attachment.sizeBytes,
  };
}

export async function createStaffSubmissionPdf(submissionId) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const submission = await getSubmissionById(id, { includeDeleted: true });
  return await renderSubmittedFormPdf(submission);
}

export async function createWorkerSubmissionPdf(worker, submissionId) {
  const id = cleanUuid(submissionId, "Submission id is not valid.");
  const submission = await getSubmissionById(id);
  if (submission.worker_id !== worker.id) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  return await renderSubmittedFormPdf(submission);
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
          formTemplateVersionId: submission.form_template_version_id || null,
          formSchemaSnapshot: submission.form_schema_snapshot || {},
          staffSignoffs: normalizeStaffSignoffs(submission.staff_signoffs),
          staffReviewedAt: submission.staff_reviewed_at || null,
          staffReviewedByStaffId: submission.staff_reviewed_by_staff_id || null,
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

async function createFallbackWorkerSubmission(submitter, { body, formType, submissionMode, notes, cleanedForm, now }) {
  const nextCleanedForm = cleanedForm || await cleanSubmissionFormData(
    formType,
    submissionMode,
    body?.formData ?? body?.form_data,
    submitter,
  );
  const formData = nextCleanedForm.formData || {};
  const submittedFiles = cleanSubmissionFilesForBody({
    body,
    formData,
    submissionMode,
    storagePrefix: submitter.storagePrefix,
  });
  const submission = {
    id: crypto.randomUUID(),
    worker_id: submitter.workerId,
    worker_name: submitter.name,
    worker_phone: submitter.phone,
    worker_username: submitter.username,
    company: submitter.company,
    form_type: formType,
    submission_mode: submissionMode,
    notes,
    form_data: formData,
    form_template_version_id: nextCleanedForm.formTemplateVersionId || null,
    form_schema_snapshot: nextCleanedForm.formSchemaSnapshot || {},
    staff_signoffs: [],
    staff_reviewed_at: null,
    staff_reviewed_by_staff_id: null,
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

  if (submittedFiles.length) {
    submission.files = submittedFiles.map((file) => submissionFileRecord(submission.id, file, now));
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
    .filter((row) => !formType || row.form_type === formType)
    .filter((row) =>
      !["pending", "backed_up", "failed"].includes(backupStatus) ||
      row.one_drive_backup_status === backupStatus
    )
    .sort((a, b) => compareFallbackSubmissions(a, b, sort, dir));
}

function submittedCompanyOptions(rows) {
  return [...new Set(
    rows
      .map((row) => String(row?.company || "").trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

async function getFallbackSubmissionById(id, { includeDeleted = false } = {}) {
  const row = normalizeFallbackSubmission(await getFallbackRecord("submission", id));
  if (!row || row.app_purged_at) return null;
  if (!includeDeleted && (row.deleted_by_worker_at || row.deleted_by_staff_at)) return null;
  return row;
}

async function appendFallbackStaffSubmissionSignoff(staff, id, signoff) {
  const row = await getFallbackSubmissionById(id);
  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  row.staff_signoffs = [...normalizeStaffSignoffs(row.staff_signoffs), signoff];
  row.staff_reviewed_at = signoff.signed_at;
  row.staff_reviewed_by_staff_id = staff?.id || null;
  return publicSubmission(await saveFallbackSubmission(row));
}

async function updateFallbackStaffSubmission(id, updated) {
  const row = await getFallbackSubmissionById(id);
  if (!row) {
    const error = new Error("Submission was not found.");
    error.statusCode = 404;
    throw error;
  }
  Object.assign(row, {
    notes: updated.notes,
    form_data: updated.form_data,
    form_template_version_id: updated.form_template_version_id,
    form_schema_snapshot: updated.form_schema_snapshot,
    one_drive_backup_status: "pending",
    one_drive_item_id: null,
    one_drive_item_name: null,
    one_drive_web_url: null,
    one_drive_path: null,
    backup_attempted_at: null,
    backup_error: null,
  });
  return publicSubmission(await saveFallbackSubmission(row));
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
            formTemplateVersionId: submission.form_template_version_id || null,
            formSchemaSnapshot: submission.form_schema_snapshot || {},
            staffSignoffs: normalizeStaffSignoffs(submission.staff_signoffs),
            staffReviewedAt: submission.staff_reviewed_at || null,
            staffReviewedByStaffId: submission.staff_reviewed_by_staff_id || null,
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
    form_template_version_id: row.form_template_version_id || null,
    form_schema_snapshot: row.form_schema_snapshot && typeof row.form_schema_snapshot === "object" ? row.form_schema_snapshot : {},
    staff_signoffs: normalizeStaffSignoffs(row.staff_signoffs),
    staff_reviewed_at: row.staff_reviewed_at || null,
    staff_reviewed_by_staff_id: row.staff_reviewed_by_staff_id || null,
    deleted_by_staff_at: row.deleted_by_staff_at || null,
    deleted_by_staff_id: row.deleted_by_staff_id || null,
    files,
    submission_files: files,
  };
}

function normalizeStaffSignoffs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const signature = typeof item?.signature_data_url === "string" ? item.signature_data_url.trim() : "";
      if (!STAFF_SIGNATURE_DATA_URL_PATTERN.test(signature)) return null;
      return {
        id: cleanText(item.id || crypto.randomUUID(), 80),
        staff_id: item.staff_id || null,
        staff_name: cleanText(item.staff_name || item.staff_username || "Staff", MAX_FORM_TEXT_LENGTH),
        staff_username: cleanText(item.staff_username || "", MAX_FORM_TEXT_LENGTH),
        signature_data_url: signature,
        comments: cleanText(item.comments || "", MAX_FORM_LONG_TEXT_LENGTH),
        signed_at: cleanText(item.signed_at || "", 40),
      };
    })
    .filter(Boolean);
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
  if (!isValidFormTypeSlug(formType)) {
    const error = new Error("Form type is not valid.");
    error.statusCode = 400;
    throw error;
  }
  return formType;
}

async function cleanWorkerFormType(value) {
  const formType = cleanFormType(value);
  if (CUSTOM_FORM_TYPES.includes(formType)) return formType;
  await getPublishedWorkerFormTemplate(formType);
  return formType;
}

function isValidFormTypeSlug(value) {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(String(value || "").trim());
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

function cleanSubmittedFile(file, storagePrefix) {
  const metadata = cleanFileMetadata(file);
  const storagePath = String(file?.storagePath || file?.storage_path || "").trim();
  if (!storagePrefix || !storagePath.startsWith(`${storagePrefix}/`)) {
    const error = new Error("Uploaded file path is not valid for this submitter.");
    error.statusCode = 400;
    throw error;
  }
  return { ...metadata, storagePath };
}

async function cleanSubmissionFormData(formType, submissionMode, value, worker) {
  if (submissionMode !== "fill_form") {
    return {
      formData: {},
      formTemplateVersionId: null,
      formSchemaSnapshot: {},
    };
  }
  if (formType === "toolbox_talk") {
    let template = null;
    try {
      template = await getPublishedWorkerFormTemplate("toolbox_talk");
    } catch {
      template = null;
    }
    const version = template?.publishedVersion || null;
    const toolboxConfig = await getToolboxTalkConfig("toolbox_talk", template);
    const generic = version?.schema
      ? cleanCustomGenericSubmissionFields({
          schema: version.schema,
          rawFormData: value,
          worker,
          consumedFieldPredicate: isToolboxTalkConsumedTemplateField,
          formType: "toolbox_talk",
        })
      : { answers: {}, actionItemBlocks: {}, schema: {} };
    const formData = cleanToolboxTalkFormData(value, worker, toolboxConfig);
    return {
      formData: {
        ...formData,
        templateVersionId: version?.id || "",
        templateVersionNumber: version?.version_number || null,
        templateTitle: version?.schema?.title || template?.label || "Toolbox Talk",
        schemaSnapshot: version?.schema || {},
        answers: generic.answers,
        actionItemBlocks: generic.actionItemBlocks,
      },
      formTemplateVersionId: version?.id || null,
      formSchemaSnapshot: version?.schema || {},
    };
  }
  if (formType === "site_inspection") {
    let template = null;
    try {
      template = await getPublishedWorkerFormTemplate(formType);
    } catch {
      template = null;
    }
    const version = template?.publishedVersion || null;
    const siteInspectionConfig = await getSiteInspectionConfig(formType, template);
    const generic = version?.schema
      ? cleanCustomGenericSubmissionFields({
          schema: version.schema,
          rawFormData: value,
          worker,
          consumedFieldPredicate: isSiteInspectionConsumedTemplateField,
          formType,
        })
      : { answers: {}, actionItemBlocks: {}, schema: {} };
    const formData = cleanSiteInspectionFormData(value, worker, siteInspectionConfig);
    return {
      formData: {
        ...formData,
        templateVersionId: version?.id || "",
        templateVersionNumber: version?.version_number || null,
        templateTitle: version?.schema?.title || template?.label || "Site Inspection",
        schemaSnapshot: version?.schema || {},
        answers: generic.answers,
        actionItemBlocks: generic.actionItemBlocks,
      },
      formTemplateVersionId: version?.id || null,
      formSchemaSnapshot: version?.schema || {},
    };
  }
  const toolboxTalkTemplateSubmission = await validateToolboxTalkTemplateSubmissionFormData({
    formType,
    rawFormData: value,
    worker,
  });
  if (toolboxTalkTemplateSubmission) return toolboxTalkTemplateSubmission;
  const siteInspectionTemplateSubmission = await validateSiteInspectionTemplateSubmissionFormData({
    formType,
    rawFormData: value,
    worker,
  });
  if (siteInspectionTemplateSubmission) return siteInspectionTemplateSubmission;
  const templateSubmission = await validateTemplateSubmissionFormData({
    formType,
    rawFormData: value,
    worker,
  });
  if (templateSubmission) return templateSubmission;
  return {
    formData: {},
    formTemplateVersionId: null,
    formSchemaSnapshot: {},
  };
}

function cleanStaffSubmissionEdit(submission, body = {}) {
  if (submission?.submission_mode !== "fill_form" || submission?.form_data?.kind !== "template_submission_v1") {
    throwBadRequest("This submission type is not editable yet.");
  }

  const schema = cleanSubmissionEditSchema(submission);
  const formType = cleanText(submission.form_type, 120);
  const worker = {
    id: submission.worker_id || null,
    name: submission.worker_name || "",
    phone: submission.worker_phone || "",
    username: submission.worker_username || "",
    user_name: submission.worker_username || "",
    company: submission.company || "",
  };
  const source = body.formData ?? body.form_data ?? body;
  const rawFormData = source?.kind === "template_submission_v1"
    ? source
    : {
        answers: source?.answers || {},
        actionItemBlocks: source?.actionItemBlocks || source?.action_item_blocks || {},
      };
  const cleaned = cleanTemplateSubmissionFieldsForSchema(schema, rawFormData, worker);
  const current = submission.form_data || {};
  const formData = {
    ...current,
    kind: "template_submission_v1",
    version: current.version || 1,
    formType,
    templateVersionId: current.templateVersionId || submission.form_template_version_id || "",
    templateVersionNumber: current.templateVersionNumber || null,
    templateTitle: schema.title || current.templateTitle || humanizeFormType(formType),
    schemaSnapshot: schema,
    answers: cleaned.answers,
    actionItemBlocks: cleaned.actionItemBlocks,
  };

  return {
    notes: buildSubmissionNotes(formType, "fill_form", "", formData),
    form_data: formData,
    form_template_version_id: submission.form_template_version_id || current.templateVersionId || null,
    form_schema_snapshot: schema,
  };
}

function cleanSubmissionEditSchema(submission) {
  const rawSchema = submission?.form_schema_snapshot && Object.keys(submission.form_schema_snapshot).length
    ? submission.form_schema_snapshot
    : submission?.form_data?.schemaSnapshot || {};
  const schema = rawSchema && typeof rawSchema === "object" && !Array.isArray(rawSchema)
    ? JSON.parse(JSON.stringify(rawSchema))
    : {};
  const sections = Array.isArray(schema.sections) ? schema.sections : [];
  if (!sections.length) throwBadRequest("This submission does not include an editable form schema.");
  return {
    ...schema,
    formType: schema.formType || submission?.form_type || "",
  };
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

  if (submissionMode === "fill_form" && formData?.kind === "toolbox_talk_v1") {
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
      formData.templateTitle || "Toolbox Talk",
      header.projectName ? `Project: ${header.projectName}` : "",
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

  if (submissionMode === "fill_form" && formData?.kind === "site_inspection_v1") {
    const header = formData.header || {};
    const deficiencyCount = (formData.deficiencies || []).length;
    return [
      formData.templateTitle || "Site Inspection",
      header.project ? `Project: ${header.project}` : "",
      header.areaInspected ? `Area: ${header.areaInspected}` : "",
      deficiencyCount
        ? `${deficiencyCount} deficienc${deficiencyCount === 1 ? "y" : "ies"}`
        : "No deficiencies found",
    ]
      .filter(Boolean)
      .join(" / ")
      .slice(0, MAX_FORM_LONG_TEXT_LENGTH);
  }

  if (submissionMode === "fill_form" && formData?.kind === "template_submission_v1") {
    return buildTemplateSubmissionNotes(formType, formData);
  }

  return String(value || "").trim().slice(0, MAX_FORM_LONG_TEXT_LENGTH);
}

function createDefaultToolboxTalkConfig() {
  return {
    enabledBlocks: [...TOOLBOX_TALK_SPECIAL_BLOCK_ORDER],
    blockSettings: {
      toolbox_incident_review: {},
      toolbox_safety_concerns: {},
    },
    headerFields: TOOLBOX_TALK_HEADER_FIELD_CONFIGS.map((field) => ({ ...field })),
  };
}

function slugifyToolboxTemplateId(value) {
  return cleanText(value, 160)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getTemplateSettingValue(settings, key) {
  const source = settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings
    : {};
  const direct = cleanText(source[key], 80);
  if (direct) return direct;
  const normalizedKey = slugifyToolboxTemplateId(key);
  return normalizedKey ? cleanText(source[normalizedKey], 80) : "";
}

function getTemplateSettingRaw(settings, key) {
  const source = settings && typeof settings === "object" && !Array.isArray(settings)
    ? settings
    : {};
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  const normalizedKey = slugifyToolboxTemplateId(key);
  if (normalizedKey && Object.prototype.hasOwnProperty.call(source, normalizedKey)) return source[normalizedKey];
  const target = String(key || "").toLowerCase();
  const match = Object.keys(source).find((item) => item.toLowerCase() === target);
  return match ? source[match] : undefined;
}

function cleanPlainSettings(settings) {
  return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
}

function normalizeToolboxCompositeSettings(settings = {}, blockType = "") {
  const config = TOOLBOX_COMPOSITE_BLOCK_CONFIGS[blockType];
  if (!config) return [];
  const source = getTemplateSettingRaw(settings, config.settingsKey);
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const rawFields = Array.isArray(raw.subfields) ? raw.subfields : Array.isArray(raw.fields) ? raw.fields : [];
  const rawFieldMap = new Map();
  rawFields.forEach((field) => {
    const key = cleanText(field?.key, 80);
    if (key && !rawFieldMap.has(key)) rawFieldMap.set(key, field);
  });
  return config.fieldConfigs.map((field) => {
    const override = rawFieldMap.get(field.key) || {};
    return {
      ...field,
      visible: override.visible !== false,
    };
  });
}

function visibleToolboxCompositeKeys(settings, blockType) {
  return new Set(normalizeToolboxCompositeSettings(settings, blockType)
    .filter((field) => field.visible !== false)
    .map((field) => field.key));
}

function getToolboxTalkHeaderFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "toolboxHeaderField");
  if (explicit && TOOLBOX_TALK_HEADER_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = TOOLBOX_TALK_HEADER_FIELD_ALIASES[slugifyToolboxTemplateId(field?.id || "")];
  if (idKey) return idKey;
  return TOOLBOX_TALK_HEADER_FIELD_ALIASES[slugifyToolboxTemplateId(field?.label || "")] || "";
}

async function getToolboxTalkConfig(formType = "toolbox_talk", templateOverride = null) {
  try {
    const template = templateOverride || await getPublishedWorkerFormTemplate(formType);
    const config = createDefaultToolboxTalkConfig();
    const enabledBlocks = [];
    const blockSettings = {};
    const headerFields = [];
    const sections = Array.isArray(template?.publishedVersion?.schema?.sections)
      ? template.publishedVersion.schema.sections
      : [];
    if (!sections.length) return config;
    sections.forEach((section) => {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      fields.forEach((field) => {
        if (
          TOOLBOX_TALK_SPECIAL_BLOCK_TYPES.has(field?.type) &&
          !enabledBlocks.includes(field.type)
        ) {
          enabledBlocks.push(field.type);
        }
        if (TOOLBOX_TALK_SPECIAL_BLOCK_TYPES.has(field?.type)) {
          blockSettings[field.type] = {
            ...cleanPlainSettings(section?.settings),
            ...cleanPlainSettings(field?.settings),
          };
        }
      });
    });
    return {
      enabledBlocks,
      blockSettings: {
        ...config.blockSettings,
        ...blockSettings,
      },
      headerFields,
    };
  } catch {
    return createDefaultToolboxTalkConfig();
  }
}

function createDefaultSiteInspectionConfig() {
  return {
    enabledBlocks: ["site_deficiencies"],
    blockSettings: {
      site_deficiencies: {},
    },
    headerFields: SITE_INSPECTION_HEADER_FIELD_CONFIGS.map((field) => ({ ...field })),
    observationFields: SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.map((field) => ({ ...field })),
  };
}

function getSiteInspectionHeaderFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "siteInspectionHeaderField");
  if (explicit && SITE_INSPECTION_HEADER_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = SITE_INSPECTION_HEADER_FIELD_ALIASES[slugifyToolboxTemplateId(field?.id || "")];
  if (idKey) return idKey;
  return SITE_INSPECTION_HEADER_FIELD_ALIASES[slugifyToolboxTemplateId(field?.label || "")] || "";
}

function getSiteInspectionObservationFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "siteInspectionObservationField");
  if (explicit && SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = SITE_INSPECTION_OBSERVATION_FIELD_ALIASES[slugifyToolboxTemplateId(field?.id || "")];
  if (idKey) return idKey;
  return SITE_INSPECTION_OBSERVATION_FIELD_ALIASES[slugifyToolboxTemplateId(field?.label || "")] || "";
}

function isToolboxTalkTemplateSchema(schema, template = {}) {
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  if (schema?.formType === "toolbox_talk" || template?.form_type === "toolbox_talk") return true;
  const fields = sections.flatMap((section) => Array.isArray(section?.fields) ? section.fields : []);
  return fields.some((field) => TOOLBOX_TALK_SPECIAL_BLOCK_TYPES.has(field?.type));
}

function isSiteInspectionTemplateSchema(schema, template = {}) {
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  if (schema?.formType === "site_inspection" || template?.form_type === "site_inspection") return true;
  const fields = sections.flatMap((section) => Array.isArray(section?.fields) ? section.fields : []);
  return fields.some((field) =>
    field?.type === "site_deficiencies" ||
    Boolean(getTemplateSettingValue(field?.settings, "siteInspectionHeaderField")) ||
    Boolean(getTemplateSettingValue(field?.settings, "siteInspectionObservationField")),
  );
}

function isToolboxTalkConsumedTemplateField(field) {
  if (!field) return false;
  return TOOLBOX_TALK_SPECIAL_BLOCK_TYPES.has(field.type);
}

function isSiteInspectionConsumedTemplateField(field) {
  if (!field) return false;
  if (field.type === "site_deficiencies") return true;
  return Boolean(getSiteInspectionHeaderFieldKey(field) || getSiteInspectionObservationFieldKey(field));
}

function getCustomGenericTemplateSchema(schema, consumedFieldPredicate, formType = "") {
  const source = schema && typeof schema === "object" && !Array.isArray(schema) ? schema : {};
  const sections = (Array.isArray(source.sections) ? source.sections : [])
    .map((section, sectionIndex) => ({
      id: cleanText(section?.id || `generic_section_${sectionIndex + 1}`, 160),
      title: cleanText(section?.title || `Section ${sectionIndex + 1}`, MAX_FORM_TEXT_LENGTH),
      description: cleanText(section?.description, MAX_FORM_TEXT_LENGTH),
      settings: cleanPlainSettings(section?.settings),
      fields: (Array.isArray(section?.fields) ? section.fields : [])
        .filter((field) => !consumedFieldPredicate(field)),
    }))
    .filter((section) => section.fields.length);
  return {
    schemaVersion: source.schemaVersion || 1,
    formType: cleanText(source.formType || formType, 80),
    title: cleanText(source.title, MAX_FORM_TEXT_LENGTH),
    description: cleanText(source.description, MAX_FORM_TEXT_LENGTH),
    sections,
  };
}

function cleanCustomGenericSubmissionFields({ schema, rawFormData, worker, consumedFieldPredicate, formType }) {
  const genericSchema = getCustomGenericTemplateSchema(schema, consumedFieldPredicate, formType);
  const cleaned = cleanTemplateSubmissionFieldsForSchema(genericSchema, rawFormData || {}, worker);
  return {
    ...cleaned,
    schema: genericSchema,
  };
}

async function validateToolboxTalkTemplateSubmissionFormData({ formType, rawFormData, worker }) {
  const template = await getPublishedWorkerFormTemplate(formType);
  if (template.renderer_type !== "template") return null;
  const version = template.publishedVersion;
  if (!version || !isToolboxTalkTemplateSchema(version.schema, template)) return null;
  const config = await getToolboxTalkConfig(formType, template);
  const generic = cleanCustomGenericSubmissionFields({
    schema: version.schema,
    rawFormData,
    worker,
    consumedFieldPredicate: isToolboxTalkConsumedTemplateField,
    formType,
  });
  const formData = cleanToolboxTalkFormData(rawFormData, worker, config);
  return {
    formData: {
      ...formData,
      templateVersionId: version.id,
      templateVersionNumber: version.version_number,
      templateTitle: version.schema?.title || template.label,
      schemaSnapshot: version.schema || {},
      answers: generic.answers,
      actionItemBlocks: generic.actionItemBlocks,
    },
    formTemplateVersionId: version.id,
    formSchemaSnapshot: version.schema || {},
  };
}

async function getSiteInspectionConfig(formType = "site_inspection", templateOverride = null) {
  try {
    const template = templateOverride || await getPublishedWorkerFormTemplate(formType);
    const config = createDefaultSiteInspectionConfig();
    const enabledBlocks = [];
    const blockSettings = {};
    const headerFields = [];
    const observationFields = [];
    const sections = Array.isArray(template?.publishedVersion?.schema?.sections)
      ? template.publishedVersion.schema.sections
      : [];
    if (!sections.length) return config;

    sections.forEach((section) => {
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      fields.forEach((field) => {
        if (field?.type === "site_deficiencies") {
          if (!enabledBlocks.includes(field.type)) enabledBlocks.push(field.type);
          blockSettings.site_deficiencies = {
            ...cleanPlainSettings(section?.settings),
            ...cleanPlainSettings(field?.settings),
          };
          return;
        }

        const headerKey = getSiteInspectionHeaderFieldKey(field);
        if (headerKey) {
          const base = SITE_INSPECTION_HEADER_FIELD_CONFIGS.find((item) => item.key === headerKey);
          if (base && !headerFields.some((item) => item.key === headerKey)) {
            headerFields.push({
              ...base,
              id: cleanText(field?.id || base.id, 160),
              label: cleanText(field?.label || base.label, MAX_FORM_TEXT_LENGTH),
              required: Boolean(field?.required),
            });
          }
          return;
        }

        const observationKey = getSiteInspectionObservationFieldKey(field);
        if (observationKey) {
          const base = SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.find((item) => item.key === observationKey);
          if (base && !observationFields.some((item) => item.key === observationKey)) {
            observationFields.push({
              ...base,
              id: cleanText(field?.id || base.id, 160),
              label: cleanText(field?.label || base.label, MAX_FORM_TEXT_LENGTH),
              required: Boolean(field?.required),
            });
          }
        }
      });
    });

    return {
      enabledBlocks,
      blockSettings,
      headerFields,
      observationFields,
    };
  } catch {
    return createDefaultSiteInspectionConfig();
  }
}

async function validateSiteInspectionTemplateSubmissionFormData({ formType, rawFormData, worker }) {
  const template = await getPublishedWorkerFormTemplate(formType);
  if (template.renderer_type !== "template") return null;
  const version = template.publishedVersion;
  if (!version || !isSiteInspectionTemplateSchema(version.schema, template)) return null;
  const config = await getSiteInspectionConfig(formType, template);
  const generic = cleanCustomGenericSubmissionFields({
    schema: version.schema,
    rawFormData,
    worker,
    consumedFieldPredicate: isSiteInspectionConsumedTemplateField,
    formType,
  });
  const formData = cleanSiteInspectionFormData(rawFormData, worker, config);
  return {
    formData: {
      ...formData,
      templateVersionId: version.id,
      templateVersionNumber: version.version_number,
      templateTitle: version.schema?.title || template.label,
      schemaSnapshot: version.schema || {},
      answers: generic.answers,
      actionItemBlocks: generic.actionItemBlocks,
    },
    formTemplateVersionId: version.id,
    formSchemaSnapshot: version.schema || {},
  };
}

function cleanToolboxIncidentReview(incidentInput, settings) {
  const source = incidentInput && typeof incidentInput === "object" && !Array.isArray(incidentInput)
    ? incidentInput
    : {};
  const visible = visibleToolboxCompositeKeys(settings, "toolbox_incident_review");
  const cleaned = {
    firstAidCount: visible.has("firstAidCount") ? cleanOptionalCount(source.firstAidCount) : "",
    medicalAidCount: visible.has("medicalAidCount") ? cleanOptionalCount(source.medicalAidCount) : "",
    nearMissReviewed: visible.has("nearMissReviewed")
      ? cleanChoice(source.nearMissReviewed, ["", "yes", "no"], "Near miss review")
      : "",
    nearMissDescription: visible.has("nearMissDescription")
      ? cleanText(source.nearMissDescription, MAX_FORM_LONG_TEXT_LENGTH)
      : "",
    lessonsLearned: visible.has("lessonsLearned")
      ? cleanText(source.lessonsLearned, MAX_FORM_LONG_TEXT_LENGTH)
      : "",
  };
  if (cleaned.nearMissReviewed !== "yes") {
    cleaned.nearMissDescription = "";
  }
  return cleaned;
}

function cleanToolboxSafetyConcern(row, settings) {
  const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
  const visible = visibleToolboxCompositeKeys(settings, "toolbox_safety_concerns");
  return {
    concern: visible.has("concern") ? cleanText(source.concern, MAX_FORM_TEXT_LENGTH) : "",
    actionToTake: visible.has("actionToTake")
      ? cleanText(source.actionToTake ?? source.action, MAX_FORM_TEXT_LENGTH)
      : "",
    dateTaken: visible.has("dateTaken") ? cleanOptionalDate(source.dateTaken) : "",
  };
}

function cleanToolboxTalkFormData(
  value,
  worker,
  toolboxConfig = createDefaultToolboxTalkConfig(),
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwBadRequest("Toolbox talk form data is required.");
  }

  const config = Array.isArray(toolboxConfig)
    ? {
        enabledBlocks: toolboxConfig,
        headerFields: toolboxConfig.includes("toolbox_meeting_info")
          ? TOOLBOX_TALK_HEADER_FIELD_CONFIGS
          : [],
      }
    : toolboxConfig || createDefaultToolboxTalkConfig();
  const enabled = new Set(
    Array.isArray(config.enabledBlocks) && config.enabledBlocks.length
      ? config.enabledBlocks
      : createDefaultToolboxTalkConfig().enabledBlocks,
  );
  const headerFields = Array.isArray(config.headerFields) ? config.headerFields : [];
  const headerInput = value.header || {};
  const requiresMeetingInfo = enabled.has("toolbox_meeting_info");
  const headerRequired = (key) =>
    requiresMeetingInfo || headerFields.some((field) => field.key === key && field.required);
  const cleanHeaderText = (key, label, fallback = "") =>
    headerRequired(key)
      ? requireText(headerInput[key] || fallback, label)
      : cleanText(headerInput[key] || fallback, MAX_FORM_TEXT_LENGTH);
  const cleanHeaderDate = (key, label) =>
    headerRequired(key)
      ? cleanDate(headerInput[key], label)
      : cleanOptionalDate(headerInput[key], label);
  const cleanHeaderTime = (key, label) =>
    headerRequired(key)
      ? cleanTime(headerInput[key], label)
      : cleanText(headerInput[key], 20);
  const header = {
    projectName: cleanHeaderText("projectName", "Project name"),
    address: cleanHeaderText("address", "Address"),
    date: cleanHeaderDate("date", "Date"),
    time: cleanHeaderTime("time", "Time"),
    presenter: cleanHeaderText("presenter", "Presenter", worker?.name),
    supervisor: cleanHeaderText("supervisor", "Supervisor"),
  };

  const selectedTopics = cleanSelectedToolboxTopics(value.topics?.selected);
  const otherTopics = cleanText(value.topics?.other || "", MAX_FORM_LONG_TEXT_LENGTH);
  if (enabled.has("toolbox_topics") && !selectedTopics.length && !otherTopics) {
    throwBadRequest("Select at least one topic or enter an additional topic.");
  }

  const incidentReview = cleanToolboxIncidentReview(
    value.incidentReview,
    config.blockSettings?.toolbox_incident_review,
  );

  const safetyConcerns = cleanRows(value.safetyConcerns, (row) =>
    cleanToolboxSafetyConcern(row, config.blockSettings?.toolbox_safety_concerns),
  ).filter((row) => row.concern || row.actionToTake || row.dateTaken);

  const attendance = cleanToolboxAttendanceRows(value.attendance);
  if (enabled.has("toolbox_attendance") && !attendance.length) {
    throwBadRequest("Add at least one attendee.");
  }

  const confirmationInput = value.confirmation || {};
  if (enabled.has("toolbox_final_confirmation") && confirmationInput.confirmed !== true) {
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
    incidentReview,
    safetyConcerns,
    attendance,
    additionalComments: cleanText(value.additionalComments, MAX_FORM_LONG_TEXT_LENGTH),
    confirmation: {
      name: enabled.has("toolbox_final_confirmation")
        ? requireText(confirmationInput.name, "Presenter confirmation name")
        : cleanText(confirmationInput.name, MAX_FORM_TEXT_LENGTH),
      date: enabled.has("toolbox_final_confirmation")
        ? cleanDate(confirmationInput.date, "Confirmation date")
        : cleanOptionalDate(confirmationInput.date, "Confirmation date"),
      confirmed: confirmationInput.confirmed === true,
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

function cleanSiteInspectionFormData(
  value,
  worker,
  siteInspectionConfig = createDefaultSiteInspectionConfig(),
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throwBadRequest("Site inspection form data is required.");
  }

  const config = siteInspectionConfig || createDefaultSiteInspectionConfig();
  const enabled = new Set(Array.isArray(config.enabledBlocks) ? config.enabledBlocks : []);
  const deficiencySettings = normalizeActionItemRowsSettings(config.blockSettings?.site_deficiencies);
  const headerFields = Array.isArray(config.headerFields) ? config.headerFields : [];
  const observationFields = Array.isArray(config.observationFields) ? config.observationFields : [];
  const headerInput = value.header || {};
  const headerField = (key) =>
    headerFields.find((field) => field.key === key)
      || SITE_INSPECTION_HEADER_FIELD_CONFIGS.find((field) => field.key === key)
      || { key, label: key, required: false };
  const headerRequired = (key) => headerFields.some((field) => field.key === key && field.required);
  const headerLabel = (key) => headerField(key).label || key;
  const headerRaw = (key) => {
    if (key === "project") return headerInput.project || headerInput.projectName;
    if (key === "areaInspected") return headerInput.areaInspected || headerInput.area;
    if (key === "inspector") return headerInput.inspector || worker?.name;
    if (key === "reviewer") return headerInput.reviewer || headerInput.supervisor;
    return headerInput[key];
  };
  const cleanHeaderText = (key) =>
    headerRequired(key)
      ? requireText(headerRaw(key), headerLabel(key))
      : cleanText(headerRaw(key), MAX_FORM_TEXT_LENGTH);
  const cleanHeaderDate = (key) =>
    headerRequired(key)
      ? cleanDate(headerRaw(key), headerLabel(key))
      : cleanOptionalDate(headerRaw(key), headerLabel(key));
  const cleanHeaderTime = (key) => {
    const raw = String(headerRaw(key) || "").trim();
    if (headerRequired(key)) return cleanTime(raw, headerLabel(key));
    return raw ? cleanTime(raw, headerLabel(key)) : "";
  };
  const header = {
    project: cleanHeaderText("project"),
    address: cleanHeaderText("address"),
    areaInspected: cleanHeaderText("areaInspected"),
    date: cleanHeaderDate("date"),
    time: cleanHeaderTime("time"),
    inspector: cleanHeaderText("inspector"),
    tradesPresent: cleanHeaderText("tradesPresent"),
    reviewer: cleanHeaderText("reviewer"),
  };

  const observationInput = value.observations || {};
  const observationField = (key) =>
    observationFields.find((field) => field.key === key)
      || SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.find((field) => field.key === key)
      || { key, label: key, required: false };
  const observationRequired = (key) => observationFields.some((field) => field.key === key && field.required);
  const observationLabel = (key) => observationField(key).label || key;
  const observationRaw = (key, legacyKey) => observationInput[key] || value[legacyKey];
  const cleanObservationText = (key, legacyKey) => {
    const cleaned = cleanText(observationRaw(key, legacyKey), MAX_FORM_LONG_TEXT_LENGTH);
    if (observationRequired(key) && !cleaned) {
      throwBadRequest(`${observationLabel(key)} is required.`);
    }
    return cleaned;
  };

  const deficienciesEnabled = enabled.has("site_deficiencies");
  const noDeficiencies = deficienciesEnabled && value.noDeficiencies === true;
  const deficiencies = deficienciesEnabled && !noDeficiencies
    ? cleanRows(value.deficiencies, (row) => cleanSiteInspectionDeficiency(row, deficiencySettings))
        .filter((row) =>
          row.category ||
          row.location ||
          row.description ||
          row.immediateControl ||
          row.recommendedAction ||
          row.suggestedAssignee ||
          row.dueDate,
        )
        .slice(0, MAX_SITE_INSPECTION_DEFICIENCIES)
    : [];

  if (deficienciesEnabled && !noDeficiencies && !deficiencies.length) {
    throwBadRequest("Add at least one deficiency or mark no deficiencies found.");
  }

  if (deficienciesEnabled && deficiencies.length) {
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
      positive: cleanObservationText("positive", "positiveObservations"),
      highRiskWork: cleanObservationText("highRiskWork", "highRiskWorkObserved"),
      immediateControls: cleanObservationText("immediateControls", "immediateControls"),
      followUpNotes: cleanObservationText("followUpNotes", "followUpNotes"),
    },
    noDeficiencies,
    deficiencies,
  };
}

function cleanSiteInspectionDeficiency(row, settings = normalizeActionItemRowsSettings()) {
  const visible = new Set(settings.filter((field) => field.visible || field.lockedVisible).map((field) => field.key));
  return ACTION_ITEM_ROW_FIELD_CONFIGS.reduce((cleaned, config) => {
    if (!visible.has(config.key) && !config.lockedVisible) {
      cleaned[config.key] = config.defaultValue;
      return cleaned;
    }
    if (config.key === "description") {
      cleaned.description = cleanText(row?.description || row?.deficiency, MAX_FORM_LONG_TEXT_LENGTH);
      return cleaned;
    }
    if (config.key === "priority") {
      cleaned.priority = cleanChoice(row?.priority || "medium", ["low", "medium", "high", "critical"], "Priority");
      return cleaned;
    }
    if (config.key === "dueDate") {
      cleaned.dueDate = cleanOptionalDate(row?.dueDate);
      return cleaned;
    }
    const maxLength = ["immediateControl", "recommendedAction"].includes(config.key)
      ? MAX_FORM_LONG_TEXT_LENGTH
      : MAX_FORM_TEXT_LENGTH;
    cleaned[config.key] = cleanText(row?.[config.key], maxLength);
    return cleaned;
  }, {});
}

function normalizeActionItemRowsSettings(settings = {}) {
  const source = getTemplateSettingRaw(settings, "actionItemRows");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const rawFields = Array.isArray(raw.subfields) ? raw.subfields : Array.isArray(raw.fields) ? raw.fields : [];
  const rawFieldMap = new Map();
  rawFields.forEach((field) => {
    const key = cleanText(field?.key, 80);
    if (key && !rawFieldMap.has(key)) rawFieldMap.set(key, field);
  });
  return ACTION_ITEM_ROW_FIELD_CONFIGS.map((config) => {
    const override = rawFieldMap.get(config.key) || {};
    return {
      ...config,
      visible: config.lockedVisible ? true : override.visible !== false,
    };
  });
}

function cleanRows(value, cleaner) {
  const rows = Array.isArray(value) ? value : [];
  return rows.slice(0, MAX_TOOLBOX_ROWS).map(cleaner);
}

function splitToolboxAttendeeNames(value) {
  return String(value || "")
    .split(/[,\n]+/)
    .map((name) => cleanText(name, MAX_FORM_TEXT_LENGTH))
    .filter(Boolean);
}

function cleanToolboxAttendanceRows(value) {
  const seen = new Set();
  const rows = Array.isArray(value) ? value : [];
  return rows
    .flatMap((row) => splitToolboxAttendeeNames(row?.name))
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TOOLBOX_ROWS)
    .map((name) => ({ name }));
}

function requireText(value, label) {
  const cleaned = cleanText(value, MAX_FORM_TEXT_LENGTH);
  if (!cleaned) throwBadRequest(`${label} is required.`);
  return cleaned;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanStaffEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  if (!email || !STAFF_EMAIL_PATTERN.test(email)) {
    throwBadRequest("Your staff account does not have a valid email address.");
  }
  return email;
}

function cleanStaffSignatureDataUrl(value) {
  const signature = String(value || "").trim();
  if (!signature) throwBadRequest("Staff signature is required.");
  if (
    signature.length > MAX_STAFF_SIGNATURE_DATA_URL_LENGTH ||
    !STAFF_SIGNATURE_DATA_URL_PATTERN.test(signature)
  ) {
    throwBadRequest("Staff signature must be a valid PNG signature.");
  }
  return signature;
}

async function createSubmissionPdfAttachment(submission, body = {}) {
  const { buffer, fileName: generatedFileName } = await renderSubmittedFormPdf(submission);
  if (buffer.length < 20 || buffer.subarray(0, 4).toString("utf8") !== "%PDF") {
    throwBadRequest("Form PDF could not be created.");
  }
  if (buffer.length > MAX_SUBMISSION_EMAIL_PDF_BYTES) {
    throwBadRequest("Form PDF is too large to email.");
  }

  const requestedName = cleanText(body.fileName || body.filename, 180);
  const fallbackName = generatedFileName || `${sanitizeStorageFilename(submissionEmailTitle(submission))}.pdf`;
  const fileName = sanitizeStorageFilename(requestedName || fallbackName).replace(/\.pdf$/i, "") + ".pdf";
  return {
    content: buffer.toString("base64"),
    fileName,
    sizeBytes: buffer.length,
  };
}

function assertSubmissionEmailConfig() {
  const missing = ["RESEND_API_KEY", "REPORT_FROM_EMAIL"].filter((name) => !process.env[name]);
  if (!missing.length) return;

  const error = new Error(`Email is not configured yet. Missing: ${missing.join(", ")}.`);
  error.statusCode = 503;
  error.exposeMessage = true;
  throw error;
}

function createSubmissionEmailSendError(providerError) {
  const providerMessage = cleanText(providerError?.message || "", 280);
  const message = providerMessage
    ? `Form email could not be sent. Email provider said: ${providerMessage}`
    : "Form email could not be sent.";

  console.error("Submitted form email send failed", {
    providerName: providerError?.name,
    providerStatusCode: providerError?.statusCode,
    providerMessage,
  });

  const error = new Error(message);
  error.statusCode = 502;
  error.exposeMessage = true;
  error.cause = providerError;
  return error;
}

function submissionEmailTitle(submission) {
  const schemaTitle = cleanText(
    submission?.form_schema_snapshot?.title ||
      submission?.form_data?.schemaSnapshot?.title ||
      "",
    MAX_FORM_TEXT_LENGTH,
  );
  const formTitle = schemaTitle || humanizeFormType(submission?.form_type);
  return [formTitle || "Submitted Form", submission?.worker_name, submission?.company]
    .filter(Boolean)
    .map((part) => cleanText(part, 120))
    .join(" - ");
}

function humanizeFormType(value) {
  return cleanText(value, 120)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function submissionPdfEmailHtml(submission, staff) {
  const title = submissionEmailTitle(submission);
  const submitted = cleanText(submission?.submitted_at || "", 80);
  const reviewer = cleanText(staff?.display_name || staff?.username || "Staff", MAX_FORM_TEXT_LENGTH);
  return `
    <p>${escapeEmailHtml(reviewer)},</p>
    <p>The submitted form PDF is attached.</p>
    <dl>
      <dt>Form</dt><dd>${escapeEmailHtml(title)}</dd>
      <dt>Worker</dt><dd>${escapeEmailHtml(submission?.worker_name || "-")}</dd>
      <dt>Company</dt><dd>${escapeEmailHtml(submission?.company || "-")}</dd>
      ${submitted ? `<dt>Submitted</dt><dd>${escapeEmailHtml(submitted)}</dd>` : ""}
    </dl>
  `;
}

function escapeEmailHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanDate(value, label) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throwBadRequest(`${label} must use YYYY-MM-DD format.`);
  }
  return date;
}

function cleanOptionalDate(value, label = "Date taken") {
  const date = String(value || "").trim();
  if (!date) return "";
  return cleanDate(date, label);
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
