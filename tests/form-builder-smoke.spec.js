import fs from "node:fs";
import { expect, test } from "@playwright/test";

const staff = {
  id: "staff-smoke",
  role: "owner",
  username: "gbird",
  display_name: "Garnet Bird",
  email: "garnet@example.com",
};

const worker = {
  id: "worker-smoke",
  name: "Garnet Bird",
  phone: "6045550100",
  company: "Appia",
  username: "gbird",
};

function version(formType, schema, number = 7) {
  return {
    id: `${formType}-version-${number}`,
    form_type: formType,
    version_number: number,
    status: "published",
    schema,
  };
}

function template(formType, label, schema, overrides = {}) {
  const publishedVersion = version(formType, schema, overrides.versionNumber || 7);
  return {
    id: `${formType}-template`,
    form_type: formType,
    label,
    description: schema.description || "",
    renderer_type: "template",
    active: true,
    worker_visible: true,
    archived_at: null,
    locked_at: null,
    locked_by_staff_id: null,
    display_order: overrides.displayOrder || 10,
    created_by_staff_id: overrides.created_by_staff_id === undefined ? staff.id : overrides.created_by_staff_id,
    updated_by_staff_id: overrides.updated_by_staff_id === undefined ? staff.id : overrides.updated_by_staff_id,
    draftVersion: null,
    publishedVersion,
    versions: [publishedVersion],
    ...overrides,
  };
}

function draftTemplate(formType, label, schema, overrides = {}) {
  const draftVersion = {
    ...version(formType, schema, overrides.versionNumber || 1),
    status: "draft",
    published_at: null,
  };
  return {
    id: `${formType}-template`,
    form_type: formType,
    label,
    description: schema.description || "",
    renderer_type: "template",
    active: true,
    worker_visible: false,
    archived_at: null,
    locked_at: null,
    locked_by_staff_id: null,
    display_order: overrides.displayOrder || 40,
    created_by_staff_id: overrides.created_by_staff_id === undefined ? staff.id : overrides.created_by_staff_id,
    updated_by_staff_id: overrides.updated_by_staff_id === undefined ? staff.id : overrides.updated_by_staff_id,
    draftVersion,
    publishedVersion: null,
    versions: [draftVersion],
    ...overrides,
  };
}

function readMigrationSchema(filename, tag = "schema") {
  const sql = fs.readFileSync(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8");
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(new RegExp(`\\$${escapedTag}\\$\\s*([\\s\\S]*?)\\s*\\$${escapedTag}\\$::jsonb`));
  if (!match) throw new Error(`Could not find ${tag} block in ${filename}`);
  return JSON.parse(match[1]);
}

const newWorkerOrientationSchema = readMigrationSchema("019_new_worker_orientation_template.sql");
const salusToolboxTalkSchema = readMigrationSchema("021_salus_toolbox_talk_template.sql");
const legacyBuildingBlockMigration = "023_legacy_building_block_templates.sql";
const speedFanInspectionSchema = readMigrationSchema(legacyBuildingBlockMigration, "speed_fan_schema");
const hoistCompetencyObservationSchema = readMigrationSchema(legacyBuildingBlockMigration, "hoist_schema");
const fallProtectionSchema = readMigrationSchema("024_fall_protection_template.sql");
const dailySafetyInspectionSchema = readMigrationSchema("025_daily_safety_inspection_template.sql");

const requiredSignatureSection = {
  id: "signature_section",
  title: "Signature Section",
  description: "",
  fields: [
    {
      id: "signature",
      type: "signature",
      label: "Signature",
      required: true,
      helperText: "",
    },
  ],
};

const optionalMediaSection = {
  id: "media_section",
  title: "Media Section",
  description: "",
  fields: [
    {
      id: "media_upload",
      type: "media_upload",
      label: "Photo attachments",
      required: false,
      helperText: "",
    },
  ],
};

const toolboxSignatureSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Talk Smoke",
  description: "Toolbox smoke template.",
  sections: [requiredSignatureSection, optionalMediaSection],
};

const smokeSignatureDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const toolboxAttendanceSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Attendance Smoke",
  description: "Toolbox attendance smoke template.",
  sections: [
    {
      id: "attendance",
      title: "Attendance",
      description: "Typed worker names.",
      fields: [
        {
          id: "attendance_block",
          type: "toolbox_attendance",
          label: "Attendance",
        },
      ],
    },
  ],
};

const toolboxHalfWidthSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Width Smoke",
  description: "Toolbox width smoke template.",
  sections: [
    {
      id: "meeting_info",
      title: "Meeting Info",
      description: "Half-width meeting info.",
      settings: {
        layout: { width: "half" },
      },
      fields: [
        {
          id: "project",
          type: "short_text",
          label: "Project Name",
          required: true,
          remember: true,
          settings: { toolboxHeaderField: "projectName" },
        },
        {
          id: "date",
          type: "date",
          label: "Date",
          required: true,
          settings: { toolboxHeaderField: "date" },
        },
      ],
    },
    {
      id: "topics",
      title: "Topics Discussed",
      description: "Half-width topic picker.",
      settings: {
        layout: { width: "half" },
      },
      fields: [
        {
          id: "topics_block",
          type: "toolbox_topics",
          label: "Topics Discussed",
          settings: {
            showCommon: true,
            showSearch: false,
            enabledCategoryIds: ["general_conditions"],
            commonTopicLabels: ["Housekeeping / clean-up"],
          },
        },
      ],
    },
    {
      id: "attendance",
      title: "Attendance",
      fields: [
        {
          id: "attendance_block",
          type: "toolbox_attendance",
          label: "Attendance",
        },
      ],
    },
    {
      id: "final_check",
      title: "Final Check",
      fields: [
        {
          id: "final_block",
          type: "toolbox_final_confirmation",
          label: "Final Check",
        },
      ],
    },
  ],
};

const toolboxCompositeSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Composite Smoke",
  description: "Toolbox composite settings template.",
  sections: [
    {
      id: "incident_review",
      title: "Incident Review",
      description: "",
      fields: [
        {
          id: "incident_review_block",
          type: "toolbox_incident_review",
          label: "Review Details",
          settings: {
            defaultCollapsed: false,
            toolboxIncidentReview: {
              openButtonLabel: "Open review details",
              hideButtonLabel: "Close review details",
              subfields: [
                { key: "lessonsLearned", label: "Lessons / next steps", visible: true, order: 0 },
                { key: "firstAidCount", label: "First aid events", visible: true, order: 1 },
                { key: "medicalAidCount", label: "Medical aids hidden", visible: false, order: 2 },
                { key: "nearMissReviewed", label: "Near miss?", visible: true, order: 3 },
                { key: "nearMissDescription", label: "Near miss details", visible: true, order: 4 },
              ],
            },
          },
        },
      ],
    },
    {
      id: "safety_concerns",
      title: "Safety Concerns",
      description: "",
      fields: [
        {
          id: "safety_concerns_block",
          type: "toolbox_safety_concerns",
          label: "Crew concerns",
          settings: {
            defaultCollapsed: false,
            toolboxSafetyConcerns: {
              openButtonLabel: "Open crew concerns",
              hideButtonLabel: "Close crew concerns",
              addRowButtonLabel: "Add another crew concern",
              subfields: [
                { key: "actionToTake", label: "Next action", visible: true, order: 0 },
                { key: "concern", label: "Issue raised", visible: true, order: 1 },
                { key: "dateTaken", label: "Date hidden", visible: false, order: 2 },
              ],
            },
          },
        },
      ],
    },
  ],
};

const toolboxFilteredTopicsSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Filtered Topics Smoke",
  description: "Toolbox filtered topic settings template.",
  sections: [
    {
      id: "topics",
      title: "Topics Discussed",
      description: "Filtered topic picker.",
      fields: [
        {
          id: "topics_block",
          type: "toolbox_topics",
          label: "Topics Discussed",
          settings: {
            showCommon: true,
            showSearch: true,
            commonTopicLabels: ["Exposure", "WHMIS"],
            enabledCategoryIds: ["noise_vibration_temperature"],
          },
        },
      ],
    },
  ],
};

const toolboxNoTopicCategoriesSchema = {
  ...toolboxFilteredTopicsSchema,
  title: "Toolbox No Topic Categories Smoke",
  description: "Toolbox topic picker with no built-in categories.",
  sections: toolboxFilteredTopicsSchema.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => ({
      ...field,
      settings: {
        ...field.settings,
        commonTopicLabels: [],
        enabledCategoryIds: [],
      },
    })),
  })),
};

const siteSignatureSchema = {
  schemaVersion: 1,
  formType: "site_inspection",
  title: "Site Inspection Smoke",
  description: "Inspection smoke template.",
  sections: [
    {
      id: "deficiencies",
      title: "Deficiencies",
      description: "",
      fields: [{ id: "site_deficiencies", type: "site_deficiencies", label: "Deficiencies" }],
    },
    requiredSignatureSection,
    optionalMediaSection,
  ],
};

const genericAllFieldsSchema = {
  schemaVersion: 1,
  formType: "generic_smoke",
  title: "Generic Smoke",
  description: "All supported field types.",
  sections: [
    {
      id: "all_fields",
      title: "All Fields",
      description: "",
      fields: [
        { id: "short", type: "short_text", label: "Short Answer" },
        { id: "long", type: "long_text", label: "Long Answer" },
        { id: "number", type: "number", label: "Number" },
        { id: "date", type: "date", label: "Date" },
        { id: "time", type: "time", label: "Time" },
        { id: "yes_no", type: "yes_no", label: "Yes No" },
        { id: "boolean_false", type: "boolean", label: "Boolean false", required: true },
        { id: "boolean_true", type: "boolean", label: "Boolean true", required: true },
        { id: "toggle_false", type: "toggle", label: "Toggle false", required: true },
        { id: "toggle_true", type: "toggle", label: "Toggle true", required: true },
        { id: "media_required", type: "media_upload", label: "Required media", required: true },
        { id: "dropdown", type: "dropdown", label: "Dropdown", options: ["One", "Two"] },
        { id: "multi", type: "multi_select", label: "Multi Select", options: ["A", "B"] },
        { id: "checkbox", type: "checkbox", label: "Checkbox confirmation" },
        { id: "signature", type: "signature", label: "Signature" },
        { id: "actions", type: "action_item_rows", label: "Action item rows" },
      ],
    },
  ],
};

