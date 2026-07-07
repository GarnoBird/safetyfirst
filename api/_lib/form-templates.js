import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";
import { verifyStaffPassword } from "./auth.js";
import { getVancouverDate } from "./date.js";

export const CUSTOM_FORM_TYPES = [
  "toolbox_talk",
  "site_inspection",
];

export const SEEDED_FORM_TYPES = [...CUSTOM_FORM_TYPES, "daily_hazard_assessment"];
export const LOCKED_DEFAULT_FORM_TYPES = [
  "toolbox_talk",
  "site_inspection",
  "daily_hazard_assessment",
];

export const TEMPLATE_FIELD_TYPES = [
  "short_text",
  "long_text",
  "number",
  "date",
  "time",
  "yes_no",
  "boolean",
  "toggle",
  "media_upload",
  "asset_picker",
  "dropdown",
  "multi_select",
  "checkbox",
  "signature",
  "instructions",
  "spacer",
  "toolbox_meeting_info",
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
  "site_deficiencies",
  "action_item_rows",
];

const TEMPLATE_SPECIAL_BLOCK_TYPES = new Set([
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
  "site_deficiencies",
  "action_item_rows",
]);

const TEMPLATE_SELECT =
  "id, form_type, label, description, renderer_type, active, worker_visible, display_order, archived_at, locked_at, locked_by_staff_id, created_by_staff_id, updated_by_staff_id, created_at, updated_at";
const VERSION_SELECT =
  "id, template_id, form_type, version_number, status, schema, notes, created_by_staff_id, updated_by_staff_id, published_by_staff_id, created_at, updated_at, published_at";
const SHARE_LINK_SELECT =
  "id, template_id, form_type, token, slug, active, created_at, updated_at";
const MAX_SECTIONS = 20;
const MAX_FIELDS = 100;
const MAX_OPTIONS = 80;
const MAX_TEXT = 600;
const MAX_LONG_TEXT = 4000;
const MAX_SIGNATURE_DATA_URL = 750000;
const SIGNATURE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/;
const TEMPLATE_DEFAULT_VALUES = new Set([
  "",
  "today",
  "now",
  "worker_name",
  "worker_phone",
  "worker_username",
  "worker_company",
  "worker_address",
]);
const TEMPLATE_VISIBILITY_OPERATORS = new Set(["equals", "not_equals", "contains", "not_contains"]);
const MAX_MEDIA_UPLOAD_FILES = 5;
const MAX_MEDIA_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;
const MEDIA_UPLOAD_EXTENSIONS = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".heif": ["image/heic", "image/heif"],
  ".pdf": ["application/pdf"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};
const MEDIA_UPLOAD_KIND_EXTENSIONS = {
  image: [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
  pdf: [".pdf"],
  excel: [".xls", ".xlsx"],
};
const DEFAULT_MEDIA_UPLOAD_KINDS = Object.keys(MEDIA_UPLOAD_KIND_EXTENSIONS);
const GENERIC_MEDIA_MIME_TYPES = ["", "application/octet-stream"];
const MAX_SETTINGS_KEYS = 80;
const MAX_SETTINGS_DEPTH = 5;
const ACTION_ITEM_ROW_BLOCK_TYPES = new Set(["action_item_rows"]);
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

export async function listFormTemplates() {
  await ensureSeedTemplates();
  const templates = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select(TEMPLATE_SELECT)
      .order("display_order", { ascending: true })
      .order("label", { ascending: true }),
    "Form templates could not be loaded.",
  );
  const versions = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .order("version_number", { ascending: false }),
    "Form template versions could not be loaded.",
  );
  return attachTemplateShareLinks(templates.map((template) => attachTemplateVersions(template, versions)));
}

export async function listWorkerVisibleFormTemplates() {
  await ensureSeedTemplates();
  const templates = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select(TEMPLATE_SELECT)
      .eq("active", true)
      .eq("worker_visible", true)
      .is("archived_at", null)
      .order("display_order", { ascending: true })
      .order("label", { ascending: true }),
    "Form templates could not be loaded.",
  );
  if (!templates.length) return [];
  const versions = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .eq("status", "published"),
    "Form template versions could not be loaded.",
  );
  const visibleTemplates = templates
    .map((template) => attachTemplateVersions(template, versions))
    .filter((template) => template.publishedVersion || CUSTOM_FORM_TYPES.includes(template.form_type));
  return attachTemplateShareLinks(visibleTemplates);
}

export async function getFormTemplate(formType) {
  const template = await getTemplateByType(cleanFormType(formType));
  const versions = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .eq("template_id", template.id)
      .order("version_number", { ascending: false }),
    "Form template versions could not be loaded.",
  );
  return withTemplateShareLink(attachTemplateVersions(template, versions));
}

export async function getPublishedFormTemplate(formType) {
  const template = await getTemplateByType(cleanFormType(formType));
  const version = await getPublishedVersion(template.id);
  return withTemplateShareLink({
    ...template,
    publishedVersion: version,
  });
}

export async function getPublishedWorkerFormTemplate(formType) {
  const template = await getPublishedFormTemplate(formType);
  if (!template.active || template.archived_at || !template.worker_visible) {
    throwNotFound("Form was not found.");
  }
  if (template.renderer_type === "template" && !template.publishedVersion) {
    throwNotFound("Form was not found.");
  }
  return template;
}

export async function getPublishedFormTemplateByShareIdentifier(identifier) {
  await ensureSeedTemplates();
  const cleanIdentifier = cleanShareIdentifier(identifier);
  const identifierColumn = isShareToken(cleanIdentifier) ? "token" : "slug";
  const link = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_share_links")
      .select(SHARE_LINK_SELECT)
      .eq(identifierColumn, cleanIdentifier)
      .eq("active", true)
      .maybeSingle(),
    "Form QR link could not be loaded.",
  );
  if (!link) throwNotFound("Form QR link was not found.");

  const template = await getTemplateById(link.template_id);
  const version = await getPublishedVersion(template.id);
  const withVersion = attachTemplateVersions(template, version ? [version] : []);
  if (!isTemplateShareLinkEligible(withVersion)) {
    throwNotFound("Form QR link was not found.");
  }
  const [withLink] = await attachTemplateShareLinks([withVersion]);
  return withLink;
}

