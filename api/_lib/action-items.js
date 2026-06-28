import crypto from "node:crypto";
import { assertDateString, getVancouverDate } from "./date.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

export const ACTION_ITEM_STATUSES = [
  "draft",
  "open",
  "in_progress",
  "ready_for_review",
  "closed",
  "void",
];

export const ACTION_ITEM_PRIORITIES = ["low", "medium", "high", "critical"];

const ACTION_ITEM_BUCKET = "safety-form-submissions";
const MAX_ACTION_TEXT_LENGTH = 600;
const MAX_ACTION_LONG_TEXT_LENGTH = 4000;
const MAX_ACTION_BULK_IDS = 100;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ACTION_ITEM_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "due_date",
  "status",
  "priority",
  "company",
  "project",
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
const ACTION_ITEM_FILE_SELECT =
  "id, action_item_id, bucket, storage_path, original_filename, mime_type, size_bytes, uploaded_by_staff_id, app_deleted_at, created_at";
const ACTION_ITEM_EVENT_SELECT =
  "id, action_item_id, actor_staff_id, actor_username, actor_role, event_type, from_status, to_status, body, metadata, created_at";
const ACTION_ITEM_SELECT =
  "id, source_submission_id, source_form_type, source_deficiency_index, worker_id, worker_name, worker_phone, worker_username, company, project, area, location, category, title, description, priority, status, immediate_control, recommended_action, suggested_assignee, assigned_to, assigned_to_staff_id, due_date, closeout_notes, opened_at, activated_at, ready_for_review_at, closed_at, voided_at, deleted_at, deleted_by_staff_id, created_by_staff_id, updated_by_staff_id, metadata, created_at, updated_at";
const ACTION_ITEM_WITH_DETAILS_SELECT =
  `${ACTION_ITEM_SELECT}, action_item_events(${ACTION_ITEM_EVENT_SELECT}), action_item_files(${ACTION_ITEM_FILE_SELECT}), form_submissions(id, form_type, submission_mode, submitted_at, submitted_date_vancouver, worker_name, company)`;

export function publicActionItem(row) {
  const events = [...(row?.action_item_events || row?.events || [])]
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const files = [...(row?.action_item_files || row?.files || [])]
    .filter((file) => !file.app_deleted_at)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return {
    ...row,
    events,
    files,
    source_submission: row?.form_submissions || row?.source_submission || null,
    action_item_events: undefined,
    action_item_files: undefined,
    form_submissions: undefined,
  };
}

export async function listActionItems(query) {
  const filters = cleanListFilters(query);
  let dbQuery = getSupabaseServiceClient()
    .from("action_items")
    .select(ACTION_ITEM_WITH_DETAILS_SELECT)
    .is("deleted_at", null);

  if (filters.status) dbQuery = dbQuery.eq("status", filters.status);
  if (filters.priority) dbQuery = dbQuery.eq("priority", filters.priority);
  if (filters.company) dbQuery = dbQuery.ilike("company", `%${escapeLike(filters.company)}%`);
  if (filters.project) dbQuery = dbQuery.ilike("project", `%${escapeLike(filters.project)}%`);
  if (filters.assignedTo) dbQuery = dbQuery.ilike("assigned_to", `%${escapeLike(filters.assignedTo)}%`);
  if (filters.sourceFormType) dbQuery = dbQuery.eq("source_form_type", filters.sourceFormType);
  if (filters.dueFrom) dbQuery = dbQuery.gte("due_date", filters.dueFrom);
  if (filters.dueTo) dbQuery = dbQuery.lte("due_date", filters.dueTo);

  if (filters.search) {
    const value = `%${escapeLike(filters.search)}%`;
    dbQuery = dbQuery.or(
      [
        `title.ilike.${value}`,
        `description.ilike.${value}`,
        `recommended_action.ilike.${value}`,
        `location.ilike.${value}`,
        `category.ilike.${value}`,
      ].join(","),
    );
  }

  const rows = throwIfSupabaseError(
    await dbQuery.order(filters.sort, { ascending: filters.dir === "asc", nullsFirst: false }).limit(500),
    "Action items could not be loaded.",
  ).map(publicActionItem);

  return {
    rows,
    summary: summarizeActionItems(rows),
    sort: filters.sort,
    dir: filters.dir,
  };
}