const advancedSettingsSchema = {
  schemaVersion: 1,
  formType: "advanced_settings_smoke",
  title: "Advanced Settings Smoke",
  description: "Conditional, hidden, and media settings.",
  sections: [
    {
      id: "advanced",
      title: "Advanced Fields",
      description: "",
      fields: [
        { id: "needs_training", type: "yes_no", label: "Needs extra training?" },
        {
          id: "training_details",
          type: "long_text",
          label: "Training details",
          required: true,
          settings: {
            visibility: {
              enabled: true,
              sourceFieldId: "needs_training",
              operator: "equals",
              value: "yes",
            },
          },
        },
        {
          id: "hidden_name",
          type: "short_text",
          label: "Hidden worker name",
          required: true,
          default: "worker_name",
          settings: { hidden: true },
        },
        {
          id: "hidden_phone",
          type: "short_text",
          label: "Hidden worker phone",
          default: "worker_phone",
          settings: { hidden: true },
        },
        {
          id: "hidden_username",
          type: "short_text",
          label: "Hidden worker username",
          default: "worker_username",
          settings: { hidden: true },
        },
        {
          id: "hidden_company",
          type: "short_text",
          label: "Hidden worker company",
          default: "worker_company",
          settings: { hidden: true },
        },
        {
          id: "hidden_date",
          type: "date",
          label: "Hidden date",
          default: "today",
          settings: { hidden: true },
        },
        {
          id: "image_evidence",
          type: "media_upload",
          label: "Image evidence",
          settings: {
            mediaUpload: {
              acceptedKinds: ["image"],
            },
          },
        },
      ],
    },
  ],
};

const noDriverVisibilitySchema = {
  schemaVersion: 1,
  formType: "no_driver_visibility_smoke",
  title: "No Driver Visibility Smoke",
  description: "Visibility helper smoke template.",
  sections: [
    {
      id: "target_section",
      title: "Target Section",
      description: "",
      fields: [
        { id: "target_question", type: "short_text", label: "Target question" },
      ],
    },
  ],
};

const legacyStyleSchema = {
  schemaVersion: 1,
  formType: "legacy_style_smoke",
  title: "Legacy Style Smoke",
  description: "Legacy orientation layout capabilities.",
  sections: [
    {
      id: "policy",
      title: "Policy Review",
      description: "Two-column section.",
      settings: { layout: { width: "half" } },
      fields: [
        {
          id: "policy_text",
          type: "instructions",
          label: "Review each section before starting work.\nFollow all company safety requirements.",
          settings: {
            instructionStyle: "policy",
            layout: { width: "full" },
          },
        },
        {
          id: "acknowledgement",
          type: "dropdown",
          label: "Do you understand the policy?",
          options: ["Yes", "No", "N/A"],
          settings: {
            choiceDisplay: "radio",
            optionPreset: "yes_no_na",
            layout: { width: "half" },
          },
        },
        {
          id: "training_topics",
          type: "multi_select",
          label: "Training topics completed",
          options: ["WHMIS", "Fall protection", "Mobile equipment"],
          settings: {
            choiceDisplay: "checklist",
            layout: { width: "half" },
          },
        },
        {
          id: "years_experience",
          type: "number",
          label: "Years experience",
          settings: {
            numberMode: "integer",
            layout: { width: "third" },
          },
        },
        {
          id: "muster_station",
          type: "short_text",
          label: "Muster Station",
          settings: {
            defaultValue: "Northeast corner of site",
            layout: { width: "half" },
          },
        },
      ],
    },
  ],
};

async function mockApis(page, templates, options = {}) {
  let templateRows = templates.map((row) => structuredClone(row));
  const currentStaff = options.staff || staff;
  const unlockPassword = options.unlockPassword || "letmein";
  const staffSubmissions = options.staffSubmissions || [];
  const workerSignIns = options.workerSignIns || [];
  const submissions = [];
  let uploadCount = 0;
  let workerSignInCount = workerSignIns.length;
  let duplicateCount = 0;
  const protectedFormTypes = new Set(["toolbox_talk", "site_inspection", "daily_hazard_assessment"]);
  const findTemplate = (formType) => templateRows.find((row) => row.form_type === formType);
  const canManageTemplate = (row) =>
    ["owner", "admin"].includes(currentStaff.role) ||
    Boolean(row?.created_by_staff_id && row.created_by_staff_id === currentStaff.id);
  const replaceTemplate = (updated) => {
    templateRows = templateRows.map((row) => (row.form_type === updated.form_type ? updated : row));
    return updated;
  };
  const jsonTemplate = (row) => structuredClone(row);
  const assertTemplateMutationAllowed = (row) => {
    if (!row) return { error: "Not found", status: 404 };
    if (protectedFormTypes.has(row.form_type)) return { error: "Default forms are protected.", status: 400 };
    if (!canManageTemplate(row)) return { error: "You can only manage form templates you created.", status: 403 };
    if (row.locked_at) return { error: "This form template is locked. Unlock it to edit.", status: 423 };
    return null;
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/auth/me") return json({ staff: currentStaff });
    if (path === "/api/auth/worker-me") return json({ worker });
    if (path === "/api/worker-signins" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const signInDate = "2026-07-03";
      const normalizedName = normalizeMockSignInIdentity(body.name);
      const normalizedCompany = normalizeMockSignInIdentity(body.company);
      const existing = workerSignIns.find(
        (row) =>
          row.sign_in_date_vancouver === signInDate &&
          !row.signed_out_at &&
          normalizeMockSignInIdentity(row.name) === normalizedName &&
          normalizeMockSignInIdentity(row.company) === normalizedCompany,
      );
      if (existing) return json({ signIn: existing, created: false }, 200);
      workerSignInCount += 1;
      const signIn = {
        id: `worker-signin-${workerSignInCount}`,
        name: String(body.name || "").trim(),
        phone: String(body.phone || "").trim(),
        trade: String(body.trade || "").trim(),
        company: String(body.company || "").trim(),
        signed_in_at: `2026-07-03T16:${String(workerSignInCount).padStart(2, "0")}:00.000Z`,
        signed_out_at: null,
        sign_in_date_vancouver: signInDate,
        sign_out_date_vancouver: null,
      };
      workerSignIns.push(signIn);
      return json({ signIn, created: true }, 201);
    }
    if (path === "/api/staff/signins" && method === "GET") {
      const date = url.searchParams.get("date") || "2026-07-03";
      const sort = url.searchParams.get("sort") || "signed_in_at";
      const dir = url.searchParams.get("dir") === "desc" ? "desc" : "asc";
      const group = url.searchParams.get("group") || "none";
      const rows = sortMockSignIns(
        workerSignIns.filter((row) => row.sign_in_date_vancouver === date),
        sort,
        dir,
      );
      return json({
        date,
        sort,
        dir,
        group,
        rows,
        groups: mockSignInGroups(rows, group),
      });
    }
    if (path.startsWith("/api/mock-upload/") && method === "PUT") {
      return route.fulfill({ status: 200, body: "" });
    }
    if (path === "/api/staff/form-templates" && method === "GET") {
      return json({ rows: templateRows.map(jsonTemplate) });
    }
    if (path === "/api/staff/form-templates/archived" && method === "DELETE") {
      const deletable = templateRows.filter(
        (row) => row.archived_at && !protectedFormTypes.has(row.form_type) && canManageTemplate(row),
      );
      const deletedTypes = new Set(deletable.map((row) => row.form_type));
      templateRows = templateRows.filter((row) => !deletedTypes.has(row.form_type));
      return json({
        deleted: deletable.length,
        rows: deletable.map((row) => ({ form_type: row.form_type, label: row.label })),
      });
    }
    const templateParts = path.split("/").filter(Boolean);
    if (
      templateParts[0] === "api" &&
      templateParts[1] === "staff" &&
      templateParts[2] === "form-templates" &&
      templateParts.length >= 4
    ) {
      const formType = decodeURIComponent(templateParts[3]);
      const row = findTemplate(formType);
      if (!row) return json({ error: "Not found" }, 404);
      const action = templateParts[4] || "";
      if (!action && method === "PATCH") {
        const body = JSON.parse(request.postData() || "{}");
        const problem = assertTemplateMutationAllowed(row);
        if (problem) return json({ error: problem.error }, problem.status);
        const updated = {
          ...row,
          label: body.label ?? body.name ?? body.title ?? row.label,
          description: body.description ?? row.description,
          active: body.active === undefined ? row.active : Boolean(body.active),
          worker_visible: body.workerVisible === undefined && body.worker_visible === undefined
            ? row.worker_visible
            : Boolean(body.workerVisible ?? body.worker_visible),
          display_order: body.displayOrder ?? body.display_order ?? row.display_order,
          archived_at: body.archived === undefined ? row.archived_at : body.archived ? "2026-07-03T19:00:00.000Z" : null,
          updated_by_staff_id: currentStaff.id,
        };
        if (updated.archived_at) {
          updated.active = false;
          updated.worker_visible = false;
        }
        return json({ template: jsonTemplate(replaceTemplate(updated)) });
      }
      if (action === "lock" && method === "POST") {
        if (protectedFormTypes.has(row.form_type)) return json({ error: "Default forms are protected." }, 400);
        if (!canManageTemplate(row)) return json({ error: "You can only manage form templates you created." }, 403);
        const updated = replaceTemplate({
          ...row,
          locked_at: row.locked_at || "2026-07-03T19:00:00.000Z",
          locked_by_staff_id: currentStaff.id,
          updated_by_staff_id: currentStaff.id,
        });
        return json({ template: jsonTemplate(updated) });
      }
      if (action === "unlock" && method === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        if (protectedFormTypes.has(row.form_type)) return json({ error: "Default forms are protected." }, 400);
        if (!canManageTemplate(row)) return json({ error: "You can only manage form templates you created." }, 403);
        if (body.password !== unlockPassword) return json({ error: "Invalid password." }, 401);
        const updated = replaceTemplate({
          ...row,
          locked_at: null,
          locked_by_staff_id: null,
          updated_by_staff_id: currentStaff.id,
        });
        return json({ template: jsonTemplate(updated) });
      }
      if (action === "duplicate" && method === "POST") {
        duplicateCount += 1;
        const sourceVersion = row.draftVersion || row.publishedVersion || row.versions?.[0] || version(row.form_type, {});
        const nextFormType = `${row.form_type}_copy_${duplicateCount}`;
        const label = `${row.label} copy`;
        const draftVersion = {
          ...structuredClone(sourceVersion),
          id: `${nextFormType}-version-1`,
          form_type: nextFormType,
          version_number: 1,
          status: "draft",
          published_at: null,
        };
        draftVersion.schema = {
          ...(draftVersion.schema || {}),
          formType: nextFormType,
          title: label,
          description: draftVersion.schema?.description ?? row.description ?? "",
        };
        const copy = {
          ...structuredClone(row),
          id: `${nextFormType}-template`,
          form_type: nextFormType,
          label,
          active: true,
          worker_visible: false,
          archived_at: null,
          locked_at: null,
          locked_by_staff_id: null,
          display_order: Math.max(10, ...templateRows.map((item) => Number(item.display_order || 0))) + 10,
          created_by_staff_id: currentStaff.id,
          updated_by_staff_id: currentStaff.id,
          draftVersion,
          publishedVersion: null,
          versions: [draftVersion],
        };
        templateRows = [copy, ...templateRows];
        return json({ template: jsonTemplate(copy) }, 201);
      }
    }
    if (path === "/api/staff/submissions" && method === "GET") {
      return json({
        rows: staffSubmissions,
        sort: url.searchParams.get("sort") || "submitted_at",
        dir: url.searchParams.get("dir") || "desc",
      });
    }
    const staffSubmissionParts = path.split("/").filter(Boolean);
    if (
      method === "GET" &&
      staffSubmissionParts.length === 4 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions"
    ) {
      const submissionId = staffSubmissionParts.at(-1);
      const row = staffSubmissions.find((item) => item.id === submissionId);
      return row ? json({ submission: row }) : json({ error: "Not found" }, 404);
    }
    if (path.startsWith("/api/worker/form-templates/") && path.endsWith("/published")) {
      const formType = decodeURIComponent(path.split("/").at(-2));
      const row = findTemplate(formType);
      return row ? json({ template: row }) : json({ error: "Not found" }, 404);
    }
    if (path === "/api/worker/submissions/file-upload-url" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const file = body.file || {};
      uploadCount += 1;
      const safeName = String(file.originalFilename || `upload-${uploadCount}`)
        .replace(/[^a-z0-9._-]+/gi, "-")
        .toLowerCase();
      const storagePath = `${worker.id}/smoke-${uploadCount}-${safeName}`;
      return json({
        upload: {
          bucket: "safety-form-submissions",
          storagePath,
          signedUrl: `${url.origin}/api/mock-upload/${encodeURIComponent(storagePath)}`,
          file: {
            originalFilename: file.originalFilename,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          },
        },
      });
    }
    if (path === "/api/worker/submissions" && method === "POST") {
      submissions.push(JSON.parse(request.postData() || "{}"));
      return json({
        submission: {
          id: "submission-smoke",
          submitted_date_vancouver: "2026-07-01",
        },
      });
    }
    return json({});
  });
  return submissions;
}

function normalizeMockSignInIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function sortMockSignIns(rows, sort, dir) {
  const ascending = dir !== "desc";
  return [...rows].sort((a, b) => {
    const left = String(a[sort] || "");
    const right = String(b[sort] || "");
    return ascending ? left.localeCompare(right) : right.localeCompare(left);
  });
}

function mockSignInGroups(rows, group) {
  if (group !== "company" && group !== "trade") return [];
  const groups = new Map();
  rows.forEach((row) => {
    const label = row[group] || "Unassigned";
    groups.set(label, [...(groups.get(label) || []), row]);
  });
  return [...groups.entries()].map(([label, items]) => ({
    label,
    count: items.length,
    items,
  }));
}

function toolboxSubmissionRow({
  company = "GarnoCo",
  formType = "toolbox_talk",
  id,
  projectName,
  schemaSnapshot,
  workerName = "Garnet Bird",
  answers = {},
  actionItemBlocks = {},
}) {
  return {
    id,
    form_type: formType,
    worker_name: workerName,
    worker_phone: "604.354.8262",
    worker_username: "gbird",
    company,
    submitted_at: "2026-07-02T19:07:00.000Z",
    submitted_date_vancouver: "2026-07-02",
    submission_mode: "fill_form",
    one_drive_backup_status: "pending",
    backup_error: "",
    one_drive_web_url: "",
    notes: `${projectName} / Topics: Housekeeping / 2 attendees`,
    files: [],
    action_items: [],
    form_schema_snapshot: schemaSnapshot || null,
    form_data: {
      kind: "toolbox_talk_v1",
      schemaSnapshot: schemaSnapshot || null,
      header: {
        projectName,
        address: "557 Example Ave",
        date: "2026-07-02",
        time: "19:06",
        presenter: "Garnet Bird",
        supervisor: "Bob",
      },
      topics: {
        selected: [
          {
            categoryId: "general_conditions",
            categoryLabel: "General Conditions",
            topicId: "housekeeping",
            label: "Housekeeping / clean-up",
          },
        ],
        other: "",
      },
      incidentReview: {
        firstAidCount: "0",
        medicalAidCount: "0",
        nearMissReviewed: "no",
        nearMissDescription: "",
        lessonsLearned: "Keep access clear.",
      },
      safetyConcerns: [
        {
          concern: "Loose cords",
          actionToTake: "Move cords to wall",
          dateTaken: "2026-07-02",
        },
      ],
      attendance: [{ name: "Garnet Bird" }, { name: "Bob Smith" }],
      additionalComments: "Export smoke comments.",
      confirmation: {
        name: "Garnet Bird",
        date: "2026-07-02",
        confirmed: true,
      },
      answers,
      actionItemBlocks,
    },
  };
}

function fileSubmissionRow({
  company = "Birding Scopes",
  formType = "toolbox_talk_copy_2",
  id,
  workerName = "Leanne Bird",
  fileName = "Dinner-Photo-3.png",
}) {
  return {
    id,
    form_type: formType,
    worker_name: workerName,
    worker_phone: "6049025665",
    worker_username: "lbird",
    company,
    submitted_at: "2026-07-03T16:52:00.000Z",
    submitted_date_vancouver: "2026-07-03",
    submission_mode: "submit_file",
    one_drive_backup_status: "pending",
    backup_error: "",
    one_drive_web_url: "",
    notes: "",
    files: [
      {
        id: `${id}-file`,
        submission_id: id,
        bucket: "safety-form-submissions",
        storage_path: `worker-smoke/${fileName}`,
        original_filename: fileName,
        mime_type: "image/png",
        size_bytes: 1024 * 1024,
        backup_status: "pending",
      },
    ],
    action_items: [],
    form_schema_snapshot: null,
    form_data: null,
  };
}

async function expectNonEmptyDownload(page, buttonName, extension) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
  const path = await download.path();
  expect(path).toBeTruthy();
  expect(fs.statSync(path).size).toBeGreaterThan(100);
}

async function openPreview(page) {
  await page.locator(".template-v3-tabs").getByRole("button", { name: "Preview" }).click();
}

async function expectCardAbove(page, topSelector, lowerSelector) {
  const topBox = await page.locator(topSelector).boundingBox();
  const lowerBox = await page.locator(lowerSelector).boundingBox();
  expect(topBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    lowerBox?.y ?? Number.NEGATIVE_INFINITY,
  );
}

async function expectLocatorBefore(firstLocator, secondLocator) {
  const secondHandle = await secondLocator.first().elementHandle();
  expect(secondHandle).not.toBeNull();
  const isBefore = await firstLocator.first().evaluate(
    (first, second) =>
      Boolean(second && first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING),
    secondHandle,
  );
  expect(isBefore).toBe(true);
}

async function expectSectionsShareRow(firstLocator, secondLocator) {
  const [firstBox, secondBox] = await Promise.all([
    firstLocator.boundingBox(),
    secondLocator.boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(8);
  expect(firstBox.width).toBeLessThan(700);
  expect(secondBox.width).toBeLessThan(700);
}

const newWorkerOrientationViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "wide-desktop", width: 1920, height: 1200 },
];

async function captureNewWorkerOrientationScreenshot(page, name) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: `test-results/new-worker-orientation-${name}.png`,
  });
}

async function expectNoClippedNewWorkerOrientationChoices(page) {
  const clippedLabels = await page
    .locator(".template-worker-form-new_worker_orientation .template-radio-choice-list button")
    .evaluateAll((buttons) =>
      buttons
        .filter((button) =>
          button.scrollWidth > button.clientWidth + 1 ||
          button.scrollHeight > button.clientHeight + 1)
        .map((button) => button.textContent?.trim()),
    );
  expect(clippedLabels).toEqual([]);
}

async function expectNoStretchedNewWorkerOrientationSections(page) {
  const stretchedSections = await page
    .locator(".template-worker-form-new_worker_orientation .toolbox-section")
    .evaluateAll((sections) =>
      sections
        .map((section) => {
          const visibleChildren = Array.from(section.children).filter((child) => {
            const box = child.getBoundingClientRect();
            return window.getComputedStyle(child).display !== "none" && box.height > 0;
          });
          const lastChild = visibleChildren.at(-1);
          if (!lastChild) return null;
          const sectionBox = section.getBoundingClientRect();
          const lastChildBox = lastChild.getBoundingClientRect();
          return {
            title: section.querySelector("h2")?.textContent?.trim() || "Untitled section",
            bottomGap: Math.round(sectionBox.bottom - lastChildBox.bottom),
          };
        })
        .filter(Boolean)
        .filter((section) => section.bottomGap > 28),
    );
  expect(stretchedSections).toEqual([]);
}

async function expectAlignedNewWorkerOrientationChoiceRows(page) {
  const alignmentIssues = await page
    .locator([
      ".template-worker-form-new_worker_orientation .template-section-7_training_and_certifications",
      ".template-worker-form-new_worker_orientation .template-section-8_medical_information_optional_kept_confidential_and_only_provided_to_ems_if_nee",
    ].join(", "))
    .evaluateAll((sections) =>
      sections.flatMap((section) => {
        const rows = new Map();
        Array.from(section.querySelectorAll(".template-runtime-field-shell"))
          .filter((field) => field.querySelector(".template-radio-choice-list"))
          .forEach((field) => {
            const fieldTop = Math.round(field.getBoundingClientRect().top);
            const choiceTop = Math.round(field.querySelector(".template-radio-choice-list").getBoundingClientRect().top);
            const row = rows.get(fieldTop) || [];
            row.push({
              label: field.textContent?.trim().replace(/\s+/g, " ").slice(0, 80),
              choiceTop,
            });
            rows.set(fieldTop, row);
          });
        return Array.from(rows.values())
          .filter((row) => row.length > 1)
          .map((row) => ({
            section: section.querySelector("h2")?.textContent?.trim() || "Untitled section",
            row,
            spread: Math.max(...row.map((item) => item.choiceTop)) - Math.min(...row.map((item) => item.choiceTop)),
          }))
          .filter((row) => row.spread > 2);
      }),
    );
  expect(alignmentIssues).toEqual([]);
}