export async function createFormTemplate(body, staff) {
  const label = cleanString(body?.label || body?.name || body?.title, MAX_TEXT);
  if (!label) throwBadRequest("Form name is required.");
  const description = cleanString(body?.description, MAX_TEXT);
  const formType = await uniqueFormTypeSlug(label);
  const displayOrder = await nextDisplayOrder();
  const template = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .insert({
        form_type: formType,
        label,
        description,
        renderer_type: "template",
        active: true,
        worker_visible: false,
        display_order: displayOrder,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(TEMPLATE_SELECT)
      .single(),
    "Form template could not be created.",
  );
  const schema = createDefaultSchemaForTemplate(template);
  const draft = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .insert({
        template_id: template.id,
        form_type: template.form_type,
        version_number: 1,
        status: "draft",
        schema,
        notes: "Initial draft.",
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(VERSION_SELECT)
      .single(),
    "Form template draft could not be created.",
  );
  return attachTemplateVersions(template, [draft]);
}

export async function duplicateFormTemplate(formType, staff) {
  const source = await getTemplateByType(cleanFormType(formType));
  assertTemplateRendererEditable(source);
  const sourceDraft = await getDraftVersion(source.id);
  const sourcePublished = await getPublishedVersion(source.id);
  const sourceSchema = isLockedDefaultTemplate(source)
    ? sourcePublished?.schema || sourceDraft?.schema || createDefaultSchemaForTemplate(source)
    : sourceDraft?.schema || sourcePublished?.schema || createDefaultSchemaForTemplate(source);
  const label = await uniqueDuplicateLabel(source.label);
  const nextFormType = await uniqueFormTypeSlug(label);
  const displayOrder = await nextDisplayOrder();
  const template = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .insert({
        form_type: nextFormType,
        label,
        description: source.description || "",
        renderer_type: "template",
        active: true,
        worker_visible: false,
        display_order: displayOrder,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(TEMPLATE_SELECT)
      .single(),
    "Form template could not be duplicated.",
  );
  const schema = cleanTemplateSchema(
    {
      ...sourceSchema,
      formType: template.form_type,
      title: label,
      description: sourceSchema?.description ?? source.description ?? "",
    },
    {
      fallbackTitle: label,
      formType: template.form_type,
      allowEmpty: true,
    },
  );
  const draft = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .insert({
        template_id: template.id,
        form_type: template.form_type,
        version_number: 1,
        status: "draft",
        schema,
        notes: `Duplicated from ${source.form_type}.`,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(VERSION_SELECT)
      .single(),
    "Duplicated form template draft could not be created.",
  );
  return attachTemplateVersions(template, [draft]);
}

export async function deleteArchivedFormTemplates(staff) {
  await ensureSeedTemplates();
  const archivedTemplates = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select(TEMPLATE_SELECT)
      .not("archived_at", "is", null)
      .order("label", { ascending: true }),
    "Archived form templates could not be loaded.",
  );
  if (!archivedTemplates.length) {
    return { deleted: 0, rows: [] };
  }

  const deletableTemplates = archivedTemplates.filter((template) =>
    !isLockedDefaultTemplate(template) && canManageTemplateSettings(template, staff)
  );
  if (!deletableTemplates.length) {
    return { deleted: 0, rows: [] };
  }

  const ids = deletableTemplates.map((template) => template.id);
  throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .delete()
      .in("id", ids),
    "Archived form templates could not be deleted.",
  );

  return {
    deleted: deletableTemplates.length,
    rows: deletableTemplates.map((template) => ({
      form_type: template.form_type,
      label: template.label,
    })),
  };
}

export async function lockFormTemplate(formType, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  assertTemplateEditable(template);
  assertTemplateManageable(template, staff);
  if (template.locked_at) return getFormTemplate(template.form_type);

  const updated = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .update({
        locked_at: new Date().toISOString(),
        locked_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id)
      .select(TEMPLATE_SELECT)
      .single(),
    "Form template could not be locked.",
  );
  return getFormTemplate(updated.form_type);
}

export async function unlockFormTemplate(formType, body, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  assertTemplateEditable(template);
  assertTemplateManageable(template, staff);
  await verifyStaffPassword(staff, body?.password);
  if (!template.locked_at) return getFormTemplate(template.form_type);

  const updated = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .update({
        locked_at: null,
        locked_by_staff_id: null,
        updated_by_staff_id: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id)
      .select(TEMPLATE_SELECT)
      .single(),
    "Form template could not be unlocked.",
  );
  return getFormTemplate(updated.form_type);
}

export async function updateFormTemplate(formType, body, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  const bodyKeys = Object.keys(body || {});
  const updatesDisplayOrderOnly =
    bodyKeys.length > 0 &&
    bodyKeys.every((key) => ["displayOrder", "display_order"].includes(key));
  const updatesContentMetaOnly =
    bodyKeys.length > 0 &&
    bodyKeys.every((key) => ["label", "name", "title", "description"].includes(key));
  if (updatesDisplayOrderOnly) {
    assertStaffCanReorderTemplates(staff);
  } else if (updatesContentMetaOnly) {
    assertTemplateContentEditable(template, staff);
  } else {
    assertTemplateSettingsMutable(template, staff, { allowArchived: body?.archived === false });
  }
  const patch = {
    updated_by_staff_id: staff.id,
    updated_at: new Date().toISOString(),
  };
  if (body?.label !== undefined || body?.name !== undefined || body?.title !== undefined) {
    const label = cleanString(body?.label || body?.name || body?.title, MAX_TEXT);
    if (!label) throwBadRequest("Form name is required.");
    patch.label = label;
  }
  if (body?.description !== undefined) {
    patch.description = cleanString(body.description, MAX_TEXT);
  }
  if (body?.active !== undefined) {
    patch.active = Boolean(body.active);
    if (!patch.active) patch.worker_visible = false;
  }
  if (body?.displayOrder !== undefined || body?.display_order !== undefined) {
    const displayOrder = Number(body.displayOrder ?? body.display_order);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 100000) {
      throwBadRequest("Display order is not valid.");
    }
    patch.display_order = displayOrder;
  }
  if (body?.workerVisible !== undefined || body?.worker_visible !== undefined) {
    const visible = Boolean(body.workerVisible ?? body.worker_visible);
    if (visible && (patch.active === false || !template.active)) {
      throwBadRequest("Activate this form before showing it to workers.");
    }
    if (visible && !(await getPublishedVersion(template.id))) {
      throwBadRequest("Publish this form before showing it to workers.");
    }
    patch.worker_visible = visible;
  }
  if (body?.archived !== undefined) {
    patch.archived_at = body.archived ? new Date().toISOString() : null;
    if (body.archived) {
      patch.active = false;
      patch.worker_visible = false;
    }
  }

  const updated = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .update(patch)
      .eq("id", template.id)
      .select(TEMPLATE_SELECT)
      .single(),
    "Form template could not be updated.",
  );
  return getFormTemplate(updated.form_type);
}