export async function getActionItemById(id, { includeDeleted = false } = {}) {
  let query = getSupabaseServiceClient()
    .from("action_items")
    .select(ACTION_ITEM_WITH_DETAILS_SELECT)
    .eq("id", cleanUuid(id, "Action item id is not valid."));
  if (!includeDeleted) query = query.is("deleted_at", null);

  const row = throwIfSupabaseError(
    await query.maybeSingle(),
    "Action item could not be loaded.",
  );
  if (!row) {
    const error = new Error("Action item was not found.");
    error.statusCode = 404;
    throw error;
  }
  return publicActionItem(row);
}

export async function getActionItemsForSubmission(submissionId) {
  try {
    const rows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("action_items")
        .select(ACTION_ITEM_WITH_DETAILS_SELECT)
        .eq("source_submission_id", cleanUuid(submissionId, "Submission id is not valid."))
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      "Linked action items could not be loaded.",
    );
    return rows.map(publicActionItem);
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return [];
    throw error;
  }
}

export async function createDraftActionItemsFromSiteInspection(submission, formData) {
  if (submission?.form_type !== "site_inspection" || formData?.kind !== "site_inspection_v1") {
    return [];
  }

  const deficiencies = Array.isArray(formData.deficiencies) ? formData.deficiencies : [];
  if (!deficiencies.length) return [];

  const header = formData.header || {};
  const rows = deficiencies.map((deficiency, index) => {
    const description = cleanText(deficiency.description, MAX_ACTION_LONG_TEXT_LENGTH);
    const category = cleanText(deficiency.category, MAX_ACTION_TEXT_LENGTH);
    const title = cleanText(
      deficiency.title || description || category || `Site inspection deficiency ${index + 1}`,
      160,
    );
    return {
      source_submission_id: submission.id,
      source_form_type: submission.form_type,
      source_deficiency_index: index,
      worker_id: submission.worker_id || null,
      worker_name: submission.worker_name || "",
      worker_phone: submission.worker_phone || "",
      worker_username: submission.worker_username || "",
      company: submission.company || "",
      project: cleanText(header.project || header.projectName, MAX_ACTION_TEXT_LENGTH),
      area: cleanText(header.areaInspected, MAX_ACTION_TEXT_LENGTH),
      location: cleanText(deficiency.location || header.areaInspected, MAX_ACTION_TEXT_LENGTH),
      category,
      title,
      description,
      priority: cleanPriority(deficiency.priority || "medium"),
      status: "draft",
      immediate_control: cleanText(deficiency.immediateControl, MAX_ACTION_LONG_TEXT_LENGTH),
      recommended_action: cleanText(deficiency.recommendedAction, MAX_ACTION_LONG_TEXT_LENGTH),
      suggested_assignee: cleanText(deficiency.suggestedAssignee, MAX_ACTION_TEXT_LENGTH),
      due_date: cleanOptionalDate(deficiency.dueDate),
      metadata: { deficiency },
    };
  });

  try {
    const inserted = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("action_items")
        .insert(rows)
        .select(ACTION_ITEM_SELECT),
      "Draft action items could not be created.",
    );
    await Promise.all(
      inserted.map((row) =>
        recordActionItemEvent({
          actionItemId: row.id,
          eventType: "draft_created",
          toStatus: "draft",
          body: "Draft action item created from Site Inspection deficiency.",
          metadata: { sourceSubmissionId: submission.id },
        }),
      ),
    );
    return inserted.map(publicActionItem);
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return [];
    throw error;
  }
}