async function expectNewWorkerOrientationUploadButtonReadable(page) {
  const uploadButtonTextColors = await page
    .locator(".template-worker-form-new_worker_orientation .template-media-upload-select span")
    .evaluateAll((buttons) => buttons.map((button) => window.getComputedStyle(button).color));
  expect(uploadButtonTextColors).toContain("rgb(255, 255, 255)");
}

async function expectNewWorkerOrientationSubmitButtonReasonable(page) {
  const buttonBox = await page
    .locator(".template-worker-form-new_worker_orientation .toolbox-submit-actions .primary-button")
    .evaluate((button) => {
      const box = button.getBoundingClientRect();
      return {
        height: Math.round(box.height),
        viewportWidth: window.innerWidth,
        width: Math.round(box.width),
      };
    });
  expect(buttonBox.height).toBeLessThanOrEqual(56);
  if (buttonBox.viewportWidth > 820) {
    expect(buttonBox.width).toBeLessThanOrEqual(380);
  }
}

test("custom Toolbox Talk preview and worker form render added drawn signatures", async ({ page }) => {
  const row = template("toolbox_talk_copy", "Toolbox Talk copy", toolboxSignatureSchema);
  await mockApis(page, [row]);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Toolbox Talk Smoke" })).toBeVisible();
  await expect(page.locator(".template-v3-tabs").getByRole("button", { name: "Options" })).toHaveCount(0);
  await expect(page.locator(".template-v3-template-options-card")).toContainText("Template");
  await page.locator(".template-v3-field-card").filter({ hasText: "Signature" }).getByRole("button").first().click();
  await expect(page.locator(".template-v3-selected-block-card")).toContainText("Selected Block");
  await expectCardAbove(page, ".template-v3-selected-block-card", ".template-v3-template-options-card");
  await page.locator(".template-v3-template-options-card input").first().click();
  await expectCardAbove(page, ".template-v3-template-options-card", ".template-v3-selected-block-card");
  await page.locator(".template-v3-selected-block-card input").first().click();
  await expectCardAbove(page, ".template-v3-selected-block-card", ".template-v3-template-options-card");
  await openPreview(page);
  await expect(page.locator(".template-manager-grid")).not.toHaveClass(/menu-hidden/);
  await expect(page.locator(".template-card-list")).toBeVisible();
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Signature", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();
  await page.getByRole("button", { name: "Hide form template list" }).click();
  await expect(page.locator(".template-manager-grid")).toHaveClass(/menu-hidden/);
  await expect(page.locator(".template-card-list")).toBeHidden();
  await expect(page.getByRole("button", { name: "Show form template list" })).toBeVisible();
  await page.getByRole("button", { name: "Show form template list" }).click();
  await expect(page.locator(".template-manager-grid")).not.toHaveClass(/menu-hidden/);
  await expect(page.locator(".template-card-list")).toBeVisible();
  await page.locator(".template-v3-tabs").getByRole("button", { name: "Editor" }).click();
  await expect(page.locator(".template-card-list")).toBeVisible();

  await page.goto("/forms/toolbox_talk_copy");
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect(page.getByText("Signature is required.")).toBeVisible();
});

test("custom Toolbox Talk section widths render in preview and worker form", async ({ page }) => {
  const row = template("toolbox_width_smoke", "Toolbox Width Smoke", toolboxHalfWidthSchema);
  await mockApis(page, [row]);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Toolbox Width Smoke" })).toBeVisible();
  await openPreview(page);
  const previewMeeting = page.locator(".template-v3-preview-page .template-section-toolbox_meeting_info");
  const previewTopics = page.locator(".template-v3-preview-page .template-section-toolbox_topics");
  await expect(previewMeeting).toHaveClass(/template-width-half/);
  await expect(previewTopics).toHaveClass(/template-width-half/);
  await expectSectionsShareRow(previewMeeting, previewTopics);

  await page.goto("/forms/toolbox_width_smoke");
  const workerMeeting = page.locator(".template-section-toolbox_meeting_info");
  const workerTopics = page.locator(".template-section-toolbox_topics");
  await expect(workerMeeting).toHaveClass(/template-width-half/);
  await expect(workerTopics).toHaveClass(/template-width-half/);
  await expectSectionsShareRow(workerMeeting, workerTopics);
});