export async function saveFormTemplateDraft(formType, body, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  assertTemplateContentEditable(template, staff);
  const cleanedSchema = cleanTemplateSchema(body?.schema, {
    fallbackTitle: template.label,
    formType: template.form_type,
    allowEmpty: true,
  });
  const notes = cleanString(body?.notes, MAX_TEXT);
  const now = new Date().toISOString();
  const existingDraft = await getDraftVersion(template.id);
  let archivedDraft = null;
  if (existingDraft) {
    archivedDraft = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_template_versions")
        .update({
          status: "archived",
          notes: existingDraft.notes || "Saved draft state.",
          updated_by_staff_id: staff.id,
          updated_at: now,
        })
        .eq("id", existingDraft.id)
        .select(VERSION_SELECT)
        .single(),
      "Previous form template draft could not be saved as history.",
    );
  }

  const draft = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .insert({
        template_id: template.id,
        form_type: template.form_type,
        version_number: await nextTemplateVersionNumber(template.id),
        status: "draft",
        schema: cleanedSchema,
        notes,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(VERSION_SELECT)
      .single(),
    "Form template draft could not be created.",
  );
  return { draft, archivedDraft };
}

export async function publishFormTemplateDraft(formType, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  assertTemplateContentEditable(template, staff);
  const draft = await getDraftVersion(template.id);
  if (!draft) throwNotFound("No draft exists for this form.");
  const cleanedSchema = cleanTemplateSchema(draft.schema, {
    fallbackTitle: template.label,
    formType: template.form_type,
  });

  await getSupabaseServiceClient()
    .from("form_template_versions")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("template_id", template.id)
    .eq("status", "published");

  const published = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .update({
        status: "published",
        schema: cleanedSchema,
        published_by_staff_id: staff.id,
        published_at: new Date().toISOString(),
        updated_by_staff_id: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .select(VERSION_SELECT)
      .single(),
    "Form template draft could not be published.",
  );
  await getSupabaseServiceClient()
    .from("form_templates")
    .update({
      active: true,
      updated_by_staff_id: staff.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", template.id);
  return published;
}

export async function restoreFormTemplateVersion(formType, body, staff) {
  const template = await getTemplateByType(cleanFormType(formType));
  assertTemplateContentEditable(template, staff);
  const sourceId = cleanUuid(body?.versionId || body?.version_id, "Version id is not valid.");
  const source = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .eq("id", sourceId)
      .eq("template_id", template.id)
      .maybeSingle(),
    "Form template version could not be loaded.",
  );
  if (!source) throwNotFound("Form template version was not found.");

  const now = new Date().toISOString();
  const existingDraft = await getDraftVersion(template.id);
  let archivedDraft = null;
  if (existingDraft) {
    archivedDraft = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_template_versions")
        .update({
          status: "archived",
          notes: existingDraft.notes || "Saved draft state before restore.",
          updated_by_staff_id: staff.id,
          updated_at: now,
        })
        .eq("id", existingDraft.id)
        .select(VERSION_SELECT)
        .single(),
      "Previous form template draft could not be saved as history.",
    );
  }

  const draft = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .insert({
        template_id: template.id,
        form_type: template.form_type,
        version_number: await nextTemplateVersionNumber(template.id),
        status: "draft",
        schema: source.schema || {},
        notes: `Restored from version ${source.version_number}.`,
        created_by_staff_id: staff.id,
        updated_by_staff_id: staff.id,
      })
      .select(VERSION_SELECT)
      .single(),
    "Form template draft could not be restored.",
  );
  return { draft, archivedDraft };
}

export async function validateTemplateSubmissionFormData({ formType, rawFormData, worker }) {
  const template = await getPublishedWorkerFormTemplate(formType);
  if (template.renderer_type !== "template") {
    return null;
  }
  const version = template.publishedVersion;
  if (!version) throwBadRequest("This form does not have a published template.");
  const schema = cleanTemplateSchema(version.schema, {
    fallbackTitle: template.label,
    formType: template.form_type,
  });
  const rawAnswers = rawFormData?.answers && typeof rawFormData.answers === "object"
    ? rawFormData.answers
    : rawFormData;
  const answers = cleanTemplateAnswers(schema, rawAnswers || {}, worker);
  const actionItemBlocks = cleanTemplateActionItemBlocks(schema, rawFormData || {}, answers, worker);
  return {
    formData: {
      kind: "template_submission_v1",
      version: 1,
      formType: template.form_type,
      templateVersionId: version.id,
      templateVersionNumber: version.version_number,
      templateTitle: schema.title || template.label,
      schemaSnapshot: schema,
      answers,
      actionItemBlocks,
    },
    formTemplateVersionId: version.id,
    formSchemaSnapshot: schema,
  };
}

export function cleanTemplateSubmissionFieldsForSchema(schema, rawFormData, worker) {
  const cleanSchema = cleanTemplateSchema(schema, {
    fallbackTitle: schema?.title || "Form",
    formType: schema?.formType || "",
    allowEmpty: true,
  });
  const rawAnswers = rawFormData?.answers && typeof rawFormData.answers === "object"
    ? rawFormData.answers
    : rawFormData;
  const answers = cleanTemplateAnswers(cleanSchema, rawAnswers || {}, worker);
  return {
    answers,
    actionItemBlocks: cleanTemplateActionItemBlocks(cleanSchema, rawFormData || {}, answers, worker),
  };
}

export function collectTemplateMediaUploadFiles(formData) {
  const schema = cleanTemplateSchema(formData?.schemaSnapshot || {}, {
    fallbackTitle: formData?.templateTitle || formData?.formType || "Form",
    formType: formData?.formType || "",
    allowEmpty: true,
  });
  const answers = formData?.answers && typeof formData.answers === "object" && !Array.isArray(formData.answers)
    ? formData.answers
    : {};
  return getVisibleTemplateSections(schema, answers, null, { includeHiddenFields: true })
    .flatMap((section) => section.fields || [])
    .filter((field) => field.type === "media_upload")
    .flatMap((field) =>
      cleanMediaUploadAnswer(answers[field.id], field.label, field).map((file) => ({
        ...file,
        fieldId: field.id,
        fieldLabel: field.label,
      })),
    );
}

export function buildTemplateSubmissionNotes(formType, formData) {
  const schema = formData?.schemaSnapshot || {};
  const answers = formData?.answers || {};
  const title = schema.title || formData?.templateTitle || formType;
  const parts = [title];
  const firstFields = getVisibleTemplateSections(schema, answers, null, { includeHiddenFields: true })
    .flatMap((section) => section.fields || [])
    .filter((field) => !isTemplateNonAnswerField(field) && answers[field.id] !== undefined)
    .slice(0, 3);
  firstFields.forEach((field) => {
    const value = formatAnswerForNotes(field, answers[field.id]);
    if (value) parts.push(`${field.label}: ${value}`);
  });
  const actionItemCount = Object.values(formData?.actionItemBlocks || {}).reduce(
    (count, block) => count + (Array.isArray(block?.rows) ? block.rows.length : 0),
    0,
  );
  if (actionItemCount) {
    parts.push(`${actionItemCount} action item${actionItemCount === 1 ? "" : "s"}`);
  }
  return parts.join(" / ").slice(0, MAX_LONG_TEXT);
}