export async function createActionItem(body, staff) {
  assertAdminOrOwner(staff);
  const cleaned = cleanActionItemCreate(body);
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("action_items")
      .insert({
        ...cleaned,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(ACTION_ITEM_WITH_DETAILS_SELECT)
      .single(),
    "Action item could not be created.",
  );
  await recordActionItemEvent({
    actionItemId: row.id,
    staff,
    eventType: "created",
    toStatus: row.status,
    body: "Action item created by staff.",
  });
  return getActionItemById(row.id);
}

export async function updateActionItem(id, body, staff) {
  const current = await getActionItemById(id);
  const update = cleanActionItemUpdate(body, staff, current);
  if (!Object.keys(update).length) return current;

  update.updated_at = new Date().toISOString();
  update.updated_by_staff_id = staff.id;
  applyStatusTimestamps(update, current.status, update.status);

  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("action_items")
      .update(update)
      .eq("id", current.id)
      .is("deleted_at", null)
      .select(ACTION_ITEM_WITH_DETAILS_SELECT)
      .single(),
    "Action item could not be updated.",
  );

  if (update.status && update.status !== current.status) {
    await recordActionItemEvent({
      actionItemId: current.id,
      staff,
      eventType: "status_changed",
      fromStatus: current.status,
      toStatus: update.status,
      body: `Status changed from ${statusLabel(current.status)} to ${statusLabel(update.status)}.`,
    });
  } else {
    await recordActionItemEvent({
      actionItemId: current.id,
      staff,
      eventType: "updated",
      body: "Action item updated.",
      metadata: { fields: Object.keys(update).filter((field) => field !== "updated_at") },
    });
  }

  return publicActionItem(row);
}

export async function addActionItemComment(id, body, staff) {
  const item = await getActionItemById(id);
  const text = requireText(body?.body || body?.comment || body?.closeoutNotes, "Comment");
  await recordActionItemEvent({
    actionItemId: item.id,
    staff,
    eventType: "comment",
    body: text,
  });
  return getActionItemById(item.id);
}

export async function bulkUpdateActionItems(body, staff) {
  assertAdminOrOwner(staff);
  const ids = cleanIdList(body?.ids, "Select at least one action item.");
  const updates = body?.updates && typeof body.updates === "object" ? body.updates : {};
  if (body?.delete === true || updates.delete === true) {
    const results = [];
    for (const id of ids) {
      try {
        results.push(await deleteActionItem(id, staff));
      } catch (error) {
        results.push({ id, deleted: false, error: error.message });
      }
    }
    return summarizeBulkResults(ids, results);
  }

  const results = [];
  for (const id of ids) {
    try {
      results.push({ id, updated: true, item: await updateActionItem(id, updates, staff) });
    } catch (error) {
      results.push({ id, updated: false, error: error.message });
    }
  }
  return summarizeBulkResults(ids, results);
}

export async function deleteActionItem(id, staff) {
  assertAdminOrOwner(staff);
  const item = await getActionItemById(id);
  const deletedAt = new Date().toISOString();
  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("action_items")
      .update({
        deleted_at: deletedAt,
        deleted_by_staff_id: staff.id,
        updated_at: deletedAt,
        updated_by_staff_id: staff.id,
      })
      .eq("id", item.id),
    "Action item could not be deleted.",
  );
  await recordActionItemEvent({
    actionItemId: item.id,
    staff,
    eventType: "deleted",
    fromStatus: item.status,
    body: "Action item deleted.",
  });
  return { id: item.id, deleted: true };
}