test("Toolbox Talk attendance splits comma-separated names", async ({ page }) => {
  const row = template("toolbox_attendance_smoke", "Toolbox Attendance", toolboxAttendanceSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/toolbox_attendance_smoke");
  const attendanceInput = page.getByPlaceholder("Worker name or comma-separated names");
  await attendanceInput.fill("Billy Bob Thornton, Chris Jones");
  await attendanceInput.press("Enter");
  await expect(page.getByRole("button", { name: "Remove Billy Bob Thornton" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Chris Jones" })).toBeVisible();
  await expect(page.getByText("2 listed")).toBeVisible();
  await attendanceInput.fill("Chris Jones, Will Davis");
  await attendanceInput.press("Enter");
  await expect(page.getByText("3 listed")).toBeVisible();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.attendance).toEqual([
    { name: "Billy Bob Thornton" },
    { name: "Chris Jones" },
    { name: "Will Davis" },
  ]);
});

test("worker group sign-in reuses duplicate open rows after refresh", async ({ page }) => {
  const workerSignIns = [];
  await mockApis(page, [], { workerSignIns });
  const signInResponses = [];
  page.on("response", async (response) => {
    if (
      response.url().includes("/api/worker-signins") &&
      response.request().method() === "POST"
    ) {
      signInResponses.push(await response.json());
    }
  });

  await page.goto("/worker-sign-in");
  await page.getByRole("button", { name: "Group" }).click();
  await page.getByLabel("Phone").fill("6043548262");
  await page.getByLabel("Company Name").selectOption("TK Elevators");
  await page.getByLabel("Worker name").fill("Chris, Jerry, Chris,");
  await expect(page.getByRole("button", { name: "Remove Chris" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Remove Jerry" })).toHaveCount(1);
  await page.getByLabel("Remember me").check();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("2 sign-ins submitted (2 new)")).toBeVisible();
  await expect.poll(() => workerSignIns.map((row) => row.name)).toEqual(["Chris", "Jerry"]);

  await page.reload();
  await expect(page.getByLabel("Worker name")).toBeVisible();
  await page.getByLabel("Worker name").fill(" chris , JERRY , David zocks,");
  await expect(page.getByRole("button", { name: "Remove Chris" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Remove Jerry" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Remove David zocks" })).toHaveCount(1);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("3 sign-ins submitted (1 new, 2 already signed in)")).toBeVisible();
  await expect.poll(() => signInResponses.map((payload) => payload.created)).toEqual([
    true,
    true,
    false,
    false,
    true,
  ]);
  await expect.poll(() => workerSignIns.map((row) => row.name)).toEqual([
    "Chris",
    "Jerry",
    "David zocks",
  ]);

  const rememberedGroup = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem("sf_worker_group_signins") || "{}"),
  );
  expect(rememberedGroup.signIns.map((row) => row.name)).toEqual([
    "Chris",
    "Jerry",
    "David zocks",
  ]);
  expect(new Set(rememberedGroup.signIns.map((row) => row.id)).size).toBe(3);

  await page.goto("/staff/sign-ins?date=2026-07-03&group=company&company=TK%20Elevators");
  await expect(page.locator(".desktop-signin-group").filter({ hasText: "TK Elevators" })).toBeVisible();
  const staffNames = await page
    .locator(".desktop-signin-group .staff-table tbody tr td:first-child")
    .evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
  expect(staffNames).toEqual(["Chris", "Jerry", "David zocks"]);
});

test("submitted Toolbox forms export PDF, PNG, and print without a blank popup", async ({ page }) => {
  test.slow();
  const standardSubmission = toolboxSubmissionRow({
    id: "standard-toolbox-submission",
    formType: "toolbox_talk",
    projectName: "Standard Toolbox Project",
    company: "StandardCo",
    workerName: "Standard Worker",
  });
  const customSubmission = toolboxSubmissionRow({
    id: "custom-toolbox-submission",
    formType: "toolbox_talk_copy_2",
    projectName: "Custom Toolbox Project",
    company: "CustomCo",
    workerName: "Custom Worker",
    schemaSnapshot: toolboxSignatureSchema,
    answers: {
      media_upload: [
        {
          storagePath: "worker-smoke/custom-photo.jpg",
          originalFilename: "custom-photo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
        },
      ],
      signature: smokeSignatureDataUrl,
    },
  });
  const fileSubmission = fileSubmissionRow({
    id: "file-toolbox-submission",
    formType: "toolbox_talk_copy_2",
  });
  await mockApis(
    page,
    [
      template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, { displayOrder: 1 }),
      template("toolbox_talk_copy_2", "Toolbox Talk Copy 2", toolboxSignatureSchema, {
        displayOrder: 2,
      }),
    ],
    { staffSubmissions: [fileSubmission, customSubmission, standardSubmission] },
  );
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/staff/forms");
  await expect(page.getByText("3 form submissions")).toBeVisible();

  for (const { company, expectedText } of [
    { company: "Birding Scopes", expectedText: "Dinner-Photo-3.png" },
    { company: "CustomCo", expectedText: "Custom Toolbox Project" },
    { company: "StandardCo", expectedText: "Standard Toolbox Project" },
  ]) {
    await page
      .getByRole("row", { name: new RegExp(company) })
      .getByRole("button", { name: "Details" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Submission details" });
    await expect(dialog.getByRole("button", { name: "PDF", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "PNG", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Print", exact: true })).toBeVisible();
    await expect(dialog.getByText(expectedText, { exact: true })).toBeVisible();

    await expectNonEmptyDownload(page, "PDF", "pdf");
    await expect(dialog.getByText("PDF saved.")).toBeVisible();
    await expectNonEmptyDownload(page, "PNG", "png");
    await expect(dialog.getByText("PNG saved.")).toBeVisible();

    const popupPromise = page
      .waitForEvent("popup", { timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    await dialog.getByRole("button", { name: "Print" }).click();
    await expect(dialog.getByText("Print dialog opened.")).toBeVisible();
    expect(await popupPromise).toBe(false);

    await dialog.getByRole("button", { name: "Close" }).click();
  }

  expect(pageErrors).toEqual([]);
});

test("Toolbox Talk review notes and safety concerns use editable subfields", async ({ page }) => {
  const row = template("toolbox_composite", "Toolbox Composite", toolboxCompositeSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await page.locator(".template-v3-field-card").filter({ hasText: "Review Details" }).getByRole("button").first().click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock).toContainText("Review fields");
  await expect(
    selectedBlock.locator(".template-action-row-subfield").filter({ hasText: "firstAidCount" }).getByRole("textbox"),
  ).toHaveValue("First aid events");
  await selectedBlock.getByLabel("Show button").fill("Open review panel");
  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Review Details" })).toBeVisible();
  await expect(preview.getByRole("button", { name: "Open review panel" })).toBeVisible();
  await expect(preview.getByText("Lessons / next steps")).toBeVisible();
  await expect(preview.getByText("First aid events")).toBeVisible();
  await expect(preview.getByText("Medical aids hidden")).toHaveCount(0);
  await expect(preview.getByRole("heading", { name: "Crew concerns" })).toBeVisible();
  await expect(preview.getByText("Next action")).toBeVisible();
  await expect(preview.getByText("Issue raised")).toBeVisible();
  await expect(preview.getByText("Date hidden")).toHaveCount(0);
  await expectLocatorBefore(preview.getByText("Lessons / next steps"), preview.getByText("First aid events"));
  await expectLocatorBefore(preview.getByText("Next action"), preview.getByText("Issue raised"));

  await page.goto("/forms/toolbox_composite");
  await expect(page.getByRole("heading", { name: "Review Details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Crew concerns" })).toBeVisible();
  await expect(page.getByText("Medical aids hidden")).toHaveCount(0);
  await expect(page.getByText("Date hidden")).toHaveCount(0);
  await page.getByLabel("Lessons / next steps").fill("Keep access clear.");
  await page.getByLabel("First aid events").fill("2");
  await page.getByRole("button", { name: "Yes" }).click();
  await page.getByLabel("Near miss details").fill("Truck backing near miss.");
  await page.getByLabel("Next action").fill("Spotter refresher");
  await page.getByLabel("Issue raised").fill("Congested access");
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.incidentReview).toMatchObject({
    lessonsLearned: "Keep access clear.",
    firstAidCount: "2",
    medicalAidCount: "",
    nearMissReviewed: "yes",
    nearMissDescription: "Truck backing near miss.",
  });
  expect(submissions[0].formData.safetyConcerns).toEqual([
    {
      actionToTake: "Spotter refresher",
      concern: "Congested access",
      dateTaken: "",
    },
  ]);
});

test("Toolbox Talk topic category settings are visible as draft-only and respected by worker forms", async ({ page }) => {
  const publishedVersion = version("toolbox_filtered_topics", {
    ...toolboxFilteredTopicsSchema,
    sections: toolboxFilteredTopicsSchema.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => ({
        ...field,
        settings: {
          ...field.settings,
          enabledCategoryIds: [
            "rights_responsibilities",
            "general_conditions",
            "noise_vibration_temperature",
          ],
        },
      })),
    })),
  }, 3);
  const draftVersion = {
    ...version("toolbox_filtered_topics", toolboxFilteredTopicsSchema, 4),
    status: "draft",
    published_at: null,
  };
  const row = {
    id: "toolbox_filtered_topics-template",
    form_type: "toolbox_filtered_topics",
    label: "Toolbox Filtered Topics",
    description: toolboxFilteredTopicsSchema.description,
    renderer_type: "template",
    active: true,
    worker_visible: true,
    archived_at: null,
    display_order: 10,
    draftVersion,
    publishedVersion,
    versions: [draftVersion, publishedVersion],
  };
  const liveRow = template(
    "toolbox_filtered_topics_live",
    "Toolbox Filtered Topics Live",
    toolboxFilteredTopicsSchema,
    { displayOrder: 11 },
  );
  const noCategoriesRow = template(
    "toolbox_no_topic_categories",
    "Toolbox No Topic Categories",
    toolboxNoTopicCategoriesSchema,
    { displayOrder: 12 },
  );
  await mockApis(page, [row, liveRow, noCategoriesRow]);

  await page.goto("/staff/form-templates");
  await expect(page.getByText("Draft changes are not live yet.")).toBeVisible();
  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Topics Discussed" })
    .getByRole("button")
    .first()
    .click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByLabel("Noise, Vibration, Radiation and Temperature")).toBeChecked();
  await expect(selectedBlock.getByLabel("Rights and Responsibilities")).not.toBeChecked();
  const commonTopicsInput = selectedBlock.getByLabel("Common topics");
  await selectedBlock.getByRole("button", { name: "Clear" }).click();
  await expect(commonTopicsInput).toHaveValue("");
  await commonTopicsInput.fill("Exposure\nWHMIS");
  await commonTopicsInput.fill("");
  await expect(commonTopicsInput).toHaveValue("");
  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByText("Noise, Vibration, Radiation and Temperature")).toBeVisible();
  await expect(preview.getByText("Rights and Responsibilities")).toHaveCount(0);
  await expect(preview.locator(".toolbox-topic-panel").filter({ hasText: "Common" })).toHaveCount(0);

  await page.goto("/forms/toolbox_filtered_topics");
  await expect(page.getByText("Rights and Responsibilities")).toBeVisible();

  await page.goto("/forms/toolbox_filtered_topics_live");
  await expect(page.getByText("Noise, Vibration, Radiation and Temperature")).toBeVisible();
  await expect(page.getByText("Rights and Responsibilities")).toHaveCount(0);
  await expect(page.getByText("WHMIS")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Exposure" }).first()).toBeVisible();

  await page.goto("/forms/toolbox_no_topic_categories");
  await expect(page.getByText("Rights and Responsibilities")).toHaveCount(0);
  await expect(page.getByText("General Conditions")).toHaveCount(0);
  await expect(page.getByText("Noise, Vibration, Radiation and Temperature")).toHaveCount(0);
  await expect(page.getByText("WHMIS")).toHaveCount(0);
  await expect(page.getByText("Exposure")).toHaveCount(0);
  await expect(page.getByText("No topics match that search.")).toBeVisible();
});

test("custom Site Inspection preview and worker form render added drawn signatures", async ({ page }) => {
  const row = template("site_inspection_copy", "Site Inspection copy", siteSignatureSchema);
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Site Inspection Smoke" })).toBeVisible();
  await openPreview(page);
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Deficiencies").first()).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();

  await page.goto("/forms/site_inspection_copy");
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Suggested due date").first()).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();
});

test("generic V3 preview renders all normal field types and action item rows", async ({ page }) => {
  const row = template("generic_smoke", "Generic Smoke", genericAllFieldsSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await page.getByRole("button", { name: "New Field +" }).first().click();
  const newFieldDialog = page.getByRole("dialog", { name: "New field" });
  await newFieldDialog.getByRole("button", { name: "Basics" }).click();
  await expect(newFieldDialog.getByRole("button", { name: /Boolean/ })).toBeVisible();
  await expect(newFieldDialog.getByRole("button", { name: /Toggle/ })).toBeVisible();
  await newFieldDialog.getByRole("button", { name: "Media" }).click();
  await expect(newFieldDialog.getByRole("button", { name: /Media upload/ })).toBeVisible();
  await page.getByRole("button", { name: "Close new field picker" }).click();
  await openPreview(page);

  for (const label of [
    "Short Answer",
    "Long Answer",
    "Number",
    "Date",
    "Time",
    "Yes No",
    "Boolean false",
    "Boolean true",
    "Toggle false",
    "Toggle true",
    "Required media",
    "Dropdown",
    "Multi Select",
    "Checkbox confirmation",
    "Signature",
    "Action item rows",
    "Suggested due date",
  ]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await expect(page.locator(".template-signature-canvas")).toBeVisible();

  await page.goto("/forms/generic_smoke");
  await page.getByRole("button", { name: "Submit Generic Smoke" }).click();
  await expect(page.getByText("Required media is required.")).toBeVisible();
  await page.locator('input[type="file"][aria-label="Required media"]').setInputFiles([
    {
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("jpg"),
    },
    {
      name: "report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 smoke"),
    },
    {
      name: "metrics.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx"),
    },
  ]);
  await expect(page.getByText("photo.jpg")).toBeVisible();
  await expect(page.getByText("report.pdf")).toBeVisible();
  await expect(page.getByText("metrics.xlsx")).toBeVisible();
  await expect(page.getByLabel("Boolean false")).not.toBeChecked();
  await expect(page.getByLabel("Toggle false")).not.toBeChecked();
  await page.getByLabel("Boolean true").check();
  await page.getByLabel("Toggle true").check();
  await page.getByLabel("No action items needed.").check();
  await page.getByRole("button", { name: "Submit Generic Smoke" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.boolean_false).toBe(false);
  expect(submissions[0].formData.answers.boolean_true).toBe(true);
  expect(submissions[0].formData.answers.toggle_false).toBe(false);
  expect(submissions[0].formData.answers.toggle_true).toBe(true);
  expect(submissions[0].formData.answers.media_required).toEqual([
    expect.objectContaining({
      storagePath: expect.stringContaining(`${worker.id}/smoke-`),
      originalFilename: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3,
    }),
    expect.objectContaining({
      storagePath: expect.stringContaining(`${worker.id}/smoke-`),
      originalFilename: "report.pdf",
      mimeType: "application/pdf",
    }),
    expect.objectContaining({
      storagePath: expect.stringContaining(`${worker.id}/smoke-`),
      originalFilename: "metrics.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  ]);
});

test("legacy-style layout, choice displays, instruction styles, and integer numbers work", async ({ page }) => {
  const row = template("legacy_style_smoke", "Legacy Style Smoke", legacyStyleSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await page.locator(".template-v3-section").filter({ hasText: "Policy Review" }).getByRole("button").first().click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByLabel("Section width")).toHaveValue("half");
  await page.locator(".template-v3-field-card").filter({ hasText: "Review each section" }).getByRole("button").first().click();
  await expect(selectedBlock.getByLabel("Field width")).toHaveValue("full");
  await expect(selectedBlock.getByLabel("Instruction style")).toHaveValue("policy");
  await page.locator(".template-v3-field-card").filter({ hasText: "Do you understand the policy?" }).getByRole("button").first().click();
  await expect(selectedBlock.getByLabel("Display style")).toHaveValue("radio");
  await expect(selectedBlock.getByLabel("Option preset")).toHaveValue("yes_no_na");
  await page.locator(".template-v3-field-card").filter({ hasText: "Training topics completed" }).getByRole("button").first().click();
  await expect(selectedBlock.getByLabel("Display style")).toHaveValue("checklist");
  await page.locator(".template-v3-field-card").filter({ hasText: "Years experience" }).getByRole("button").first().click();
  await expect(selectedBlock.getByLabel("Number type")).toHaveValue("integer");
  await page.locator(".template-v3-field-card").filter({ hasText: "Muster Station" }).getByRole("button").first().click();
  await expect(selectedBlock.getByLabel("Static default")).toHaveValue("Northeast corner of site");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.locator(".template-instructions-policy")).toContainText("Review each section");
  await expect(preview.getByRole("radio", { name: "Yes" })).toBeVisible();
  await expect(preview.getByLabel("WHMIS")).toBeVisible();
  await expect(preview.getByLabel("Years experience")).toBeVisible();
  await expect(preview.getByLabel("Muster Station")).toHaveValue("Northeast corner of site");

  await page.goto("/forms/legacy_style_smoke");
  const radioGroup = page.locator(".template-radio-choice-field").filter({ hasText: "Do you understand the policy?" });
  await radioGroup.getByRole("radio", { name: "Yes" }).click();
  await page.getByLabel("WHMIS").check();
  await page.getByLabel("Mobile equipment").check();
  await page.getByLabel("Years experience").fill("4");
  await page.getByRole("button", { name: "Submit Legacy Style Smoke" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.acknowledgement).toBe("Yes");
  expect(submissions[0].formData.answers.training_topics).toEqual(["WHMIS", "Mobile equipment"]);
  expect(submissions[0].formData.answers.years_experience).toBe(4);
  expect(submissions[0].formData.answers.muster_station).toBe("Northeast corner of site");
});

test("New Worker Orientation migration opens as a draft hidden V3 template", async ({ page }) => {
  const row = draftTemplate(
    "new_worker_orientation",
    "New Worker Orientation",
    newWorkerOrientationSchema,
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "New Worker Orientation" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "New Worker Orientation" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Paper Orientation Images" })
    .getByRole("button")
    .first()
    .click();
  await expect(selectedBlock.getByText("Accepted uploads")).toBeVisible();
  await expect(selectedBlock.getByLabel("Images")).toBeChecked();
  await expect(selectedBlock.getByLabel("PDF")).not.toBeChecked();
  await expect(selectedBlock.getByLabel("Excel")).not.toBeChecked();

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "NEW WORKER ORIENTATION", exact: true })).toBeVisible();
  await expect(preview.getByLabel("Worker Name")).toHaveValue(staff.username);
  await expect(preview.getByLabel("Telephone Number")).toHaveValue("");
  await expect(preview.getByLabel("Telephone Number")).toHaveAttribute("type", "tel");
  await expect(preview.getByLabel("Supervisor Telephone")).toHaveAttribute("type", "tel");
  await expect(preview.getByLabel("Phone", { exact: true })).toHaveAttribute("type", "tel");
  await expect(preview.getByLabel("Muster Station")).toHaveValue("Northeast corner of site @ Skyline Drive (green sign)");
  await expect(preview.getByText("JPG, PNG, WEBP, HEIC / 5 files max / 50 MiB each").first()).toBeVisible();
  await expect(preview.getByText("Worker's name (hidden)")).toHaveCount(0);
  await expect(preview.getByText("Date of orientation by employer")).toHaveCount(0);

  const employerOrientation = preview
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Have you received a New or Young Worker Orientation" });
  await employerOrientation.getByRole("radio", { name: "Yes" }).click();
  await expect(preview.getByLabel("Date of orientation by employer")).toBeVisible();
  await employerOrientation.getByRole("radio", { name: "No" }).click();
  await expect
    .poll(() =>
      preview.locator("input").evaluateAll(
        (inputs, expected) => inputs.some((input) => input.value === expected),
        "My Foreman/Supervisor will provide one before I begin work",
      ),
    )
    .toBe(true);
  await expect(preview.getByText("Supervisor's acknowledgement")).toBeVisible();
  await expect(preview.getByLabel("Supervisor's acknowledgement: (To be completed by supervisor)")).toBeVisible();
});

test("Salus Toolbox Talk migration opens as hidden draft and runs as a Toolbox form", async ({ page }) => {
  const draftRow = draftTemplate(
    "salus_toolbox_talk",
    "Salus Toolbox Talk",
    salusToolboxTalkSchema,
    { displayOrder: 50 },
  );
  await mockApis(page, [draftRow]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Salus Toolbox Talk" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Salus Toolbox Talk" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Basic Personal Protective Equipment" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card")).toContainText("Multi-select chips");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Salus Toolbox Talk" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Topics Discussed" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Review Notes" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Safety Concerns Brought up by Workers" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Attendance" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Presenter/Supervisor Confirmation" })).toBeVisible();
  await expect(preview.getByText("Basic Personal Protective Equipment")).toBeVisible();
  await expect(preview.getByText("Specialized Personal Protective Equipment")).toBeVisible();
  await expect(preview.getByText("Attach Documents or Photos")).toBeVisible();
  await expect(preview.getByText(/JPG, PNG, WEBP, HEIC, PDF/)).toBeVisible();

  const liveRow = template("salus_toolbox_talk", "Salus Toolbox Talk", salusToolboxTalkSchema);
  const submissions = await mockApis(page, [liveRow]);
  await page.goto("/forms/salus_toolbox_talk");
  await expect(page.getByRole("heading", { name: "Salus Toolbox Talk" })).toBeVisible();
  await page.getByRole("textbox", { name: "Supervisor", exact: true }).fill("Bob");
  await page.getByRole("button", { name: "Housekeeping / clean-up" }).first().click();
  const attendanceInput = page.getByPlaceholder("Worker name or comma-separated names");
  await attendanceInput.fill("Billy Bob Thornton, Chris Jones");
  await attendanceInput.press("Enter");
  await page.getByLabel("I confirm the listed workers participated in this toolbox talk.").check();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect(page.getByText("Basic Personal Protective Equipment is required.")).toBeVisible();

  await page.getByLabel("CSA Approved Hard Hats - visual inspection").check();
  await page.getByLabel(/Respiratory Equipment - visual inspection/).check();
  await page.locator('input[type="file"][aria-label="Attach Documents or Photos"]').setInputFiles({
    name: "talk-photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("jpg"),
  });
  await expect(page.getByText("talk-photo.jpg")).toBeVisible();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.kind).toBe("toolbox_talk_v1");
  expect(submissions[0].formData.attendance).toEqual([
    { name: "Billy Bob Thornton" },
    { name: "Chris Jones" },
  ]);
  expect(submissions[0].formData.answers.salus_basic_ppe).toEqual([
    "CSA Approved Hard Hats - visual inspection",
  ]);
  expect(submissions[0].formData.answers.salus_specialized_ppe).toEqual([
    "Respiratory Equipment - visual inspection and confirm formal monthly inspection (on separate form)",
  ]);
  expect(submissions[0].formData.answers.salus_attach_documents_photos).toEqual([
    expect.objectContaining({
      originalFilename: "talk-photo.jpg",
      mimeType: "image/jpeg",
    }),
  ]);
});