export function cleanTemplateSchema(value, { fallbackTitle = "Form", formType = "", allowEmpty = false } = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const sections = Array.isArray(source.sections) ? source.sections : [];
  let fieldCount = 0;
  const cleanedSections = sections
    .slice(0, MAX_SECTIONS)
    .map((section, sectionIndex) => {
      const fields = (Array.isArray(section?.fields) ? section.fields : [])
        .slice(0, MAX_FIELDS - fieldCount)
        .map((field, fieldIndex) => cleanTemplateField(field, sectionIndex, fieldIndex))
        .filter(Boolean);
      fieldCount += fields.length;
      return {
        id: cleanId(section?.id) || `section_${sectionIndex + 1}`,
        title: cleanString(section?.title, MAX_TEXT),
        description: cleanString(section?.description, MAX_TEXT),
        settings: cleanSettingsObject(section?.settings),
        fields,
      };
    })
    .filter((section) => allowEmpty || section.fields.length);

  if (!cleanedSections.length && !allowEmpty) {
    throwBadRequest("Add at least one section with one field.");
  }

  const fieldIds = new Set();
  cleanedSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (fieldIds.has(field.id)) {
        throwBadRequest(`Field id "${field.id}" is used more than once.`);
      }
      fieldIds.add(field.id);
    });
  });

  return {
    schemaVersion: 1,
    formType: cleanString(source.formType || formType, 80),
    title: cleanString(source.title, MAX_TEXT) || fallbackTitle,
    description: cleanString(source.description, MAX_TEXT),
    sections: cleanedSections,
  };
}

function cleanTemplateField(field, sectionIndex, fieldIndex) {
  const type = TEMPLATE_FIELD_TYPES.includes(field?.type) ? field.type : "short_text";
  const labelMax = type === "instructions" ? MAX_LONG_TEXT : MAX_TEXT;
  const label = cleanString(field?.label, labelMax) || `Field ${fieldIndex + 1}`;
  const options = ["dropdown", "multi_select"].includes(type)
    ? cleanOptions(field?.options)
    : [];
  if (["dropdown", "multi_select"].includes(type) && !options.length) {
    throwBadRequest(`${label} needs at least one option.`);
  }
  return {
    id: cleanId(field?.id) || `section_${sectionIndex + 1}_field_${fieldIndex + 1}`,
    type,
    label,
    helperText: cleanString(field?.helperText || field?.helper_text, MAX_TEXT),
    required: isTemplateNonAnswerType(type) ? false : Boolean(field?.required),
    default: isTemplateNonAnswerType(type) ? "" : cleanDefaultValue(field?.default),
    remember: isTemplateNonAnswerType(type) ? false : Boolean(field?.remember),
    options,
    settings: cleanSettingsObject(field?.settings),
  };
}

function cleanSettingsObject(value, depth = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  if (depth > MAX_SETTINGS_DEPTH) return {};
  const entries = Object.entries(value).slice(0, MAX_SETTINGS_KEYS);
  const cleaned = {};
  entries.forEach(([rawKey, rawValue]) => {
    const key = cleanSettingsKey(rawKey);
    if (!key) return;
    const cleanedValue = cleanSettingsValue(rawValue, depth + 1);
    if (cleanedValue !== undefined) cleaned[key] = cleanedValue;
  });
  return cleaned;
}

function cleanSettingsValue(value, depth = 0) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "string") return cleanString(value, MAX_TEXT);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_OPTIONS)
      .map((item) => cleanSettingsValue(item, depth + 1))
      .filter((item) => item !== undefined && item !== null && item !== "");
  }
  if (typeof value === "object") {
    if (depth > MAX_SETTINGS_DEPTH) return {};
    return cleanSettingsObject(value, depth + 1);
  }
  return "";
}

function getSettingValue(settings, key) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return undefined;
  if (Object.prototype.hasOwnProperty.call(settings, key)) return settings[key];
  const target = String(key || "").toLowerCase();
  const match = Object.keys(settings).find((item) => item.toLowerCase() === target);
  return match ? settings[match] : undefined;
}

function templateFieldIsHidden(field) {
  return getSettingValue(field?.settings, "hidden") === true;
}

function normalizeTemplateVisibilitySettings(settings = {}) {
  const source = getSettingValue(settings, "visibility");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const sourceFieldId = cleanId(raw.sourceFieldId || raw.fieldId || raw.source);
  const operator = TEMPLATE_VISIBILITY_OPERATORS.has(raw.operator) ? raw.operator : "equals";
  let value = raw.value;
  if (Array.isArray(value)) value = value[0] ?? "";
  if (value === null || value === undefined) value = "";
  return {
    enabled: Boolean(raw.enabled && sourceFieldId),
    sourceFieldId,
    operator,
    value,
  };
}

function normalizeVisibilityValueForField(field, value) {
  if (["boolean", "toggle", "checkbox"].includes(field?.type)) {
    if (value === true || value === false) return value;
    const text = cleanString(value, 20).toLowerCase();
    return ["true", "yes", "1", "on"].includes(text);
  }
  return cleanString(value, MAX_TEXT);
}

function templateBlockConditionIsVisible(block, schema, answers = {}, worker = null) {
  const visibility = normalizeTemplateVisibilitySettings(block?.settings);
  if (!visibility.enabled) return true;
  const sourceField = collectTemplateFields(schema).find((field) => field.id === visibility.sourceFieldId);
  if (!sourceField) return true;
  const rawValue = answers?.[sourceField.id] === undefined ? defaultForField(sourceField, worker) : answers[sourceField.id];
  const expected = normalizeVisibilityValueForField(sourceField, visibility.value);
  if (Array.isArray(rawValue)) {
    const actualValues = rawValue.map((item) => cleanString(item, MAX_TEXT));
    const includes = actualValues.includes(cleanString(expected, MAX_TEXT));
    return visibility.operator === "not_contains" || visibility.operator === "not_equals" ? !includes : includes;
  }
  const actual = normalizeVisibilityValueForField(sourceField, rawValue);
  const matches = actual === expected;
  if (visibility.operator === "not_equals" || visibility.operator === "not_contains") return !matches;
  return matches;
}

function getVisibleTemplateSections(schema, answers = {}, worker = null, { includeHiddenFields = false } = {}) {
  return (schema?.sections || [])
    .filter((section) => templateBlockConditionIsVisible(section, schema, answers, worker))
    .map((section) => ({
      ...section,
      fields: (section.fields || []).filter((field) =>
        templateBlockConditionIsVisible(field, schema, answers, worker) &&
        (includeHiddenFields || !templateFieldIsHidden(field)),
      ),
    }))
    .filter((section) => section.fields.length);
}