export async function createActionItemFileUploadTarget(actionItemId, body, staff) {
  const item = await getActionItemById(actionItemId);
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = `action-items/${item.id}/${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}-${sanitizeStorageFilename(file.originalFilename)}`;

  const result = await getSupabaseServiceClient()
    .storage
    .from(ACTION_ITEM_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (result.error) {
    const error = new Error("Action item evidence upload URL could not be created.");
    error.cause = result.error;
    error.statusCode = 500;
    error.exposeMessage = true;
    throw error;
  }

  return {
    bucket: ACTION_ITEM_BUCKET,
    storagePath,
    signedUrl: result.data.signedUrl,
    token: result.data.token,
    path: result.data.path,
    file,
    uploadedBy: staff.id,
  };
}

export async function attachActionItemFile(actionItemId, body, staff) {
  const item = await getActionItemById(actionItemId);
  const file = cleanFileMetadata(body?.file || body);
  const storagePath = String(body?.storagePath || body?.storage_path || "").trim();
  if (!storagePath.startsWith(`action-items/${item.id}/`)) {
    throwBadRequest("Uploaded evidence path is not valid for this action item.");
  }

  const inserted = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("action_item_files")
      .insert({
        action_item_id: item.id,
        bucket: ACTION_ITEM_BUCKET,
        storage_path: storagePath,
        original_filename: file.originalFilename,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        uploaded_by_staff_id: staff.id,
      })
      .select(ACTION_ITEM_FILE_SELECT)
      .single(),
    "Action item evidence could not be saved.",
  );

  await recordActionItemEvent({
    actionItemId: item.id,
    staff,
    eventType: "file_added",
    body: `Evidence added: ${file.originalFilename}.`,
    metadata: { fileId: inserted.id },
  });

  return getActionItemById(item.id);
}

export async function createActionItemFileAccess(actionItemId, fileId) {
  const item = await getActionItemById(actionItemId);
  const cleanFileId = cleanUuid(fileId, "File id is not valid.");
  const file = (item.files || []).find((candidate) => candidate.id === cleanFileId);
  if (!file) {
    const error = new Error("Action item evidence file was not found.");
    error.statusCode = 404;
    throw error;
  }
  if (file.app_deleted_at || !file.storage_path) {
    const error = new Error("The app copy of this evidence file is no longer available.");
    error.statusCode = 410;
    error.exposeMessage = true;
    throw error;
  }

  const storage = getSupabaseServiceClient().storage.from(file.bucket || ACTION_ITEM_BUCKET);
  const preview = await storage.createSignedUrl(file.storage_path, 10 * 60);
  if (preview.error) {
    const error = new Error("Evidence preview URL could not be created.");
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
    },
    url: preview.data.signedUrl,
    downloadUrl,
    expiresInSeconds: 10 * 60,
  };
}

async function recordActionItemEvent({
  actionItemId,
  staff = null,
  eventType,
  fromStatus = null,
  toStatus = null,
  body = "",
  metadata = {},
}) {
  try {
    throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("action_item_events")
        .insert({
          action_item_id: actionItemId,
          actor_staff_id: staff?.id || null,
          actor_username: staff?.username || null,
          actor_role: staff?.role || null,
          event_type: eventType,
          from_status: fromStatus,
          to_status: toStatus,
          body,
          metadata,
        }),
      "Action item history could not be saved.",
    );
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) throw error;
  }
}

function cleanListFilters(query) {
  return {
    status: cleanOptionalChoice(query.get("status"), ACTION_ITEM_STATUSES, "Status"),
    priority: cleanOptionalChoice(query.get("priority"), ACTION_ITEM_PRIORITIES, "Priority"),
    company: cleanText(query.get("company"), MAX_ACTION_TEXT_LENGTH),
    project: cleanText(query.get("project"), MAX_ACTION_TEXT_LENGTH),
    assignedTo: cleanText(query.get("assignedTo") || query.get("assigned_to"), MAX_ACTION_TEXT_LENGTH),
    sourceFormType: cleanOptionalChoice(
      query.get("sourceFormType") || query.get("source_form_type"),
      ["", "toolbox_talk", "site_inspection", "daily_hazard_assessment"],
      "Source form",
    ),
    dueFrom: query.get("dueFrom") ? assertDateString(query.get("dueFrom")) : "",
    dueTo: query.get("dueTo") ? assertDateString(query.get("dueTo")) : "",
    search: cleanText(query.get("search"), MAX_ACTION_TEXT_LENGTH),
    sort: ACTION_ITEM_SORT_FIELDS.includes(query.get("sort")) ? query.get("sort") : "created_at",
    dir: query.get("dir") === "asc" ? "asc" : "desc",
  };
}