test("Speed Fan Inspection migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "speed_fan_inspection",
    "Speed Fan Inspection",
    speedFanInspectionSchema,
    { displayOrder: 60 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Speed Fan Inspection" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Speed Fan Inspection" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Add Photo" })
    .getByRole("button")
    .first()
    .click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByText("Accepted uploads")).toBeVisible();
  await expect(selectedBlock.getByLabel("Images")).toBeChecked();
  await expect(selectedBlock.getByLabel("PDF")).not.toBeChecked();
  await expect(selectedBlock.getByLabel("Excel")).not.toBeChecked();

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Speed Fan Inspection" })).toBeVisible();
  await expect(preview.getByText("Weather Conditions/Temperature")).toBeVisible();
  await expect(preview.getByText("SYSTEM VERIFICATION")).toBeVisible();
  await expect(preview.getByText("Verify all anchors are snug")).toBeVisible();
  await expect(preview.getByText("General Safety")).toBeVisible();
  await expect(preview.getByText("Fall Protection", { exact: true })).toBeVisible();
  await expect(preview.getByText("Unsafe Act / Condition")).toBeVisible();
  await expect(preview.getByText("Safety Concerns Raised", { exact: true })).toBeVisible();
  await expect(preview.getByText("Add Photo")).toBeVisible();
  await expect(preview.getByText("JPG, PNG, WEBP, HEIC / 5 files max / 50 MiB each")).toBeVisible();
  await expect(preview.getByText("Inspector Signatures")).toBeVisible();
  await expect(preview.locator(".template-signature-canvas")).toBeVisible();
});

test("Speed Fan Inspection worker form honors image-only uploads and required fields", async ({ page }) => {
  const row = template("speed_fan_inspection", "Speed Fan Inspection", speedFanInspectionSchema);
  await mockApis(page, [row]);

  await page.goto("/forms/speed_fan_inspection");
  await expect(page.getByRole("heading", { name: "Speed Fan Inspection" })).toBeVisible();
  await expect(page.getByText("SYSTEM VERIFICATION")).toBeVisible();
  await page.locator('input[type="file"][aria-label="Add Photo"]').setInputFiles({
    name: "speed-report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke"),
  });
  await expect(page.getByText(/Use JPG, PNG, WEBP, HEIC files/)).toBeVisible();
  await page.locator('input[type="file"][aria-label="Add Photo"]').setInputFiles({
    name: "speed-photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("jpg"),
  });
  await expect(page.getByText("speed-photo.jpg")).toBeVisible();
  await page.getByRole("button", { name: "Submit Speed Fan Inspection" }).click();
  await expect(page.getByText("Location: Include Level, Residential or Office, etc. is required.")).toBeVisible();
  await page.getByLabel("Location: Include Level, Residential or Office, etc.").fill("Level 3");
  await page.getByRole("button", { name: "Submit Speed Fan Inspection" }).click();
  await expect(page.getByText("SYSTEM VERIFICATION is required.")).toBeVisible();
  await page.getByLabel("Verify all anchors are snug, in good condition and free from tampering.").check();
  await page.getByRole("button", { name: "Submit Speed Fan Inspection" }).click();
  await expect(page.getByText("Inspector Signatures is required.")).toBeVisible();
});