function cleanMediaUploadKinds(settings = {}) {
  const source = getSettingValue(settings, "mediaUpload");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const acceptedKinds = Array.isArray(raw.acceptedKinds)
    ? raw.acceptedKinds.filter((kind) => MEDIA_UPLOAD_KIND_EXTENSIONS[kind])
    : [];
  return acceptedKinds.length ? [...new Set(acceptedKinds)] : DEFAULT_MEDIA_UPLOAD_KINDS;
}

function allowedMediaExtensionsForField(field) {
  return new Set(cleanMediaUploadKinds(field?.settings).flatMap((kind) => MEDIA_UPLOAD_KIND_EXTENSIONS[kind]));
}

function mediaUploadAcceptedKindsLabel(field) {
  return cleanMediaUploadKinds(field?.settings)
    .map((kind) => {
      if (kind === "image") return "JPG, PNG, WEBP, or HEIC";
      if (kind === "pdf") return "PDF";
      if (kind === "excel") return "XLS or XLSX";
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function cleanTemplateActionItemBlocks(schema, rawFormData, answers = {}, worker = null) {
  const source = rawFormData && typeof rawFormData === "object" && !Array.isArray(rawFormData)
    ? rawFormData
    : {};
  const rawBlocks = source.actionItemBlocks && typeof source.actionItemBlocks === "object" && !Array.isArray(source.actionItemBlocks)
    ? source.actionItemBlocks
    : source.action_item_blocks && typeof source.action_item_blocks === "object" && !Array.isArray(source.action_item_blocks)
      ? source.action_item_blocks
      : {};
  const blocks = {};
  getVisibleTemplateSections(schema, answers, worker)
    .flatMap((section) => section.fields || [])
    .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
    .forEach((field) => {
      blocks[field.id] = cleanTemplateActionItemBlock(field, rawBlocks[field.id]);
    });
  return blocks;
}

function cleanTemplateActionItemBlock(field, rawBlock) {
  const source = rawBlock && typeof rawBlock === "object" && !Array.isArray(rawBlock) ? rawBlock : {};
  const noItems = Boolean(source.noItems || source.noActionItems || source.no_deficiencies);
  if (noItems) return { noItems: true, rows: [] };
  const settings = normalizeActionItemRowsSettings(field.settings);
  const rows = (Array.isArray(source.rows) ? source.rows : [])
    .map((row) => cleanTemplateActionItemRow(row, settings))
    .filter(actionItemRowHasMeaningfulValue)
    .slice(0, 50);
  if (!rows.length) {
    throwBadRequest(`${field.label}: add a row or mark none needed.`);
  }
  rows.forEach((row, index) => {
    if (!row.description) throwBadRequest(`${field.label} row ${index + 1} needs a description.`);
  });
  return { noItems: false, rows };
}

function normalizeActionItemRowsSettings(settings = {}) {
  const source = getSettingValue(settings, "actionItemRows");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const rawFields = Array.isArray(raw.subfields) ? raw.subfields : Array.isArray(raw.fields) ? raw.fields : [];
  const rawFieldMap = new Map();
  rawFields.forEach((field) => {
    const key = cleanString(field?.key, 80);
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

function cleanTemplateActionItemRow(row, settings) {
  const source = row && typeof row === "object" && !Array.isArray(row) ? row : {};
  const visible = new Set(settings.filter((field) => field.visible || field.lockedVisible).map((field) => field.key));
  return ACTION_ITEM_ROW_FIELD_CONFIGS.reduce((cleaned, config) => {
    if (!visible.has(config.key) && !config.lockedVisible) {
      cleaned[config.key] = config.defaultValue;
      return cleaned;
    }
    if (config.key === "dueDate") {
      const value = cleanString(source[config.key], 20);
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throwBadRequest("Suggested due date must be a valid date.");
      cleaned[config.key] = value;
      return cleaned;
    }
    cleaned[config.key] = cleanString(source[config.key] ?? config.defaultValue, config.key === "description" || config.key === "immediateControl" || config.key === "recommendedAction" ? MAX_LONG_TEXT : MAX_TEXT);
    if (config.key === "priority" && !["low", "medium", "high", "critical"].includes(cleaned[config.key])) {
      cleaned[config.key] = "medium";
    }
    return cleaned;
  }, {});
}

function actionItemRowHasMeaningfulValue(row) {
  return Object.entries(row || {}).some(([key, value]) => {
    if (key === "priority" && value === "medium") return false;
    return Boolean(cleanString(value, MAX_TEXT));
  });
}

function cleanTemplateAnswers(schema, value, worker) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const answers = {};
  const fields = getVisibleTemplateSections(schema, source, worker, { includeHiddenFields: true })
    .flatMap((section) => section.fields || []);
  for (const field of fields) {
    if (isTemplateNonAnswerField(field)) continue;
    const raw = source[field.id] === undefined ? defaultForField(field, worker) : source[field.id];
    const cleaned = cleanAnswer(field, raw);
    if (!templateFieldIsHidden(field) && field.required && isEmptyAnswer(field, cleaned)) {
      throwBadRequest(`${field.label} is required.`);
    }
    answers[field.id] = cleaned;
  }
  return answers;
}

function cleanAnswer(field, raw) {
  if (field.type === "number") {
    if (isPhoneLikeTemplateField(field)) return cleanString(raw, MAX_TEXT);
    if (raw === "" || raw === null || raw === undefined) return "";
    const number = Number(raw);
    if (!Number.isFinite(number)) throwBadRequest(`${field.label} must be a number.`);
    if (getSettingValue(field.settings, "numberMode") === "integer" && !Number.isInteger(number)) {
      throwBadRequest(`${field.label} must be a whole number.`);
    }
    return number;
  }
  if (field.type === "date") {
    const value = cleanString(raw, 20);
    if (!value) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throwBadRequest(`${field.label} must be a valid date.`);
    return value;
  }
  if (field.type === "time") {
    const value = cleanString(raw, 20);
    if (!value) return "";
    if (!/^\d{2}:\d{2}$/.test(value)) throwBadRequest(`${field.label} must be a valid time.`);
    return value;
  }
  if (field.type === "yes_no") {
    const value = cleanString(raw, 20).toLowerCase();
    if (!value) return "";
    if (!["yes", "no"].includes(value)) throwBadRequest(`${field.label} must be yes or no.`);
    return value;
  }
  if (field.type === "boolean" || field.type === "toggle") {
    return cleanBooleanAnswer(raw, field.label);
  }
  if (field.type === "checkbox") {
    return raw === true;
  }
  if (field.type === "dropdown") {
    const value = cleanString(raw, MAX_TEXT);
    if (!value) return "";
    if (!field.options.includes(value)) throwBadRequest(`${field.label} has an invalid option.`);
    return value;
  }
  if (field.type === "multi_select") {
    const values = Array.isArray(raw) ? raw : [];
    const allowed = new Set(field.options);
    return values
      .map((item) => cleanString(item, MAX_TEXT))
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
      .filter((item) => allowed.has(item))
      .slice(0, MAX_OPTIONS);
  }
  if (field.type === "media_upload") return cleanMediaUploadAnswer(raw, field.label, field);
  if (field.type === "asset_picker") return cleanAssetPickerAnswer(raw);
  if (field.type === "signature") return cleanSignatureDataUrl(raw, field.label);
  const max = field.type === "long_text" ? MAX_LONG_TEXT : MAX_TEXT;
  return cleanString(raw, max);
}

function isEmptyAnswer(field, value) {
  if (field.type === "boolean" || field.type === "toggle") return false;
  if (field.type === "checkbox") return value !== true;
  if (field.type === "multi_select") return !value.length;
  if (field.type === "media_upload") return !Array.isArray(value) || !value.length;
  if (field.type === "asset_picker") return !value;
  return value === "" || value === null || value === undefined;
}

function cleanBooleanAnswer(raw, label) {
  if (raw === true || raw === false) return raw;
  const value = cleanString(raw, 20).toLowerCase();
  if (!value) return false;
  if (["true", "yes", "1", "on"].includes(value)) return true;
  if (["false", "no", "0", "off"].includes(value)) return false;
  throwBadRequest(`${label} must be true or false.`);
}

function cleanMediaUploadAnswer(raw, label, field = null) {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.files)
      ? raw.files
      : [];
  if (source.length > MAX_MEDIA_UPLOAD_FILES) {
    throwBadRequest(`${label} allows ${MAX_MEDIA_UPLOAD_FILES} files or fewer.`);
  }
  return source.map((file) => cleanMediaUploadFile(file, label, field));
}

function cleanAssetPickerAnswer(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const assetId = cleanString(source.assetId || source.asset_id || source.id, 120);
  const name = cleanString(source.name || source.assetName || source.asset_name, MAX_TEXT);
  const assetType = cleanString(source.assetType || source.asset_type || source.type, MAX_TEXT);
  const serialNumber = cleanString(source.serialNumber || source.serial_number || source.vin || source.serial, MAX_TEXT);
  const currentSite = cleanString(source.currentSite || source.current_site || source.site, MAX_TEXT);
  const status = cleanString(source.status, 80);
  const model = cleanString(source.model, MAX_TEXT);
  const year = cleanString(source.year, 40);
  const hours = source.hours === "" || source.hours === null || source.hours === undefined ? "" : Number(source.hours);
  const kmsMiles = cleanString(source.kmsMiles || source.kms_miles, MAX_TEXT);
  const description = cleanString(source.description, MAX_LONG_TEXT);
  const selectedAt = cleanString(source.selectedAt || source.selected_at, 80);
  if (!assetId && !name && !serialNumber) return null;
  return {
    assetId,
    name,
    assetType,
    serialNumber,
    currentSite,
    status,
    model,
    year,
    hours: Number.isFinite(hours) ? hours : "",
    kmsMiles,
    description,
    selectedAt,
  };
}

function assetPickerAnswerText(value) {
  const asset = cleanAssetPickerAnswer(value);
  if (!asset) return "";
  const details = [];
  if (asset.assetType) details.push(asset.assetType);
  if (asset.model) details.push(`Model: ${asset.model}`);
  if (asset.serialNumber) details.push(`Serial/VIN: ${asset.serialNumber}`);
  if (asset.year) details.push(`Year: ${asset.year}`);
  if (asset.hours !== "" && asset.hours !== null && asset.hours !== undefined) details.push(`Hours: ${asset.hours}`);
  if (asset.kmsMiles) details.push(`Kms/Miles: ${asset.kmsMiles}`);
  if (asset.currentSite) details.push(`Site: ${asset.currentSite}`);
  if (asset.status) details.push(asset.status);
  return [asset.name || "Selected asset", details.join(" / ")].filter(Boolean).join(" / ");
}

function cleanMediaUploadFile(file, label, field = null) {
  const source = file && typeof file === "object" && !Array.isArray(file) ? file : {};
  const originalFilename = cleanString(source.originalFilename || source.original_filename || source.name, MAX_TEXT);
  const storagePath = cleanString(source.storagePath || source.storage_path, 1000);
  const extension = mediaUploadFileExtension(originalFilename);
  const allowedMimeTypes = MEDIA_UPLOAD_EXTENSIONS[extension] || [];
  const allowedExtensions = field ? allowedMediaExtensionsForField(field) : new Set(Object.keys(MEDIA_UPLOAD_EXTENSIONS));
  const rawMimeType = cleanString(source.mimeType || source.mime_type || source.type, 160).toLowerCase();
  const mimeType = GENERIC_MEDIA_MIME_TYPES.includes(rawMimeType)
    ? allowedMimeTypes[0] || "application/octet-stream"
    : rawMimeType;
  const sizeBytes = Number(source.sizeBytes || source.size_bytes || source.size || 0);
  if (!originalFilename || !storagePath) {
    throwBadRequest(`${label} upload metadata is incomplete.`);
  }
  if (!allowedMimeTypes.length || !allowedExtensions.has(extension)) {
    throwBadRequest(`${label} only accepts ${mediaUploadAcceptedKindsLabel(field || { settings: {} })} files.`);
  }
  if (!allowedMimeTypes.includes(mimeType)) {
    throwBadRequest(`${label} file extension and file type do not match.`);
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes < 1) {
    throwBadRequest(`${label} file size is required.`);
  }
  if (sizeBytes > MAX_MEDIA_UPLOAD_FILE_BYTES) {
    throwBadRequest(`${label} files must be 50 MiB or smaller.`);
  }
  return {
    storagePath,
    originalFilename,
    mimeType,
    sizeBytes,
  };
}

function mediaUploadFileExtension(name) {
  const value = cleanString(name, MAX_TEXT).toLowerCase();
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index) : "";
}

function isPhoneLikeTemplateField(field) {
  if (!["short_text", "number"].includes(field?.type)) return false;
  const signal = [
    field.id,
    field.label,
    field.default,
    getSettingValue(field.settings, "defaultValue"),
  ].filter(Boolean).join(" ").toLowerCase();
  return /(^|[^a-z])(phone|telephone|mobile|cell|tel)([^a-z]|$)/.test(signal) ||
    signal.includes("worker_phone");
}

function defaultForField(field, worker) {
  if (field.default === "today") return getVancouverDate();
  if (field.default === "now") return getVancouverTime();
  if (field.default === "worker_name") return worker?.name || "";
  if (field.default === "worker_phone") return worker?.phone || "";
  if (field.default === "worker_username") return worker?.username || worker?.user_name || "";
  if (field.default === "worker_company") return worker?.company || "";
  if (field.default === "worker_address") return worker?.address || worker?.street_address || "";
  const staticDefault = normalizeStaticDefaultForField(field, getSettingValue(field.settings, "defaultValue"));
  if (field.type === "multi_select") {
    if (staticDefault.length) return staticDefault;
  } else if (field.type === "boolean" || field.type === "toggle" || field.type === "checkbox") {
    if (staticDefault === true) return true;
  } else if (staticDefault !== "") {
    return staticDefault;
  }
  if (field.type === "media_upload") return [];
  if (field.type === "asset_picker") return null;
  if (field.type === "boolean" || field.type === "toggle") return false;
  if (field.type === "checkbox") return false;
  return "";
}

function normalizeStaticDefaultForField(field, value) {
  if (field.type === "multi_select") {
    const values = Array.isArray(value)
      ? value
      : cleanString(value, MAX_LONG_TEXT).split(",");
    const allowed = new Set(field.options || []);
    return values
      .map((item) => cleanString(item, MAX_TEXT))
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
      .filter((item) => allowed.has(item))
      .slice(0, MAX_OPTIONS);
  }
  if (field.type === "boolean" || field.type === "toggle" || field.type === "checkbox") {
    if (value === true || value === false) return value;
    const text = cleanString(value, MAX_TEXT).toLowerCase();
    return ["true", "yes", "1", "on", "checked"].includes(text);
  }
  const staticDefault = cleanString(
    value,
    field.type === "long_text" ? MAX_LONG_TEXT : MAX_TEXT,
  );
  if (!staticDefault) return "";
  if (field.type === "yes_no") {
    const normalized = staticDefault.toLowerCase();
    return ["yes", "no"].includes(normalized) ? normalized : "";
  }
  if (field.type === "dropdown") {
    return field.options.includes(staticDefault) ? staticDefault : "";
  }
  if (["short_text", "long_text", "number", "date", "time"].includes(field.type)) return staticDefault;
  return "";
}

function getVancouverTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function collectTemplateFields(schema) {
  return (schema?.sections || []).flatMap((section) => section.fields || []);
}

function isTemplateNonAnswerType(type) {
  return type === "instructions" || type === "spacer" || TEMPLATE_SPECIAL_BLOCK_TYPES.has(type);
}

function isTemplateNonAnswerField(field) {
  return isTemplateNonAnswerType(field?.type);
}

async function ensureSeedTemplates() {
  const existing = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select("form_type")
      .limit(1),
    "Form templates could not be loaded.",
  );
  return existing;
}

async function getTemplateByType(formType) {
  await ensureSeedTemplates();
  const template = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select(TEMPLATE_SELECT)
      .eq("form_type", formType)
      .maybeSingle(),
    "Form template could not be loaded.",
  );
  if (!template) throwNotFound("Form template was not found.");
  return template;
}

async function getTemplateById(id) {
  const template = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select(TEMPLATE_SELECT)
      .eq("id", id)
      .maybeSingle(),
    "Form template could not be loaded.",
  );
  if (!template) throwNotFound("Form template was not found.");
  return template;
}