function summarizeActionItems(rows) {
  const today = getVancouverDate();
  const dueSoonDate = addDays(today, 7);
  const activeRows = rows.filter((row) => !["closed", "void"].includes(row.status));
  return {
    drafts: rows.filter((row) => row.status === "draft").length,
    open: rows.filter((row) => ["open", "in_progress"].includes(row.status)).length,
    readyForReview: rows.filter((row) => row.status === "ready_for_review").length,
    overdue: activeRows.filter((row) => row.due_date && row.due_date < today).length,
    dueSoon: activeRows.filter((row) => row.due_date && row.due_date >= today && row.due_date <= dueSoonDate).length,
  };
}

function cleanActionItemCreate(body) {
  const status = cleanOptionalChoice(body?.status, ACTION_ITEM_STATUSES, "Status") || "draft";
  const priority = cleanOptionalChoice(body?.priority, ACTION_ITEM_PRIORITIES, "Priority") || "medium";
  const description = cleanText(body?.description, MAX_ACTION_LONG_TEXT_LENGTH);
  return {
    source_submission_id: body?.sourceSubmissionId ? cleanUuid(body.sourceSubmissionId, "Source submission id is not valid.") : null,
    source_form_type: cleanText(body?.sourceFormType, MAX_ACTION_TEXT_LENGTH),
    company: requireText(body?.company, "Company"),
    project: cleanText(body?.project, MAX_ACTION_TEXT_LENGTH),
    area: cleanText(body?.area, MAX_ACTION_TEXT_LENGTH),
    location: cleanText(body?.location, MAX_ACTION_TEXT_LENGTH),
    category: cleanText(body?.category, MAX_ACTION_TEXT_LENGTH),
    title: cleanText(body?.title || description, 160),
    description,
    priority,
    status,
    immediate_control: cleanText(body?.immediateControl, MAX_ACTION_LONG_TEXT_LENGTH),
    recommended_action: cleanText(body?.recommendedAction, MAX_ACTION_LONG_TEXT_LENGTH),
    assigned_to: cleanText(body?.assignedTo, MAX_ACTION_TEXT_LENGTH),
    due_date: cleanOptionalDate(body?.dueDate),
    closeout_notes: cleanText(body?.closeoutNotes, MAX_ACTION_LONG_TEXT_LENGTH),
  };
}

function cleanActionItemUpdate(body, staff, current) {
  const admin = isAdminOrOwner(staff);
  const update = {};

  if (!admin) {
    const disallowed = [
      "title",
      "description",
      "priority",
      "company",
      "project",
      "area",
      "location",
      "category",
      "immediateControl",
      "recommendedAction",
      "assignedTo",
      "assignedToStaffId",
      "dueDate",
    ].filter((field) => body?.[field] !== undefined);
    if (disallowed.length) {
      throwForbidden("Only Admin or Owner can change assignment, due date, priority, or deficiency details.");
    }
    if (body?.status !== undefined) {
      const status = cleanStatus(body.status);
      if (!["in_progress", "ready_for_review"].includes(status)) {
        throwForbidden("Staff can only move action items to In progress or Ready for review.");
      }
      update.status = status;
    }
    if (body?.closeoutNotes !== undefined) {
      update.closeout_notes = cleanText(body.closeoutNotes, MAX_ACTION_LONG_TEXT_LENGTH);
    }
    return update;
  }

  const fieldMap = {
    title: "title",
    description: "description",
    company: "company",
    project: "project",
    area: "area",
    location: "location",
    category: "category",
    immediateControl: "immediate_control",
    recommendedAction: "recommended_action",
    suggestedAssignee: "suggested_assignee",
    assignedTo: "assigned_to",
    closeoutNotes: "closeout_notes",
  };
  Object.entries(fieldMap).forEach(([inputField, dbField]) => {
    if (body?.[inputField] !== undefined) {
      update[dbField] = cleanText(
        body[inputField],
        ["description", "immediateControl", "recommendedAction", "closeoutNotes"].includes(inputField)
          ? MAX_ACTION_LONG_TEXT_LENGTH
          : MAX_ACTION_TEXT_LENGTH,
      );
    }
  });

  if (body?.status !== undefined) update.status = cleanStatus(body.status);
  if (body?.priority !== undefined) update.priority = cleanPriority(body.priority);
  if (body?.dueDate !== undefined) update.due_date = cleanOptionalDate(body.dueDate);
  if (body?.assignedToStaffId !== undefined) {
    update.assigned_to_staff_id = body.assignedToStaffId
      ? cleanUuid(body.assignedToStaffId, "Assigned staff id is not valid.")
      : null;
  }

  if (update.status === "open" && current.status === "draft") {
    update.opened_at = current.opened_at || new Date().toISOString();
  }

  return update;
}