test("Hoist Competency Observation migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "hoist_competency_observation",
    "Hoist Competency Observation",
    hoistCompetencyObservationSchema,
    { displayOrder: 70 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Hoist Competency Observation" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Hoist Competency Observation" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Hoist Competency Observation" })).toBeVisible();
  await expect(preview.getByText("The competency observation form is one method")).toBeVisible();
  await expect(preview.getByText("Is this an Appia worker?")).toBeVisible();
  await expect(preview.getByText("Employer of worker observed")).toHaveCount(0);
  const appiaWorker = preview
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Is this an Appia worker?" });
  await appiaWorker.getByRole("radio", { name: "No" }).click();
  await expect(preview.getByLabel("Employer of worker observed")).toBeVisible();
  await expect(preview.getByText("Performs pre-use inspection")).toBeVisible();
  await expect(preview.getByText("What is the hoist rated capacity?")).toBeVisible();
  await expect(preview.getByText("Evaluation Outcome")).toBeVisible();
  await expect(preview.getByText("Operator Signature")).toBeVisible();
  await expect(preview.getByText("Evaluator Signature")).toBeVisible();
  await expect(preview.locator(".template-signature-canvas")).toHaveCount(2);
});

test("Hoist Competency Observation worker form submits conditional employer and outcome", async ({ page }) => {
  const row = template(
    "hoist_competency_observation",
    "Hoist Competency Observation",
    hoistCompetencyObservationSchema,
  );
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/hoist_competency_observation");
  await expect(page.getByRole("heading", { name: "Hoist Competency Observation" })).toBeVisible();
  const appiaWorker = page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Is this an Appia worker?" });
  await appiaWorker.getByRole("radio", { name: "No" }).click();
  await page.getByRole("button", { name: "Submit Hoist Competency Observation" }).click();
  await expect(page.getByText("Employer of worker observed is required.")).toBeVisible();
  await page.getByLabel("Employer of worker observed").fill("TK Elevators");
  await page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Evaluation Outcome" })
    .getByRole("radio", { name: "Competent - Approved to operate" })
    .click();
  await page.getByRole("button", { name: "Submit Hoist Competency Observation" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.hoist_employer_observed).toBe("TK Elevators");
  expect(submissions[0].formData.answers.hoist_evaluation_outcome).toBe("Competent - Approved to operate");
});

test("Fall Protection Form migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "fall_protection_form",
    "Fall Protection Form",
    fallProtectionSchema,
    { displayOrder: 80 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Fall Protection Form" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Fall Protection Form" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Equipment Inspected" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card")).toContainText("Radio buttons");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Fall Protection Form" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Fall Protection Equipment Inspection Checklist and Log" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Equipment Information" })).toBeVisible();
  await expect(preview.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toBeVisible();
  await expect(preview.getByText("11-06 Harness Inspection")).toHaveCount(0);
  await preview.getByRole("radio", { name: "Full Body Harness" }).click();
  await expect(preview.getByText("11-06 Harness Inspection")).toBeVisible();
  await expect(preview.getByText("Manufacturer Label")).toBeVisible();
  await expect(preview.getByText("Webbing defects")).toBeVisible();
  await expect(preview.getByText("11-09 SRL Inspection")).toHaveCount(0);
  await expect(preview.getByText("Inspector's Signature")).toBeVisible();
  await expect(preview.locator(".template-signature-canvas")).toBeVisible();
});

test("Fall Protection Form worker form honors conditional sections and image-only uploads", async ({ page }) => {
  const row = template("fall_protection_form", "Fall Protection Form", fallProtectionSchema);
  await mockApis(page, [row]);

  await page.goto("/forms/fall_protection_form");
  await expect(page.getByRole("heading", { name: "Fall Protection Form" })).toBeVisible();
  await expect(page.getByText("11-06 Harness Inspection")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit Fall Protection Form" }).click();
  await expect(page.getByText("Equipment Inspected is required.")).toBeVisible();

  await page.getByRole("radio", { name: "Full Body Harness" }).click();
  await expect(page.getByText("11-06 Harness Inspection")).toBeVisible();
  await expect(page.getByText("11-09 SRL Inspection")).toHaveCount(0);

  const upload = page.locator('input[type="file"][aria-label^="Add images of Make"]');
  await upload.setInputFiles({
    name: "fall-report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke"),
  });
  await expect(page.getByText(/Use JPG, PNG, WEBP, HEIC files/)).toBeVisible();
  await upload.setInputFiles({
    name: "harness-label.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("jpg"),
  });
  await expect(page.getByText("harness-label.jpg")).toBeVisible();

  await page.getByRole("button", { name: "Submit Fall Protection Form" }).click();
  await expect(page.getByText("Inspector's Signature is required.")).toBeVisible();
});

test("Daily Safety Inspection migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "daily_safety_inspection",
    "Daily Safety Inspection",
    dailySafetyInspectionSchema,
    { displayOrder: 90 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Daily Safety Inspection" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Daily Safety Inspection" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Daily Safety Inspection" })).toBeVisible();
  await expect(preview.getByText("Work Area Inspection Report")).toBeVisible();
  await expect(preview.getByText("Access Egress Inspection")).toBeVisible();
  await expect(preview.getByText("Check all items that are compliant OR not applicable")).toBeVisible();
  await expect(preview.getByText("Safety Concerns Raised", { exact: true }).first()).toBeVisible();
  await expect(preview.getByText("Observed Act / Condition")).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Signatures", exact: true })).toBeVisible();
  await expect(preview.getByText("Scaffold Inspection")).toHaveCount(0);

  await preview.locator(".template-field-daily_access_items").getByLabel("Scaffold").check();
  await expect(preview.getByText("Scaffold Inspection")).toBeVisible();
  await expect(preview.getByText("Para-Stair Inspection")).toHaveCount(0);
  await preview.locator(".template-field-daily_access_items").getByLabel("Para-Stairs").check();
  await expect(preview.getByText("Para-Stair Inspection")).toBeVisible();
  await expect(preview.getByText("No safety concerns raised today.")).toBeVisible();
  await expect(preview.getByText("Add Photo")).toBeVisible();
  await expect(preview.getByText(/JPG, PNG, WEBP, HEIC/)).toBeVisible();
  await expect(preview.getByText("Inspector Signatures")).toBeVisible();
  await expect(preview.locator(".template-signature-canvas")).toHaveCount(2);
});

test("Daily Safety Inspection worker form honors conditional sections, image-only uploads, and required signatures", async ({ page }) => {
  const row = template("daily_safety_inspection", "Daily Safety Inspection", dailySafetyInspectionSchema);
  await mockApis(page, [row]);

  await page.goto("/forms/daily_safety_inspection");
  await expect(page.getByRole("heading", { name: "Daily Safety Inspection" })).toBeVisible();
  await expect(page.getByText("Scaffold Inspection")).toHaveCount(0);
  await page.locator(".template-field-daily_access_items").getByLabel("Scaffold").check();
  await expect(page.getByText("Scaffold Inspection")).toBeVisible();

  const upload = page.locator('input[type="file"][aria-label="Add Photo"]');
  await upload.setInputFiles({
    name: "daily-report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke"),
  });
  await expect(page.getByText(/Use JPG, PNG, WEBP, HEIC files/)).toBeVisible();
  await upload.setInputFiles({
    name: "daily-photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("jpg"),
  });
  await expect(page.getByText("daily-photo.jpg")).toBeVisible();

  await page.getByLabel("No safety concerns raised today.").check();
  await page.getByRole("button", { name: "Submit Daily Safety Inspection" }).click();
  await expect(page.getByText("Inspector Signatures is required.")).toBeVisible();
  await expect(page.locator(".template-section-daily_signatures")).toHaveClass(/toolbox-section-invalid/);
});

test("New Worker Orientation worker form visual smoke captures polished states", async ({ page }) => {
  test.slow();
  const row = template(
    "new_worker_orientation",
    "New Worker Orientation",
    newWorkerOrientationSchema,
  );
  await mockApis(page, [row]);

  for (const viewport of newWorkerOrientationViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/forms/new_worker_orientation");
    await expect(page.locator(".template-worker-form-new_worker_orientation")).toBeVisible();
    await expect(page.getByRole("heading", { name: "NEW WORKER ORIENTATION", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "TRAFFIC CONTROL", exact: true })).toBeVisible();
    await expectNoClippedNewWorkerOrientationChoices(page);
    await expectNoStretchedNewWorkerOrientationSections(page);
    await expectAlignedNewWorkerOrientationChoiceRows(page);
    await expectNewWorkerOrientationUploadButtonReadable(page);
    await expectNewWorkerOrientationSubmitButtonReasonable(page);
    await captureNewWorkerOrientationScreenshot(page, `${viewport.name}-initial`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/forms/new_worker_orientation");
  await page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Will you be doing traffic control on our site?" })
    .getByRole("radio", { name: "Yes" })
    .click();
  await page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "Have you received a New or Young Worker Orientation" })
    .getByRole("radio", { name: "No" })
    .click();
  const supervisorSignature = page.getByLabel("Supervisor's acknowledgement: (To be completed by supervisor)");
  await expect(supervisorSignature).toBeVisible();
  await supervisorSignature.scrollIntoViewIfNeeded();
  await expectNoClippedNewWorkerOrientationChoices(page);
  await expectNoStretchedNewWorkerOrientationSections(page);
  await expectAlignedNewWorkerOrientationChoiceRows(page);
  await expectNewWorkerOrientationSubmitButtonReasonable(page);
  await captureNewWorkerOrientationScreenshot(page, "desktop-conditional-signature");

  await page.getByRole("button", { name: "Submit New Worker Orientation" }).click();
  await expect(page.getByText("Orientation # is required.")).toBeVisible();
  const orientationSection = page.locator(".template-section-new_worker_orientation");
  await expect(orientationSection).toHaveClass(/toolbox-section-invalid/);
  await expect(page.getByLabel("Orientation #")).toBeFocused();
  await expect
    .poll(async () => orientationSection.evaluate((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top >= -80 && rect.top <= window.innerHeight * 0.35;
    }))
    .toBe(true);
  await expectNoClippedNewWorkerOrientationChoices(page);
  await expectNoStretchedNewWorkerOrientationSections(page);
  await expectAlignedNewWorkerOrientationChoiceRows(page);
  await expectNewWorkerOrientationSubmitButtonReasonable(page);
  await captureNewWorkerOrientationScreenshot(page, "desktop-validation");
});