async function uniqueFormTypeSlug(label) {
  const base = slugifyFormType(label) || "new-form";
  for (let index = 0; index < 100; index += 1) {
    const candidate = index ? `${base}-${index + 1}` : base;
    const existing = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_templates")
        .select("id")
        .eq("form_type", candidate)
        .maybeSingle(),
      "Form template could not be checked.",
    );
    if (!existing) return candidate;
  }
  throwBadRequest("Could not create a unique form URL.");
}

async function uniqueDuplicateLabel(label) {
  const base = cleanString(`${label || "Form"} copy`, MAX_TEXT);
  for (let index = 0; index < 100; index += 1) {
    const candidate = index ? cleanString(`${base} ${index + 1}`, MAX_TEXT) : base;
    const existing = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("form_templates")
        .select("id")
        .eq("label", candidate)
        .maybeSingle(),
      "Form template could not be checked.",
    );
    if (!existing) return candidate;
  }
  throwBadRequest("Could not create a unique duplicate name.");
}

async function nextDisplayOrder() {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_templates")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Form templates could not be checked.",
  );
  return Number(row?.display_order || 1000) + 10;
}

async function getPublishedVersion(templateId) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .eq("template_id", templateId)
      .eq("status", "published")
      .maybeSingle(),
    "Published form template could not be loaded.",
  );
}