function applyStatusTimestamps(update, previousStatus, nextStatus) {
  if (!nextStatus || previousStatus === nextStatus) return;
  const now = new Date().toISOString();
  if (previousStatus === "draft" && nextStatus !== "draft") {
    update.activated_at = update.activated_at || now;
    update.opened_at = update.opened_at || now;
  }
  if (nextStatus === "ready_for_review") update.ready_for_review_at = now;
  if (nextStatus === "closed") update.closed_at = now;
  if (nextStatus === "void") update.voided_at = now;
}

function cleanIdList(value, message) {
  const ids = Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((id) => cleanUuid(id, "Action item id is not valid.")),
    ),
  );
  if (!ids.length) throwBadRequest(message);
  if (ids.length > MAX_ACTION_BULK_IDS) {
    throwBadRequest(`Update ${MAX_ACTION_BULK_IDS} or fewer action items at a time.`);
  }
  return ids;
}

function summarizeBulkResults(ids, results) {
  const succeeded = results.filter((result) => result.updated || result.deleted).length;
  return {
    requested: ids.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
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
  if (!cleaned.originalFilename) throwBadRequest("File name is required.");
  if (!Number.isFinite(cleaned.sizeBytes) || cleaned.sizeBytes < 1) {
    throwBadRequest("File size is required.");
  }
  if (cleaned.sizeBytes > MAX_FILE_SIZE_BYTES) {
    throwBadRequest("File must be 50 MiB or smaller.");
  }
  if (!allowedMimeTypes.length) {
    throwBadRequest("File type is not allowed. Use an image, PDF, Word, Excel, or text file.");
  }
  if (!allowedMimeTypes.includes(cleaned.mimeType)) {
    throwBadRequest("File extension and file type do not match.");
  }
  return cleaned;
}

function statusLabel(value) {
  return String(value || "").replace(/_/g, " ");
}

function isAdminOrOwner(staff) {
  return ["owner", "admin"].includes(staff?.role);
}

function assertAdminOrOwner(staff) {
  if (isAdminOrOwner(staff)) return;
  throwForbidden("Only Admin or Owner can perform this action item action.");
}

function throwForbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

function requireText(value, label) {
  const cleaned = cleanText(value, MAX_ACTION_TEXT_LENGTH);
  if (!cleaned) throwBadRequest(`${label} is required.`);
  return cleaned;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanStatus(value) {
  return cleanChoice(value, ACTION_ITEM_STATUSES, "Status");
}

function cleanPriority(value) {
  return cleanChoice(value, ACTION_ITEM_PRIORITIES, "Priority");
}

function cleanOptionalChoice(value, choices, label) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "";
  return cleanChoice(cleaned, choices, label);
}

function cleanChoice(value, choices, label) {
  const cleaned = String(value || "").trim();
  if (!choices.includes(cleaned)) throwBadRequest(`${label} is not valid.`);
  return cleaned;
}

function cleanOptionalDate(value) {
  const date = String(value || "").trim();
  if (!date) return null;
  return assertDateString(date);
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

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}

function sanitizeStorageFilename(value) {
  return String(value || "evidence")
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

function addDays(value, days) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeLike(value) {
  return String(value).replace(/[%_]/g, "\\$&");
}