test("conditional visibility, hidden worker variables, and image-only media settings work", async ({ page }) => {
  const row = template("advanced_settings_smoke", "Advanced Settings Smoke", advancedSettingsSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await page.locator(".template-v3-field-card").filter({ hasText: "Training details" }).getByRole("button").first().click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByText("Conditional visibility")).toBeVisible();
  await expect(selectedBlock.getByLabel("When field")).toHaveValue("needs_training");
  await page.locator(".template-v3-field-card").filter({ hasText: "Hidden worker name" }).getByRole("button").first().click();
  await expect(selectedBlock.getByText("Hidden from workers")).toBeVisible();
  await expect(selectedBlock.getByLabel("Default value")).toHaveValue("worker_name");
  await page.locator(".template-v3-field-card").filter({ hasText: "Image evidence" }).getByRole("button").first().click();
  await expect(selectedBlock.getByText("Accepted uploads")).toBeVisible();
  await expect(selectedBlock.getByLabel("Images")).toBeChecked();
  await expect(selectedBlock.getByLabel("PDF")).not.toBeChecked();
  await expect(selectedBlock.getByLabel("Excel")).not.toBeChecked();
  await selectedBlock.getByLabel("Conditional visibility").check();
  await expect(selectedBlock.getByLabel("Conditional visibility")).toBeChecked();
  await expect(selectedBlock.getByLabel("When field")).toHaveValue("needs_training");

  await openPreview(page);
  await expect(page.getByText("Training details")).toHaveCount(0);
  await expect(page.getByText("Hidden worker name")).toHaveCount(0);
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByLabel("Training details")).toBeVisible();
  await expect(page.getByText("JPG, PNG, WEBP, HEIC / 5 files max / 50 MiB each")).toBeVisible();

  await page.goto("/forms/advanced_settings_smoke");
  await expect(page.getByText("Training details")).toHaveCount(0);
  await expect(page.getByText("Hidden worker name")).toHaveCount(0);
  await page.getByRole("button", { name: "No" }).click();
  await page.locator('input[type="file"][aria-label="Image evidence"]').setInputFiles({
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke"),
  });
  await expect(page.getByText(/Use JPG, PNG, WEBP, HEIC files/)).toBeVisible();
  await page.locator('input[type="file"][aria-label="Image evidence"]').setInputFiles({
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("jpg"),
  });
  await expect(page.getByText("photo.jpg")).toBeVisible();
  await page.getByRole("button", { name: "Submit Advanced Settings Smoke" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.needs_training).toBe("no");
  expect(submissions[0].formData.answers.training_details).toBeUndefined();
  expect(submissions[0].formData.answers.hidden_name).toBe(worker.name);
  expect(submissions[0].formData.answers.hidden_phone).toBe(worker.phone);
  expect(submissions[0].formData.answers.hidden_username).toBe(worker.username);
  expect(submissions[0].formData.answers.hidden_company).toBe(worker.company);
  expect(submissions[0].formData.answers.hidden_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(submissions[0].formData.answers.image_evidence).toEqual([
    expect.objectContaining({
      originalFilename: "photo.jpg",
      mimeType: "image/jpeg",
    }),
  ]);
});

test("conditional visibility helper creates a driver when none exists", async ({ page }) => {
  const row = template("no_driver_visibility_smoke", "No Driver Visibility Smoke", noDriverVisibilitySchema);
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await page.locator(".template-v3-section").filter({ hasText: "Target Section" }).getByRole("button").first().click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByText("No driver field yet")).toBeVisible();
  await expect(selectedBlock.getByText("Short answers cannot drive conditions.")).toBeVisible();
  await selectedBlock.getByRole("button", { name: "Add Yes / No driver" }).click();
  await expect(selectedBlock.getByLabel("Conditional visibility")).toBeChecked();
  await expect(selectedBlock.getByLabel("When field")).toHaveValue(/visibility_driver_/);
  await expect(page.locator(".template-v3-section").filter({ hasText: "Visibility" })).toBeVisible();
  await expect(page.locator(".template-v3-field-card").filter({ hasText: "Show Target Section?" })).toBeVisible();

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByText("Show Target Section?")).toBeVisible();
  await expect(preview.getByText("Target question")).toHaveCount(0);
  await preview.getByRole("button", { name: "Yes" }).click();
  await expect(preview.getByLabel("Target question")).toBeVisible();
});

test("editable templates can be locked, duplicated while locked, and unlocked with a password", async ({ page }) => {
  const lockSchema = {
    ...toolboxSignatureSchema,
    formType: "editable_lock_smoke",
    title: "Editable Lock Smoke",
  };
  const row = template("editable_lock_smoke", "Editable Lock Smoke", lockSchema);
  await mockApis(page, [row], { unlockPassword: "correct-password" });

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("button", { name: "Lock Editable Lock Smoke" })).toBeVisible();
  await page.getByRole("button", { name: "Lock Editable Lock Smoke" }).click();
  await expect(page.getByText("Template locked.")).toBeVisible();
  await expect(page.locator(".template-v3-template-options-card")).toContainText("Locked");
  await expect(page.locator(".template-v3-toolbar-actions")).toContainText("Locked. Unlock to edit.");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);
  await expect(page.locator(".template-v3-template-options-card").getByLabel("Form name")).toBeDisabled();

  await page.locator(".template-v3-actions").getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByRole("heading", { name: "Editable Lock Smoke copy" })).toBeVisible();
  await expect(page.locator(".template-v3-template-options-card")).not.toContainText("Locked");
  await expect(page.getByRole("button", { name: "Lock Editable Lock Smoke copy" })).toBeVisible();

  await page.getByRole("button", { name: "Show all forms" }).click();
  await page.locator(".template-card").filter({ hasText: "Editable Lock Smoke" }).nth(1).getByRole("button").first().click();
  await page.getByRole("button", { name: "Unlock Editable Lock Smoke" }).click();
  const dialog = page.getByRole("dialog", { name: "Unlock form template" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Unlock" }).click();
  await expect(dialog.getByText("Invalid password.")).toBeVisible();
  await dialog.getByLabel("Password").fill("correct-password");
  await dialog.getByRole("button", { name: "Unlock" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Template unlocked.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Lock Editable Lock Smoke" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible();
  await expect(page.locator(".template-v3-template-options-card").getByLabel("Form name")).toBeEnabled();
});

test("regular staff can archive and purge only templates they created", async ({ page }) => {
  const regularStaff = {
    ...staff,
    id: "regular-staff",
    role: "staff",
    username: "regular",
    email: "regular@example.com",
  };
  const ownSchema = { ...toolboxSignatureSchema, formType: "regular_owned", title: "Regular Owned" };
  const otherSchema = { ...toolboxSignatureSchema, formType: "other_active", title: "Other Active" };
  const archivedSchema = { ...toolboxSignatureSchema, formType: "other_archived", title: "Other Archived" };
  const ownRow = template("regular_owned", "Regular Owned", ownSchema, {
    created_by_staff_id: regularStaff.id,
    displayOrder: 1,
  });
  const otherActive = template("other_active", "Other Active", otherSchema, {
    created_by_staff_id: "other-staff",
    displayOrder: 2,
  });
  const otherArchived = template("other_archived", "Other Archived", archivedSchema, {
    active: false,
    worker_visible: false,
    archived_at: "2026-07-02T19:00:00.000Z",
    created_by_staff_id: "other-staff",
    displayOrder: 3,
  });
  await mockApis(page, [ownRow, otherActive, otherArchived], { staff: regularStaff });

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Regular Owned" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive form" }).click();
  await expect(page.getByText("Template archived.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Other Active" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);

  await page.locator(".template-archive-toggle").click();
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("Delete 1 archived form template");
    return dialog.accept();
  });
  await page.getByRole("button", { name: "Delete archived" }).click();
  await expect(page.getByText("Deleted 1 archived form template.")).toBeVisible();
  await page.locator(".template-archive-toggle").click();
  await expect(page.locator(".template-archive-items")).toContainText("Other Archived");
  await expect(page.locator(".template-archive-items")).not.toContainText("Regular Owned");
  await expect(page.getByRole("button", { name: "Delete archived" })).toBeDisabled();
});

test("admin can archive and purge non-protected templates while protected defaults stay protected", async ({ page }) => {
  const adminStaff = {
    ...staff,
    id: "admin-staff",
    role: "admin",
    username: "admin",
    email: "admin@example.com",
  };
  const adminSchema = { ...toolboxSignatureSchema, formType: "admin_other", title: "Admin Other" };
  const protectedSchema = { ...toolboxSignatureSchema, formType: "toolbox_talk", title: "Toolbox Talk" };
  const adminOther = template("admin_other", "Admin Other", adminSchema, {
    created_by_staff_id: "other-staff",
    displayOrder: 1,
  });
  const protectedArchived = template("toolbox_talk", "Toolbox Talk", protectedSchema, {
    active: false,
    worker_visible: false,
    archived_at: "2026-07-02T19:00:00.000Z",
    created_by_staff_id: null,
    displayOrder: 2,
    versionNumber: 4,
  });
  await mockApis(page, [adminOther, protectedArchived], { staff: adminStaff });

  await page.goto("/staff/form-templates");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive form" }).click();
  await expect(page.getByText("Template archived.")).toBeVisible();
  await page.locator(".template-archive-toggle").click();
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("Delete 1 archived form template");
    return dialog.accept();
  });
  await page.getByRole("button", { name: "Delete archived" }).click();
  await expect(page.getByText("Deleted 1 archived form template.")).toBeVisible();
  await page.locator(".template-archive-toggle").click();
  await page.locator(".template-archive-items").getByRole("button", { name: /Toolbox Talk/ }).click();
  await expect(page.getByText("Protected default. Duplicate to edit.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Lock Toolbox Talk/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Unlock Toolbox Talk/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore archived", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete archived" })).toBeDisabled();
});

test("protected default templates open in the V3 shell without edit actions", async ({ page }) => {
  const row = template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, { versionNumber: 4 });
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByText("Protected default. Duplicate to edit.").first()).toBeVisible();
  await expect(page.locator(".template-v3-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Lock Toolbox Talk/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Unlock Toolbox Talk/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore previous", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);
});