async function getDraftVersion(templateId) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select(VERSION_SELECT)
      .eq("template_id", templateId)
      .eq("status", "draft")
      .maybeSingle(),
    "Form template draft could not be loaded.",
  );
}

async function nextTemplateVersionNumber(templateId) {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_versions")
      .select("version_number")
      .eq("template_id", templateId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Form template version number could not be loaded.",
  );
  return Number(row?.version_number || 0) + 1;
}

function attachTemplateVersions(template, versions) {
  const related = versions.filter((version) => version.template_id === template.id);
  return {
    ...template,
    draftVersion: related.find((version) => version.status === "draft") || null,
    publishedVersion: related.find((version) => version.status === "published") || null,
    versions: related,
  };
}

async function withTemplateShareLink(template) {
  const [withLink] = await attachTemplateShareLinks([template]);
  return withLink || template;
}

async function attachTemplateShareLinks(templates) {
  if (!templates.length) return templates;
  const eligibleTemplates = templates.filter(isTemplateShareLinkEligible);
  const byTemplateId = new Map();

  if (eligibleTemplates.length) {
    const templateIds = eligibleTemplates.map((template) => template.id);
    try {
      const existingLinks = throwIfSupabaseError(
        await getSupabaseServiceClient()
          .from("form_template_share_links")
          .select(SHARE_LINK_SELECT)
          .in("template_id", templateIds),
        "Form QR links could not be loaded.",
      );
      existingLinks.forEach((link) => {
        byTemplateId.set(link.template_id, link);
      });

      const missingOrInactive = eligibleTemplates.filter((template) => {
        const link = byTemplateId.get(template.id);
        return !link || !link.active || link.form_type !== template.form_type || !link.slug;
      });
      for (const template of missingOrInactive) {
        const link = await upsertTemplateShareLink(template, byTemplateId.get(template.id));
        byTemplateId.set(template.id, link);
      }
    } catch (error) {
      if (!isSupabaseMissingRelationError(error)) throw error;
    }
  }

  return templates.map((template) => ({
    ...template,
    shareLink: isTemplateShareLinkEligible(template)
      ? publicTemplateShareLink(byTemplateId.get(template.id))
      : null,
  }));
}

async function upsertTemplateShareLink(template, existingLink = null) {
  const slug = existingLink?.slug || await uniqueShareLinkSlug(template, existingLink?.id);
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_template_share_links")
      .upsert(
        {
          template_id: template.id,
          form_type: template.form_type,
          slug,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "template_id" },
      )
      .select(SHARE_LINK_SELECT)
      .single(),
    "Form QR link could not be assigned.",
  );
}

async function uniqueShareLinkSlug(template, existingLinkId = "") {
  const baseSlug = slugifyFormType(template?.label || template?.form_type || "form") || "form";
  let candidate = baseSlug;
  let suffix = 2;

  while (await shareLinkSlugExists(candidate, existingLinkId)) {
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, Math.max(1, 64 - suffixText.length)).replace(/-+$/g, "")}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

async function shareLinkSlugExists(slug, existingLinkId = "") {
  let query = getSupabaseServiceClient()
    .from("form_template_share_links")
    .select("id")
    .eq("slug", slug)
    .limit(1);
  if (existingLinkId) query = query.neq("id", existingLinkId);
  const rows = throwIfSupabaseError(await query, "Form QR link slug could not be checked.");
  return rows.length > 0;
}

function isTemplateShareLinkEligible(template) {
  return Boolean(
    template?.id &&
      template.active &&
      template.worker_visible &&
      !template.archived_at &&
      template.publishedVersion,
  );
}

function publicTemplateShareLink(link) {
  if (!link?.token || !link.active) return null;
  const token = String(link.token);
  const slug = String(link.slug || "").trim();
  return {
    id: link.id,
    token,
    slug,
    active: Boolean(link.active),
    urlPath: `/form-links/${slug || token}`,
    tokenUrlPath: `/form-links/${token}`,
    created_at: link.created_at || null,
    updated_at: link.updated_at || null,
  };
}

function isLockedDefaultTemplate(templateOrType) {
  const formType = typeof templateOrType === "string" ? templateOrType : templateOrType?.form_type;
  return LOCKED_DEFAULT_FORM_TYPES.includes(formType);
}

function isAdminOrOwner(staff) {
  return ["owner", "admin"].includes(staff?.role);
}

function canManageTemplateSettings(template, staff) {
  if (isAdminOrOwner(staff)) return true;
  return Boolean(
    staff?.id &&
    template?.created_by_staff_id &&
    template.created_by_staff_id === staff.id,
  );
}

function assertStaffCanReorderTemplates(staff) {
  if (isAdminOrOwner(staff)) return;
  throwForbidden("Only admin and owner accounts can change form template order.");
}

function assertTemplateManageable(template, staff) {
  if (canManageTemplateSettings(template, staff)) return;
  throwForbidden("You can only manage form templates you created.");
}

function assertTemplateRendererEditable(template) {
  if (template.renderer_type !== "template") {
    throwBadRequest("This form uses a special mobile renderer. Editable fields will be added in a later phase.");
  }
}

function assertTemplateEditable(template) {
  assertTemplateRendererEditable(template);
  if (isLockedDefaultTemplate(template)) {
    throwBadRequest("Default forms are protected. Duplicate this form to make an editable copy.");
  }
}

function assertTemplateUnlocked(template) {
  if (!template.locked_at) return;
  throwLocked("This form template is locked. Unlock it to edit.");
}

function assertTemplateNotArchived(template) {
  if (!template.archived_at) return;
  throwBadRequest("Restore this archived form before editing it.");
}

function assertTemplateContentEditable(template, staff) {
  if (staff?.id) {
    assertTemplateEditable(template);
    assertTemplateNotArchived(template);
    assertTemplateUnlocked(template);
    return;
  }
  throwForbidden("Staff sign-in is required to edit form templates.");
}

function assertTemplateSettingsMutable(template, staff, { allowArchived = false } = {}) {
  assertTemplateEditable(template);
  assertTemplateManageable(template, staff);
  if (!allowArchived) assertTemplateNotArchived(template);
  assertTemplateUnlocked(template);
}

function createDefaultSchemaForTemplate(template) {
  return {
    schemaVersion: 1,
    formType: template.form_type,
    title: template.label,
    description: template.description || "",
    sections: [],
  };
}

function formatAnswerForNotes(field, value) {
  if (field.type === "checkbox") return value ? "Yes" : "";
  if (field.type === "boolean" || field.type === "toggle") return value ? "Yes" : "No";
  if (field.type === "media_upload") {
    const files = Array.isArray(value) ? value : [];
    if (!files.length) return "";
    return `${files.length} file${files.length === 1 ? "" : "s"}`;
  }
  if (field.type === "asset_picker") return assetPickerAnswerText(value);
  if (field.type === "signature") return cleanSignatureDataUrl(value, field.label) ? "Signed" : "";
  if (field.type === "multi_select") return Array.isArray(value) ? value.slice(0, 3).join(", ") : "";
  if (field.type === "yes_no") return value === "yes" ? "Yes" : value === "no" ? "No" : "";
  return cleanString(value, 120);
}

function cleanSignatureDataUrl(raw, label = "Signature") {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  if (value.length > MAX_SIGNATURE_DATA_URL) throwBadRequest(`${label} signature is too large.`);
  if (!SIGNATURE_DATA_URL_PATTERN.test(value)) throwBadRequest(`${label} must be a valid signature image.`);
  return value;
}

function cleanOptions(value) {
  const options = Array.isArray(value) ? value : [];
  return options
    .map((item) => cleanString(item, MAX_TEXT))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, MAX_OPTIONS);
}

function cleanDefaultValue(value) {
  const cleaned = cleanString(value, 80);
  return TEMPLATE_DEFAULT_VALUES.has(cleaned) ? cleaned : "";
}

function cleanFormType(value) {
  const formType = cleanString(value, 80);
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(formType)) throwBadRequest("Form type is not valid.");
  return formType;
}

function cleanShareIdentifier(value) {
  const identifier = cleanString(value, 80).toLowerCase();
  if (!isShareToken(identifier) && !isShareSlug(identifier)) {
    throwNotFound("Form QR link was not found.");
  }
  return identifier;
}

function isShareToken(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(String(value || ""));
}

function isShareSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ""));
}

function slugifyFormType(value) {
  return cleanString(value, 80)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

function cleanString(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanSettingsKey(value) {
  return cleanString(value, 80)
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanId(value) {
  return cleanString(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanUuid(value, message) {
  const id = cleanString(value, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throwBadRequest(message);
  }
  return id;
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function throwForbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

function throwLocked(message) {
  const error = new Error(message);
  error.statusCode = 423;
  error.exposeMessage = true;
  throw error;
}

function throwNotFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  throw error;
}
