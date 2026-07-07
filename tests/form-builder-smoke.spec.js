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

const defaultAssetRows = [
  {
    id: "asset-fall-harness-1",
    name: "Justin - Lanyard",
    assetType: "Fall Protection",
    serialNumber: "GEMTOR",
    model: "SP 1101L3",
    year: "24",
    hours: null,
    kmsMiles: "N/A",
    currentSite: "SOLO 4: Aerius",
    status: "active",
    description: "MFG DATE: 04/24 MAX LENGTH 42\" MAX FREE FALL 6' LENGTH 3' MATERIAL: POLYESTER CAPACITY 350LBS MAX",
    notes: "Imported asset smoke fixture",
    source: "local_import",
    sourceId: "salus-asset-1",
    lastUsedAt: "2024-09-03T22:32:00.000Z",
    archivedAt: null,
  },
];

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
const dailyWashroomInspectionSchema = readMigrationSchema("026_daily_washroom_inspection_template.sql");
const skidSteerLoaderPreUseInspectionSchema = readMigrationSchema("029_skid_steer_loader_pre_use_inspection_template.sql");
const weeklySubTradeSiteInspectionSchema = readMigrationSchema("040_weekly_sub_trade_site_inspection_template.sql");
const importedSalusSchemas = [
  newWorkerOrientationSchema,
  speedFanInspectionSchema,
  hoistCompetencyObservationSchema,
  fallProtectionSchema,
  dailySafetyInspectionSchema,
  dailyWashroomInspectionSchema,
  skidSteerLoaderPreUseInspectionSchema,
  weeklySubTradeSiteInspectionSchema,
];

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
        { id: "asset_optional", type: "asset_picker", label: "Asset picker" },
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

const assetPickerSchema = {
  schemaVersion: 1,
  formType: "asset_picker_smoke",
  title: "Asset Picker Smoke",
  description: "Asset picker smoke template.",
  sections: [
    {
      id: "asset_section",
      title: "Asset Selection",
      description: "",
      fields: [
        {
          id: "selected_asset",
          type: "asset_picker",
          label: "Fall protection asset",
          required: true,
          settings: {
            assetPicker: {
              typeFilter: "Fall Protection",
              siteFilter: "",
              statusFilter: "active",
            },
          },
        },
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
  let assetRows = structuredClone(options.assets || defaultAssetRows);
  let assetLogRows = structuredClone(options.assetLogEntries || []);
  let assetMaintenanceRows = structuredClone(options.assetMaintenanceEntries || []);
  const currentStaff = options.staff || staff;
  const unlockPassword = options.unlockPassword || "letmein";
  const staffSubmissions = options.staffSubmissions || [];
  const workerSubmissions = options.workerSubmissions || staffSubmissions.filter((row) => !row.worker_id || row.worker_id === worker.id);
  const workerSignIns = options.workerSignIns || [];
  const submissions = [];
  const emailRequests = [];
  const pdfRequests = [];
  const translateApiCalls = [];
  const templatePatchRequests = [];
  submissions.emailRequests = emailRequests;
  submissions.pdfRequests = pdfRequests;
  submissions.staffSubmissions = staffSubmissions;
  submissions.workerSubmissions = workerSubmissions;
  submissions.translateApiCalls = translateApiCalls;
  submissions.templatePatchRequests = templatePatchRequests;
  let uploadCount = 0;
  let workerSignInCount = workerSignIns.length;
  let assetCount = assetRows.length;
  let assetEntryCount = assetLogRows.length + assetMaintenanceRows.length;
  let duplicateCount = 0;
  const protectedFormTypes = new Set(["toolbox_talk", "site_inspection", "daily_hazard_assessment"]);
  const findTemplate = (formType) => templateRows.find((row) => row.form_type === formType);
  const canManageTemplate = (row) =>
    ["owner", "admin"].includes(currentStaff.role) ||
    Boolean(row?.created_by_staff_id && row.created_by_staff_id === currentStaff.id);
  const canReorderTemplates = () => ["owner", "admin"].includes(currentStaff.role);
  const nextTemplateVersionNumber = (row) =>
    Math.max(0, ...(row?.versions || []).map((item) => Number(item.version_number || 0))) + 1;
  const mergeMockTemplateVersions = (versions = [], ...incomingVersions) => {
    const next = new Map((Array.isArray(versions) ? versions : []).filter((item) => item?.id).map((item) => [item.id, item]));
    incomingVersions.flat().filter((item) => item?.id).forEach((item) => next.set(item.id, item));
    return [...next.values()].sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
  };
  const replaceTemplate = (updated) => {
    templateRows = templateRows.map((row) => (row.form_type === updated.form_type ? updated : row));
    return updated;
  };
  const jsonTemplate = (row) => structuredClone(row);
  const assertTemplateContentMutationAllowed = (row) => {
    if (!row) return { error: "Not found", status: 404 };
    if (protectedFormTypes.has(row.form_type)) return { error: "Default forms are protected.", status: 400 };
    if (row.archived_at) return { error: "Restore this archived form before editing it.", status: 400 };
    if (row.locked_at) return { error: "This form template is locked. Unlock it to edit.", status: 423 };
    return null;
  };
  const assertTemplateMutationAllowed = (row) => {
    if (!row) return { error: "Not found", status: 404 };
    if (protectedFormTypes.has(row.form_type)) return { error: "Default forms are protected.", status: 400 };
    if (!canManageTemplate(row)) return { error: "You can only manage form templates you created.", status: 403 };
    if (row.archived_at) return { error: "Restore this archived form before editing it.", status: 400 };
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
      if (existing) {
        const signOutToken = `test-token-${existing.id}`;
        return json({ signIn: { ...existing, signOutToken }, signOutToken, created: false }, 200);
      }
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
      const signOutToken = `test-token-${signIn.id}`;
      return json({ signIn: { ...signIn, signOutToken }, signOutToken, created: true }, 201);
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
    if (path === "/api/staff/signins/export" && method === "GET") {
      const date = url.searchParams.get("date") || "2026-07-03";
      const format = url.searchParams.get("format") === "xml" ? "xml" : "csv";
      const isCompanyReport = url.searchParams.get("type") === "company";
      const filenamePrefix = isCompanyReport ? "worker-company-summary" : "worker-sign-ins";
      const rows = workerSignIns.filter((row) => row.sign_in_date_vancouver === date);
      const body = format === "xml"
        ? `<signIns date="${date}">${rows.map((row) => `<signIn><name>${row.name}</name></signIn>`).join("")}</signIns>`
        : `name,company\n${rows.map((row) => `${row.name},${row.company}`).join("\n")}`;
      return route.fulfill({
        status: 200,
        contentType: format === "xml" ? "application/xml; charset=utf-8" : "text/csv; charset=utf-8",
        headers: {
          "content-disposition": `attachment; filename="${filenamePrefix}-${date}.${format}"`,
        },
        body,
      });
    }
    if (path.startsWith("/api/mock-upload/") && method === "PUT") {
      return route.fulfill({ status: 200, body: "" });
    }
    if (path === "/api/staff/assets" && method === "GET") {
      return json({ rows: filterMockAssets(assetRows, url) });
    }
    if (path === "/api/worker/assets" && method === "GET") {
      return json({ rows: filterMockAssets(assetRows, url).filter((asset) => !asset.archivedAt) });
    }
    if (path === "/api/staff/assets/import" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const imported = parseMockAssetImport(body.text || body.content || "");
      let inserted = 0;
      let updated = 0;
      imported.forEach((asset) => {
        const index = assetRows.findIndex((row) =>
          normalizeMockSignInIdentity(row.name) === normalizeMockSignInIdentity(asset.name) &&
          normalizeMockSignInIdentity(row.serialNumber) === normalizeMockSignInIdentity(asset.serialNumber),
        );
        if (index >= 0) {
          assetRows[index] = { ...assetRows[index], ...asset, id: assetRows[index].id };
          updated += 1;
        } else {
          assetRows.push({ ...asset, id: `asset-import-${assetRows.length + 1}` });
          inserted += 1;
        }
      });
      return json({ rows: imported, inserted, updated, skipped: 0 });
    }
    if (path === "/api/staff/assets" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      assetCount += 1;
      const asset = {
        id: `asset-created-${assetCount}`,
        name: String(body.name || body.serialNumber || "Created asset").trim(),
        assetType: String(body.assetType || body.type || "General").trim() || "General",
        serialNumber: String(body.serialNumber || body.vin || "").trim(),
        model: String(body.model || "").trim(),
        year: String(body.year || "").trim(),
        hours: body.hours === "" || body.hours === null || body.hours === undefined ? null : Number(body.hours),
        kmsMiles: String(body.kmsMiles || "").trim(),
        currentSite: String(body.currentSite || body.site || "").trim(),
        status: String(body.status || "active").trim().toLowerCase() || "active",
        description: String(body.description || "").trim(),
        notes: String(body.notes || "").trim(),
        source: "safety_first",
        sourceId: "",
        lastUsedAt: null,
        archivedAt: null,
      };
      assetRows.push(asset);
      return json({ asset }, 201);
    }
    const assetParts = path.split("/").filter(Boolean);
    if (
      assetParts[0] === "api" &&
      assetParts[1] === "staff" &&
      assetParts[2] === "assets" &&
      assetParts.length >= 4
    ) {
      const assetId = assetParts[3];
      const asset = assetRows.find((row) => row.id === assetId);
      if (!asset) return json({ error: "Asset not found" }, 404);
      if (assetParts.length === 4 && method === "GET") return json({ asset });
      if (assetParts.length === 4 && method === "PATCH") {
        const body = JSON.parse(request.postData() || "{}");
        const updated = {
          ...asset,
          name: body.name ?? asset.name,
          assetType: body.assetType ?? body.type ?? asset.assetType,
          serialNumber: body.serialNumber ?? body.vin ?? asset.serialNumber,
          model: body.model ?? asset.model,
          year: body.year ?? asset.year,
          hours: body.hours === undefined ? asset.hours : (body.hours === "" || body.hours === null ? null : Number(body.hours)),
          kmsMiles: body.kmsMiles ?? asset.kmsMiles,
          currentSite: body.currentSite ?? body.site ?? asset.currentSite,
          status: body.status ?? asset.status,
          description: body.description ?? asset.description,
          notes: body.notes ?? asset.notes,
        };
        assetRows = assetRows.map((row) => (row.id === assetId ? updated : row));
        return json({ asset: updated });
      }
      if (assetParts.length === 4 && method === "DELETE") {
        const archived = { ...asset, archivedAt: "2026-07-04T19:00:00.000Z" };
        assetRows = assetRows.map((row) => (row.id === assetId ? archived : row));
        return json({ asset: archived });
      }
      if (assetParts.length === 5 && assetParts[4] === "log-entries" && method === "GET") {
        return json({ rows: assetLogRows.filter((row) => row.assetId === assetId && !row.archivedAt) });
      }
      if (assetParts.length === 5 && assetParts[4] === "log-entries" && method === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        assetEntryCount += 1;
        const entry = {
          id: `asset-log-${assetEntryCount}`,
          assetId,
          status: String(body.status || "active").trim().toLowerCase() || "active",
          site: String(body.site || "").trim(),
          hours: body.hours === "" || body.hours === null || body.hours === undefined ? null : Number(body.hours),
          kmsMiles: String(body.kmsMiles || "").trim(),
          notes: String(body.notes || "").trim(),
          entryDate: body.date || "2026-07-04T19:00:00.000Z",
          archivedAt: null,
        };
        assetLogRows.push(entry);
        return json({ entry }, 201);
      }
      if (assetParts.length === 5 && assetParts[4] === "maintenance-entries" && method === "GET") {
        return json({ rows: assetMaintenanceRows.filter((row) => row.assetId === assetId && !row.archivedAt) });
      }
      if (assetParts.length === 5 && assetParts[4] === "maintenance-entries" && method === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        assetEntryCount += 1;
        const entry = {
          id: `asset-maintenance-${assetEntryCount}`,
          assetId,
          status: String(body.status || "active").trim().toLowerCase() || "active",
          site: String(body.site || "").trim(),
          hours: body.hours === "" || body.hours === null || body.hours === undefined ? null : Number(body.hours),
          kmsMiles: String(body.kmsMiles || "").trim(),
          performedBy: String(body.performedBy || "").trim(),
          notes: String(body.notes || "").trim(),
          maintenanceDate: body.date || "2026-07-04T19:00:00.000Z",
          archivedAt: null,
        };
        assetMaintenanceRows.push(entry);
        return json({ entry }, 201);
      }
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
        const bodyKeys = Object.keys(body);
        const updatesDisplayOrderOnly =
          bodyKeys.length > 0 &&
          bodyKeys.every((key) => ["displayOrder", "display_order"].includes(key));
        const updatesContentMetaOnly =
          bodyKeys.length > 0 &&
          bodyKeys.every((key) => ["label", "name", "title", "description"].includes(key));
        if (!updatesDisplayOrderOnly) {
          const problem = updatesContentMetaOnly
            ? assertTemplateContentMutationAllowed(row)
            : assertTemplateMutationAllowed(row);
          if (problem) return json({ error: problem.error }, problem.status);
        } else if (!canReorderTemplates()) {
          return json({ error: "Only admin and owner accounts can change form template order." }, 403);
        }
        templatePatchRequests.push({
          body,
          formType,
          staffId: currentStaff.id,
        });
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
      if (action === "draft" && method === "PATCH") {
        const problem = assertTemplateContentMutationAllowed(row);
        if (problem) return json({ error: problem.error }, problem.status);
        const body = JSON.parse(request.postData() || "{}");
        const now = "2026-07-03T19:00:00.000Z";
        const existingDraft = row.draftVersion;
        const archivedDraft = existingDraft
          ? {
              ...existingDraft,
              status: "archived",
              notes: existingDraft.notes || "Saved draft state.",
              updated_by_staff_id: currentStaff.id,
              updated_at: now,
            }
          : null;
        const draftVersion = {
          id: `${row.form_type}-version-${nextTemplateVersionNumber(row)}`,
          template_id: row.id,
          form_type: row.form_type,
          version_number: nextTemplateVersionNumber(row),
          status: "draft",
          schema: structuredClone(body.schema || {}),
          notes: String(body.notes || ""),
          created_by_staff_id: currentStaff.id,
          updated_by_staff_id: currentStaff.id,
          created_at: now,
          updated_at: now,
          published_at: null,
        };
        const updated = replaceTemplate({
          ...row,
          draftVersion,
          versions: mergeMockTemplateVersions(row.versions, archivedDraft, draftVersion),
          updated_by_staff_id: currentStaff.id,
        });
        return json({ draft: jsonTemplate(draftVersion), archivedDraft: archivedDraft ? jsonTemplate(archivedDraft) : null });
      }
      if (action === "publish" && method === "POST") {
        const problem = assertTemplateContentMutationAllowed(row);
        if (problem) return json({ error: problem.error }, problem.status);
        if (!row.draftVersion) return json({ error: "No draft exists for this form." }, 404);
        const now = "2026-07-03T19:05:00.000Z";
        const archivedPublished = row.publishedVersion
          ? {
              ...row.publishedVersion,
              status: "archived",
              updated_by_staff_id: currentStaff.id,
              updated_at: now,
            }
          : null;
        const published = {
          ...row.draftVersion,
          status: "published",
          published_by_staff_id: currentStaff.id,
          published_at: now,
          updated_by_staff_id: currentStaff.id,
          updated_at: now,
        };
        replaceTemplate({
          ...row,
          active: true,
          draftVersion: null,
          publishedVersion: published,
          versions: mergeMockTemplateVersions(row.versions, archivedPublished, published).filter((item) => item.id !== row.draftVersion.id || item.status === "published"),
          updated_by_staff_id: currentStaff.id,
        });
        return json({ published: jsonTemplate(published) });
      }
      if (action === "restore" && method === "POST") {
        const problem = assertTemplateContentMutationAllowed(row);
        if (problem) return json({ error: problem.error }, problem.status);
        const body = JSON.parse(request.postData() || "{}");
        const source = (row.versions || []).find((item) => item.id === (body.versionId || body.version_id));
        if (!source) return json({ error: "Form template version was not found." }, 404);
        const now = "2026-07-03T19:10:00.000Z";
        const existingDraft = row.draftVersion;
        const archivedDraft = existingDraft
          ? {
              ...existingDraft,
              status: "archived",
              notes: existingDraft.notes || "Saved draft state before restore.",
              updated_by_staff_id: currentStaff.id,
              updated_at: now,
            }
          : null;
        const draftVersion = {
          id: `${row.form_type}-version-${nextTemplateVersionNumber(row)}`,
          template_id: row.id,
          form_type: row.form_type,
          version_number: nextTemplateVersionNumber(row),
          status: "draft",
          schema: structuredClone(source.schema || {}),
          notes: `Restored from version ${source.version_number}.`,
          created_by_staff_id: currentStaff.id,
          updated_by_staff_id: currentStaff.id,
          created_at: now,
          updated_at: now,
          published_at: null,
        };
        replaceTemplate({
          ...row,
          draftVersion,
          versions: mergeMockTemplateVersions(row.versions, archivedDraft, draftVersion),
          updated_by_staff_id: currentStaff.id,
        });
        return json({ draft: jsonTemplate(draftVersion), archivedDraft: archivedDraft ? jsonTemplate(archivedDraft) : null });
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
    if (path === "/api/staff/submissions/filters" && method === "GET") {
      return json({
        companyOptions: mockSubmittedCompanyOptions(staffSubmissions),
        formOptions: templateRows.map((row) => ({
          id: row.form_type,
          label: row.label,
        })),
      });
    }
    if (path === "/api/staff/submissions" && method === "GET") {
      const company = String(url.searchParams.get("company") || "").trim();
      const phone = String(url.searchParams.get("phone") || "").trim();
      const name = String(url.searchParams.get("name") || "").trim();
      const formType = String(url.searchParams.get("formType") || url.searchParams.get("form_type") || "").trim();
      const backupStatus = String(url.searchParams.get("backupStatus") || url.searchParams.get("backup_status") || "").trim();
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50) || 50));
      const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
      const rows = staffSubmissions
        .filter((row) => !company || normalizeMockSignInIdentity(row.company) === normalizeMockSignInIdentity(company))
        .filter((row) => !phone || normalizeMockSignInIdentity(row.worker_phone).includes(normalizeMockSignInIdentity(phone)))
        .filter((row) => !name || normalizeMockSignInIdentity(row.worker_name).includes(normalizeMockSignInIdentity(name)))
        .filter((row) => !formType || row.form_type === formType)
        .filter((row) => !backupStatus || row.one_drive_backup_status === backupStatus);
      const pageRows = rows.slice(offset, offset + limit);
      return json({
        rows: pageRows,
        total: rows.length,
        limit,
        offset,
        hasMore: offset + pageRows.length < rows.length,
        sort: url.searchParams.get("sort") || "submitted_at",
        dir: url.searchParams.get("dir") || "desc",
      });
    }
    const staffSubmissionParts = path.split("/").filter(Boolean);
    if (
      method === "GET" &&
      staffSubmissionParts.length === 5 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions" &&
      staffSubmissionParts[4] === "pdf"
    ) {
      const submissionId = staffSubmissionParts[3];
      const row = staffSubmissions.find((item) => item.id === submissionId);
      if (!row) return json({ error: "Not found" }, 404);
      const body = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`);
      pdfRequests.push({ scope: "staff", submissionId });
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: {
          "content-disposition": `attachment; filename="${row.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${row.form_type}.pdf"`,
        },
        body,
      });
    }
    if (path === "/api/worker/submissions" && method === "GET") {
      return json({ rows: workerSubmissions });
    }
    const workerSubmissionParts = path.split("/").filter(Boolean);
    if (
      method === "GET" &&
      workerSubmissionParts.length === 5 &&
      workerSubmissionParts[0] === "api" &&
      workerSubmissionParts[1] === "worker" &&
      workerSubmissionParts[2] === "submissions" &&
      workerSubmissionParts[4] === "pdf"
    ) {
      const submissionId = workerSubmissionParts[3];
      const row = workerSubmissions.find((item) => item.id === submissionId);
      if (!row) return json({ error: "Not found" }, 404);
      const body = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF`);
      pdfRequests.push({ scope: "worker", submissionId });
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: {
          "content-disposition": `attachment; filename="${row.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${row.form_type}.pdf"`,
        },
        body,
      });
    }
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
    if (
      method === "PATCH" &&
      staffSubmissionParts.length === 4 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions"
    ) {
      const submissionId = staffSubmissionParts.at(-1);
      const index = staffSubmissions.findIndex((item) => item.id === submissionId);
      if (index < 0) return json({ error: "Not found" }, 404);
      const row = staffSubmissions[index];
      if (row.submission_mode !== "fill_form" || row.form_data?.kind !== "template_submission_v1") {
        return json({ error: "This submission type is not editable yet." }, 400);
      }
      const body = JSON.parse(request.postData() || "{}");
      const formData = body.formData || body.form_data || {};
      staffSubmissions[index] = {
        ...row,
        notes: `Editable Safety Form / Project Name: ${formData.answers?.project_name || "-"} / Approved?: ${formData.answers?.approved || "-"}`,
        one_drive_backup_status: "pending",
        one_drive_web_url: "",
        form_data: {
          ...row.form_data,
          answers: formData.answers || {},
          actionItemBlocks: formData.actionItemBlocks || {},
        },
      };
      return json({ submission: staffSubmissions[index] });
    }
    if (
      method === "POST" &&
      staffSubmissionParts.length === 5 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions" &&
      staffSubmissionParts[4] === "signoffs"
    ) {
      const submissionId = staffSubmissionParts[3];
      const index = staffSubmissions.findIndex((item) => item.id === submissionId);
      if (index < 0) return json({ error: "Not found" }, 404);
      const body = JSON.parse(request.postData() || "{}");
      if (!String(body.signatureDataUrl || "").startsWith("data:image/png;base64,")) {
        return json({ error: "Staff signature is required." }, 400);
      }
      const signoff = {
        id: `staff-signoff-${(staffSubmissions[index].staff_signoffs || []).length + 1}`,
        staff_id: currentStaff.id,
        staff_name: currentStaff.display_name || currentStaff.username,
        staff_username: currentStaff.username,
        signature_data_url: body.signatureDataUrl,
        comments: String(body.comments || ""),
        signed_at: "2026-07-03T20:45:00.000Z",
      };
      staffSubmissions[index] = {
        ...staffSubmissions[index],
        staff_signoffs: [...(staffSubmissions[index].staff_signoffs || []), signoff],
        staff_reviewed_at: signoff.signed_at,
        staff_reviewed_by_staff_id: currentStaff.id,
      };
      return json({ submission: staffSubmissions[index] });
    }
    if (
      method === "POST" &&
      staffSubmissionParts.length === 5 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions" &&
      staffSubmissionParts[4] === "email"
    ) {
      const submissionId = staffSubmissionParts[3];
      const row = staffSubmissions.find((item) => item.id === submissionId);
      if (!row) return json({ error: "Not found" }, 404);
      const body = JSON.parse(request.postData() || "{}");
      const requestRecord = {
        fileName: String(body.fileName || `${row.form_type}.pdf`),
        recipientEmail: currentStaff.email,
        submissionId,
      };
      emailRequests.push(requestRecord);
      return json({
        emailId: `email-${emailRequests.length}`,
        fileName: requestRecord.fileName,
        recipientEmail: currentStaff.email,
        sizeBytes: 512,
      });
    }
    if (
      method === "POST" &&
      staffSubmissionParts.length === 5 &&
      staffSubmissionParts[0] === "api" &&
      staffSubmissionParts[1] === "staff" &&
      staffSubmissionParts[2] === "submissions" &&
      staffSubmissionParts[4] === "translate"
    ) {
      translateApiCalls.push({
        submissionId: staffSubmissionParts[3],
        method,
      });
      return json({ error: "Translate API should not be called." }, 500);
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

function mockSubmittedCompanyOptions(rows) {
  return [...new Set(
    rows
      .map((row) => String(row.company || "").trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

function filterMockAssets(rows, url) {
  const query = normalizeMockSignInIdentity(url.searchParams.get("q") || url.searchParams.get("search"));
  const type = normalizeMockSignInIdentity(url.searchParams.get("type"));
  const site = normalizeMockSignInIdentity(url.searchParams.get("site"));
  const status = normalizeMockSignInIdentity(url.searchParams.get("status"));
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  return rows.filter((asset) => {
    if (!includeArchived && asset.archivedAt) return false;
    if (type && !normalizeMockSignInIdentity(asset.assetType).includes(type)) return false;
    if (site && !normalizeMockSignInIdentity(asset.currentSite).includes(site)) return false;
    if (status && status !== "all" && normalizeMockSignInIdentity(asset.status) !== status) return false;
    if (!query) return true;
    return [
      asset.name,
      asset.assetType,
      asset.serialNumber,
      asset.model,
      asset.currentSite,
      asset.status,
    ].some((value) => normalizeMockSignInIdentity(value).includes(query));
  });
}

function parseMockAssetImport(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : parsed.assets || parsed.rows || [];
    return rows.map(normalizeMockAssetImportRow).filter(Boolean);
  }
  const [headerLine = "", ...lines] = trimmed.split(/\r?\n/);
  const headers = headerLine.split(",").map((header) => header.trim().toLowerCase());
  return lines
    .map((line) => {
      const values = line.split(",");
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {});
    })
    .map(normalizeMockAssetImportRow)
    .filter(Boolean);
}

function normalizeMockAssetImportRow(row) {
  const name = String(row.name || row.Name || row.asset || row.Asset || "").trim();
  const serialNumber = String(row.serialNumber || row.serial || row.Serial || row.vin || row.Vin || "").trim();
  if (!name && !serialNumber) return null;
  return {
    id: String(row.id || row.Id || ""),
    name: name || serialNumber,
    assetType: String(row.assetType || row.type || row.Type || "General").trim() || "General",
    serialNumber,
    model: String(row.model || row.Model || "").trim(),
    year: String(row.year || row.Year || "").trim(),
    hours: row.hours || row.Hours ? Number(row.hours || row.Hours) : null,
    kmsMiles: String(row.kmsMiles || row["Kms/Miles"] || row["KMS/Miles"] || "").trim(),
    currentSite: String(row.currentSite || row.site || row.Site || row["Current Site"] || "").trim(),
    status: String(row.status || row.Status || "active").trim().toLowerCase() || "active",
    description: String(row.description || row.Description || "").trim(),
    notes: String(row.notes || row.Notes || "").trim(),
    source: "local_import",
    sourceId: String(row.sourceId || row.id || row.Id || "").trim(),
    lastUsedAt: row.lastUsedAt || row["Last Used"] || null,
    archivedAt: null,
  };
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

function templateSubmissionRow({
  company = "EditCo",
  formType = "editable_template",
  id,
  schemaSnapshot,
  workerName = "Editor Worker",
  answers = {},
  actionItemBlocks = {},
}) {
  const schema = schemaSnapshot || {
    schemaVersion: 1,
    formType,
    title: "Editable Safety Form",
    sections: [
      {
        id: "main",
        title: "Main",
        fields: [
          { id: "project_name", type: "short_text", label: "Project Name", required: true },
          { id: "approved", type: "yes_no", label: "Approved?", required: true },
        ],
      },
    ],
  };
  return {
    id,
    form_type: formType,
    worker_name: workerName,
    worker_phone: "6045551212",
    worker_username: "eworker",
    company,
    submitted_at: "2026-07-03T17:04:00.000Z",
    submitted_date_vancouver: "2026-07-03",
    submission_mode: "fill_form",
    one_drive_backup_status: "backed_up",
    backup_error: "",
    one_drive_web_url: "https://example.test/old-backup",
    notes: "Editable Safety Form / Project Name: Original Project / Approved?: Yes",
    files: [],
    action_items: [],
    form_schema_snapshot: schema,
    form_template_version_id: `${formType}-version-1`,
    form_data: {
      kind: "template_submission_v1",
      version: 1,
      formType,
      templateVersionId: `${formType}-version-1`,
      templateVersionNumber: 1,
      templateTitle: schema.title,
      schemaSnapshot: schema,
      answers: {
        project_name: "Original Project",
        approved: "yes",
        ...answers,
      },
      actionItemBlocks,
    },
  };
}

async function expectNonEmptyDownload(page, buttonName, extension) {
  const downloadPromise = page.waitForEvent("download");
  const button = page.getByRole("button", { name: buttonName, exact: true });
  const menuitem = page.getByRole("menuitem", { name: buttonName, exact: true });
  if (await button.count()) {
    await button.click();
  } else {
    await menuitem.click();
  }
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`));
  const path = await download.path();
  expect(path).toBeTruthy();
  expect(fs.statSync(path).size).toBeGreaterThan(100);
}

async function drawSignatureOnCanvas(page, canvasLocator) {
  const box = await canvasLocator.boundingBox();
  expect(box).toBeTruthy();
  const points = [
    { x: box.x + 24, y: box.y + box.height * 0.6 },
    { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 },
    { x: box.x + box.width * 0.62, y: box.y + box.height * 0.55 },
    { x: box.x + box.width - 28, y: box.y + box.height * 0.42 },
  ];
  const pointer = (point, buttons = 1) => ({
    bubbles: true,
    button: 0,
    buttons,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    isPrimary: true,
    pointerId: 1,
    pointerType: "mouse",
  });
  await canvasLocator.dispatchEvent("pointerdown", pointer(points[0]));
  await canvasLocator.dispatchEvent("pointermove", pointer(points[1]));
  await canvasLocator.dispatchEvent("pointermove", pointer(points[2]));
  await canvasLocator.dispatchEvent("pointermove", pointer(points[3]));
  await canvasLocator.dispatchEvent("pointerup", pointer(points[3], 0));
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

test("form templates open the last selected template or the first template", async ({ page }) => {
  const firstRow = template("first_template", "First Template", {
    ...toolboxSignatureSchema,
    formType: "first_template",
    title: "First Template",
  }, { displayOrder: 10 });
  const secondRow = template("second_template", "Second Template", {
    ...toolboxSignatureSchema,
    formType: "second_template",
    title: "Second Template",
  }, { displayOrder: 20 });
  await mockApis(page, [firstRow, secondRow]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "First Template" })).toBeVisible();

  await page.locator(".template-card").filter({ hasText: "Second Template" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { name: "Second Template" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Second Template" })).toBeVisible();

  await page.evaluate(() => {
    window.localStorage.removeItem("safetyfirst.staffFormTemplates.selectedFormType");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "First Template" })).toBeVisible();
});

test("custom Toolbox Talk section widths render in preview and worker form", async ({ page }) => {
  const row = template("toolbox_width_smoke", "Toolbox Width Smoke", toolboxHalfWidthSchema);
  await mockApis(page, [row]);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Toolbox Width Smoke" })).toBeVisible();
  await openPreview(page);
  const previewMeeting = page.locator(".template-v3-preview-page .template-section-meeting_info");
  const previewTopics = page.locator(".template-v3-preview-page .template-section-toolbox_topics");
  await expect(previewMeeting).toHaveClass(/template-width-half/);
  await expect(previewTopics).toHaveClass(/template-width-half/);
  await expectSectionsShareRow(previewMeeting, previewTopics);

  await page.goto("/forms/toolbox_width_smoke");
  const workerMeeting = page.locator(".template-section-meeting_info");
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
  await page.addInitScript(() => {
    const fixedNow = new Date("2026-07-03T19:00:00.000Z").valueOf();
    class FixedDate extends Date {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }
      static now() {
        return fixedNow;
      }
    }
    window.Date = FixedDate;
  });
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

test("staff home CSV and XML exports open native file share when available", async ({ page }) => {
  await page.addInitScript(() => {
    const fixedNow = new Date("2026-07-03T19:00:00.000Z").valueOf();
    class FixedDate extends Date {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }
      static now() {
        return fixedNow;
      }
    }
    window.Date = FixedDate;
    window.__staffExportSharePayloads = [];
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (payload) => Boolean(payload?.files?.length),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__staffExportSharePayloads.push({
          files: (payload.files || []).map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          title: payload.title,
        });
      },
    });
  });
  await mockApis(page, [], {
    workerSignIns: [
      {
        id: "worker-signin-share-1",
        name: "Garnet Bird",
        phone: "6045550100",
        trade: "Supervisor",
        company: "Appia",
        signed_in_at: "2026-07-03T16:00:00.000Z",
        signed_out_at: null,
        sign_in_date_vancouver: "2026-07-03",
        sign_out_date_vancouver: null,
      },
    ],
  });

  await page.goto("/staff/home");
  await page.getByRole("button", { name: "CSV" }).click();
  await expect.poll(() => page.evaluate(() => window.__staffExportSharePayloads.length)).toBe(1);
  await page.getByRole("button", { name: "XML" }).click();
  await expect.poll(() => page.evaluate(() => window.__staffExportSharePayloads.length)).toBe(2);

  const shares = await page.evaluate(() => window.__staffExportSharePayloads);
  expect(shares[0].title).toBe("Worker sign-ins 2026-07-03.csv");
  expect(shares[0].files[0].name).toBe("worker-sign-ins-2026-07-03.csv");
  expect(shares[0].files[0].type).toContain("text/csv");
  expect(shares[0].files[0].size).toBeGreaterThan(0);
  expect(shares[1].title).toBe("Worker sign-ins 2026-07-03.xml");
  expect(shares[1].files[0].name).toBe("worker-sign-ins-2026-07-03.xml");
  expect(shares[1].files[0].type).toContain("application/xml");
  expect(shares[1].files[0].size).toBeGreaterThan(0);
});

test("staff mobile menu nests form destinations under Forms", async ({ page }) => {
  await mockApis(page, []);

  await page.goto("/staff/home");
  await page.locator(".staff-mobile-menu-trigger").click();
  await expect(page.getByRole("menuitem", { exact: true, name: "FORM TEMPLATES" })).toHaveCount(0);
  await page.getByRole("menuitem", { exact: true, name: "FORMS" }).click();

  await expect(page.getByRole("menuitem", { name: "Submitted Forms" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Fill A Form" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Form Templates / QR Codes" })).toBeVisible();

  await page.getByRole("menuitem", { name: "Fill A Form" }).click();
  await expect(page).toHaveURL(/\/staff\/forms-to-fill-out$/);
  await expect(page.locator(".staff-mobile-menu-trigger")).toContainText("FORMS");
  await expect(page.getByRole("heading", { name: "Submit a Safety Form" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test("submitted form company filter uses submitted company dropdown", async ({ page }) => {
  const alphaSubmission = toolboxSubmissionRow({
    company: "Alpha Concrete",
    id: "alpha-company-submission",
    projectName: "Alpha Project",
  });
  const zetaSubmission = toolboxSubmissionRow({
    company: "Zeta Mechanical",
    id: "zeta-company-submission",
    projectName: "Zeta Project",
  });
  const anotherAlpha = fileSubmissionRow({
    company: "Alpha Concrete",
    id: "alpha-file-submission",
  });
  await mockApis(page, [], { staffSubmissions: [zetaSubmission, alphaSubmission, anotherAlpha] });

  await page.goto("/staff/forms");
  await page.getByLabel("Show filters").click();
  const companyFilter = page.locator("#staff-form-filters label").filter({ hasText: /^Company/ }).locator("select");
  await expect(companyFilter).toBeVisible();
  await expect(companyFilter.locator("option")).toHaveText([
    "All",
    "Alpha Concrete",
    "Zeta Mechanical",
  ]);

  await companyFilter.selectOption("Alpha Concrete");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator(".staff-table-heading-main strong")).toHaveText("2 form submissions");
  await expect(page.getByRole("row", { name: /Alpha Concrete/ })).toHaveCount(2);
  await expect(page.getByRole("row", { name: /Zeta Mechanical/ })).toHaveCount(0);
  await expect(companyFilter.locator("option")).toHaveText([
    "All",
    "Alpha Concrete",
    "Zeta Mechanical",
  ]);
});

test("submitted forms open in a routed viewer, sign off, export, email, and print", async ({ page }) => {
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
  const editableSubmission = templateSubmissionRow({
    id: "editable-template-submission",
  });
  const mockState = await mockApis(
    page,
    [
      template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, { displayOrder: 1 }),
      template("toolbox_talk_copy_2", "Toolbox Talk Copy 2", toolboxSignatureSchema, {
        displayOrder: 2,
      }),
    ],
    { staffSubmissions: [editableSubmission, fileSubmission, customSubmission, standardSubmission] },
  );
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/staff/forms");
  await expect(page.getByText("4 form submissions")).toBeVisible();

  const viewerCases = [
    { company: "EditCo", edit: true, expectedText: "Original Project", id: editableSubmission.id },
    { company: "Birding Scopes", expectedText: "Dinner-Photo-3.png", id: fileSubmission.id },
    { company: "CustomCo", expectedText: "Custom Toolbox Project", id: customSubmission.id, sign: true },
    { company: "StandardCo", expectedText: "Standard Toolbox Project", id: standardSubmission.id },
  ];

  for (const { company, edit, expectedText, id, sign } of viewerCases) {
    await page.goto("/staff/forms");
    await page.getByRole("row", { name: new RegExp(company) }).getByText(company, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/staff/forms/${id}$`));
    await expect(page.locator(".submitted-viewer-toolbar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review", exact: true })).toBeVisible();
    if (edit) {
      await expect(page.getByRole("button", { name: "Edit" })).toBeEnabled();
    } else {
      await expect(page.getByRole("button", { name: "Edit" })).toBeDisabled();
    }
    await expect(page.getByRole("button", { name: "Translate" })).toBeEnabled();
    await expect(page.getByText(expectedText, { exact: true })).toBeVisible();
    if (id === fileSubmission.id) {
      await expect(page.locator(".submitted-file-package")).toBeVisible();
      await expect(page.getByText("Submitted file package", { exact: true })).toBeVisible();
      await expect(page.getByText("1 uploaded file", { exact: true })).toBeVisible();
      await expect(page.getByText("Image / 1.0 MB", { exact: true })).toBeVisible();
    }

    if (edit) {
      await page.getByRole("button", { name: "Edit" }).click();
      const editDialog = page.getByRole("dialog", { name: "Edit Submitted Form" });
      await expect(editDialog).toBeVisible();
      await expect(editDialog.getByLabel("Project Name")).toHaveValue("Original Project");
      await editDialog.getByLabel("Project Name").fill("Edited Project");
      await editDialog.getByRole("button", { name: "No" }).click();
      await editDialog.getByRole("button", { name: "Save edits" }).click();
      await expect(editDialog).toHaveCount(0);
      await expect(page.getByText("Edited Project", { exact: true })).toBeVisible();
      await expect(page.getByText("Original Project", { exact: true })).toHaveCount(0);
      await expect(page.locator(".submitted-viewer-status-message")).toHaveText("Form edits saved.");
      const updatedSubmission = mockState.staffSubmissions.find((item) => item.id === id);
      expect(updatedSubmission.form_data.answers).toMatchObject({
        project_name: "Edited Project",
        approved: "no",
      });
      expect(updatedSubmission.one_drive_backup_status).toBe("pending");
    }

    if (sign) {
      await page.getByRole("button", { name: "Translate" }).click();
      const translateDialog = page.getByRole("dialog", { name: "Translation: Select Output Language" });
      await expect(translateDialog).toBeVisible();
      await expect(
        translateDialog.getByText("Rough phrasebook translation. Unrecognized text stays original."),
      ).toBeVisible();
      await expect(translateDialog.getByLabel("Translate To").locator("option")).toHaveText([
        "Select language",
        "Spanish",
        "French",
        "Hindi",
      ]);
      await expect(translateDialog.getByRole("button", { name: "Translate Form" })).toBeDisabled();
      await translateDialog.getByLabel("Translate To").selectOption("es");
      await translateDialog.getByRole("button", { name: "Translate Form" }).click();
      await expect(translateDialog).toHaveCount(0);
      await expect(page.getByText("Temas discutidos", { exact: true })).toBeVisible();
      await expect(page.getByText("Custom Toolbox Project", { exact: true })).toBeVisible();
      await expect(page.locator(".submitted-viewer-status-message")).toHaveText("Translated to Spanish.");
      expect(mockState.translateApiCalls).toEqual([]);
      await page.getByRole("button", { name: "Show original" }).click();
      await expect(page.getByText("Topics Discussed", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Review", exact: true }).click();
      const signDialog = page.getByRole("dialog", { name: "Review & Sign Form" });
      await expect(signDialog).toBeVisible();
      await expect(signDialog.getByText("No staff sign-off recorded yet.")).toBeVisible();
      await drawSignatureOnCanvas(page, signDialog.locator("canvas"));
      await signDialog.getByLabel("Comments").fill("Looks complete.");
      await signDialog.getByRole("button", { name: "Sign", exact: true }).click();
      await expect(signDialog).toHaveCount(0);
      await expect(page.getByText("Looks complete.")).toBeVisible();
      await expect(page.locator(".submitted-viewer-status")).toHaveText("Reviewed");

      await page.getByRole("button", { name: "More submitted form actions" }).click();
      await page.getByRole("menuitem", { name: "Sign" }).click();
      const signDialogFromMenu = page.getByRole("dialog", { name: "Review & Sign Form" });
      await expect(signDialogFromMenu).toBeVisible();
      await expect(signDialogFromMenu.getByText("Looks complete.")).toBeVisible();
      await signDialogFromMenu.getByRole("button", { name: "Cancel" }).click();
    }

    await page.getByRole("button", { name: "Download" }).click();
    await expectNonEmptyDownload(page, "PDF", "pdf");
    await expect(page.getByText("PDF saved.")).toBeVisible();
    expect(mockState.pdfRequests.at(-1)).toMatchObject({ submissionId: id });

    await page.getByRole("button", { name: "Download" }).click();
    await expectNonEmptyDownload(page, "PNG", "png");
    await expect(page.getByText("PNG saved.")).toBeVisible();

    await page.getByRole("button", { name: "More submitted form actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Email" })).toBeEnabled();
    await page.getByRole("menuitem", { name: "Email" }).click();
    await expect(page.getByText(`PDF emailed to ${staff.email}.`)).toBeVisible();
    const emailRequest = mockState.emailRequests.at(-1);
    expect(emailRequest).toMatchObject({
      recipientEmail: staff.email,
      submissionId: id,
    });
    expect(emailRequest.fileName).toMatch(/\.pdf$/);
    expect(emailRequest.pdfDataUrl).toBeUndefined();

    const popupPromise = page
      .waitForEvent("popup", { timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    await page.getByRole("button", { name: "More submitted form actions" }).click();
    await page.getByRole("menuitem", { name: "Print" }).click();
    await expect(page.getByText("Print dialog opened.")).toBeVisible();
    expect(await popupPromise).toBe(false);
  }

  expect(pageErrors).toEqual([]);
});

test("submitted form viewer fits the mobile viewport", async ({ page }) => {
  const mobileSubmission = templateSubmissionRow({
    id: "mobile-fall-protection-submission",
    formType: "fall_protection_form",
    company: "GarnoCo",
    workerName: "Garnet Bird",
    schemaSnapshot: fallProtectionSchema,
    answers: {
      fall_inspection_date: "2026-07-05",
      fall_worker_name: "Garnet Bird",
      fall_equipment_inspected: "Full Body Harness",
      fall_equipment_input_method: "Manually",
      fall_equipment_make: "Guardian",
      fall_equipment_model: "Harness X",
      fall_equipment_serial: "FP-1234567890-LONG",
      fall_equipment_mfg_date: "2026-01",
      fall_inspector_name: "Garnet Bird",
    },
  });
  await mockApis(
    page,
    [template("fall_protection_form", "Fall Protection Form", fallProtectionSchema)],
    { staffSubmissions: [mobileSubmission] },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/staff/forms/${mobileSubmission.id}`);
  await expect(page.locator(".submitted-viewer-toolbar")).toBeVisible();
  await expect(page.locator(".submitted-form-document").getByRole("heading", { name: "Fall Protection Form" })).toBeVisible();
  await expect(page.locator(".submitted-form-document").getByText("Garnet Bird / GarnoCo", { exact: true })).toBeVisible();

  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  ).toBe(true);

  const viewportWidth = page.viewportSize().width;
  for (const selector of [".submitted-viewer-toolbar", ".submitted-viewer-stage", ".submitted-form-document"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
  }

  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: "test-results/submitted-form-viewer-mobile.png",
  });
});

test("submitted form PNG export opens native image share when available", async ({ page }) => {
  await page.addInitScript(() => {
    window.__formPngSharePayload = null;
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (payload) => Boolean(payload?.files?.length),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__formPngSharePayload = {
          files: (payload.files || []).map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          title: payload.title,
        };
      },
    });
  });
  const row = templateSubmissionRow({
    id: "png-share-submission",
    company: "GarnoCo",
    workerName: "Garnet Bird",
  });
  await mockApis(page, [], { staffSubmissions: [row] });

  await page.goto(`/staff/forms/${row.id}`);
  await page.getByRole("button", { name: "Download" }).click();
  await page.getByRole("menuitem", { name: "PNG" }).click();

  await expect.poll(() => page.evaluate(() => window.__formPngSharePayload)).toMatchObject({
    files: [
      {
        name: "garnoco-editable-safety-form-2026-07-03.png",
        type: "image/png",
      },
    ],
  });
  const sharedSize = await page.evaluate(() => window.__formPngSharePayload?.files?.[0]?.size || 0);
  expect(sharedSize).toBeGreaterThan(0);
});

test("submitted form edit dialog owns mobile scroll", async ({ page }) => {
  const mobileSubmission = templateSubmissionRow({
    id: "mobile-edit-scroll-submission",
    formType: "fall_protection_form",
    company: "GarnoCo",
    workerName: "Garnet Bird",
    schemaSnapshot: fallProtectionSchema,
    answers: {
      fall_inspection_date: "2026-07-05",
      fall_worker_name: "Garnet Bird",
      fall_equipment_inspected: "Lanyard",
      fall_equipment_input_method: "Select Safety First Asset",
      fall_selected_asset_name: "Garnet - Lanyard",
      fall_selected_asset_serial: "FP-LONG-SERIAL-1234567890",
      fall_inspector_name: "Garnet Bird",
    },
  });
  await mockApis(
    page,
    [template("fall_protection_form", "Fall Protection Form", fallProtectionSchema)],
    { staffSubmissions: [mobileSubmission] },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/staff/forms/${mobileSubmission.id}`);
  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Submitted Form" });
  await expect(editDialog).toBeVisible();
  await expect(page.locator(".submitted-edit-form")).toBeVisible();

  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");
  await page.locator(".submitted-edit-form").hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.locator(".submitted-edit-form").evaluate((element) => element.scrollTop > 0)).toBe(true);

  await editDialog.getByRole("button", { name: "Close" }).click();
  await expect(editDialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
});

test("worker submission review shows PDF PNG and Print actions at the top", async ({ page }) => {
  const workerSubmission = templateSubmissionRow({
    id: "worker-review-submission",
    company: worker.company,
    workerName: worker.name,
  });
  workerSubmission.worker_id = worker.id;
  const mockState = await mockApis(page, [], { workerSubmissions: [workerSubmission] });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/my-submissions/${workerSubmission.id}`);
  await expect(page.getByRole("button", { name: "PDF", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "PNG", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print", exact: true })).toBeVisible();

  const childClasses = await page.locator(".worker-submission-detail").evaluate((element) =>
    Array.from(element.children).map((child) => child.className),
  );
  expect(childClasses[0]).toContain("worker-submission-export-actions");
  expect(childClasses[1]).toContain("worker-submission-export-surface");
  await expect(page.locator(".worker-submission-export-surface .digital-form-actions")).toHaveCount(0);

  await expectNonEmptyDownload(page, "PDF", "pdf");
  expect(mockState.pdfRequests.at(-1)).toMatchObject({
    scope: "worker",
    submissionId: workerSubmission.id,
  });
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
  await expect(newFieldDialog.getByRole("button", { name: /Asset picker/ })).toBeVisible();
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
    "Asset picker",
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
  expect(submissions[0].formData.answers.asset_optional).toBe(null);
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

test("asset import UI and asset picker field use local Safety First assets", async ({ page }) => {
  const row = template("asset_picker_smoke", "Asset Picker Smoke", assetPickerSchema);
  const submissions = await mockApis(page, [row], {
    assets: [
      {
        ...defaultAssetRows[0],
        name: "17' Mastercraft Telescopic Ladder",
        assetType: "Ladders/Scaffolds/Stairs",
        serialNumber: "FP-001",
        currentSite: "Appia Yard",
      },
    ],
  });

  await page.goto("/staff/assets");
  await expect(page.getByRole("heading", { name: "Import assets" })).toHaveCount(0);
  await expect(page.getByText("17' Mastercraft Telescopic Ladder")).toBeVisible();
  const longAssetRow = page.getByRole("row", { name: /17' Mastercraft Telescopic Ladder/ });
  const longAssetCells = longAssetRow.locator("td");
  const longNameBox = await longAssetRow.getByRole("button", { name: /17' Mastercraft Telescopic Ladder/ }).boundingBox();
  const nameCellBox = await longAssetCells.nth(0).boundingBox();
  const typeCellBox = await longAssetCells.nth(1).boundingBox();
  expect(longNameBox).not.toBeNull();
  expect(nameCellBox).not.toBeNull();
  expect(typeCellBox).not.toBeNull();
  expect(longNameBox.x).toBeGreaterThanOrEqual(nameCellBox.x - 1);
  expect(longNameBox.x + longNameBox.width).toBeLessThanOrEqual(typeCellBox.x + 1);
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  ).toBe(true);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Import assets" })).toBeVisible();
  await page.getByLabel("Import data").fill(JSON.stringify([
    {
      Name: "Harness 2",
      Type: "Fall Protection",
      Serial: "FP-002",
      "Current Site": "North Tower",
      Status: "Active",
    },
  ]));
  await page.getByRole("button", { name: "Import assets" }).click();
  await expect(page.getByText("Imported 1 new assets and updated 0.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Import assets" })).toHaveCount(0);
  await expect(page.getByText("Harness 2")).toBeVisible();

  await page.goto("/staff/form-templates");
  await openPreview(page);
  await expect(page.getByText("Fall protection asset", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select asset" })).toBeVisible();
  await page.getByRole("button", { name: "Select asset" }).click();
  let pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await expect(pickerDialog.getByText("Type: Fall Protection")).toBeVisible();
  await pickerDialog.getByRole("button", { name: "Close" }).click();

  await page.goto("/forms/asset_picker_smoke");
  await page.getByRole("button", { name: "Submit Asset Picker Smoke" }).click();
  await expect(page.getByText("Fall protection asset is required.")).toBeVisible();
  await page.getByRole("button", { name: "Select asset" }).click();
  pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await pickerDialog.getByLabel("Search assets").fill("FP-002");
  await pickerDialog.getByRole("button", { name: /Harness 2/ }).click();
  await expect(page.getByRole("dialog", { name: "Choose asset" })).toHaveCount(0);
  await expect(page.locator(".template-asset-selected-card")).toContainText("Serial/VIN: FP-002");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".template-asset-selected-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Select asset" }).click();
  pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await pickerDialog.getByLabel("Search assets").fill("FP-002");
  await pickerDialog.getByRole("button", { name: /Harness 2/ }).click();
  await page.getByRole("button", { name: "Submit Asset Picker Smoke" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.selected_asset).toEqual(expect.objectContaining({
    assetId: expect.any(String),
    name: "Harness 2",
    assetType: "Fall Protection",
    serialNumber: "FP-002",
    currentSite: "North Tower",
    status: "active",
  }));
});

test("staff assets support create, detail pages, log book, maintenance, and picker archive filtering", async ({ page }) => {
  const row = template("asset_picker_smoke", "Asset Picker Smoke", assetPickerSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/staff/assets");
  await expect(page.getByText("Justin - Lanyard")).toBeVisible();
  await expect(page.getByRole("cell", { name: "SOLO 4: Aerius" })).toBeVisible();

  await page.getByRole("button", { name: "Create Asset" }).click();
  const assetDialog = page.locator(".asset-edit-dialog");
  await expect(assetDialog.getByRole("heading", { name: "Create Asset" })).toBeVisible();
  await assetDialog.getByLabel("Type").fill("Fall Protection");
  await assetDialog.getByLabel("Name").fill("Created Rescue Harness");
  await assetDialog.getByLabel("VIN / Serial").fill("CRH-1");
  await assetDialog.getByLabel("Model").fill("Rescue-42");
  await assetDialog.getByLabel("Year").fill("2026");
  await assetDialog.getByLabel("Hours").fill("12");
  await assetDialog.getByLabel("Kms/Miles").fill("N/A");
  await assetDialog.getByLabel("Current Site").fill("SOLO 4: Aerius");
  await assetDialog.getByLabel("Description").fill("Created locally during smoke coverage.");
  await assetDialog.getByRole("button", { name: "Create asset" }).click();
  await expect(page.getByText("Created Created Rescue Harness.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Created Rescue Harness" })).toBeVisible();

  await page
    .getByRole("row", { name: /Created Rescue Harness/ })
    .getByRole("cell", { name: "Fall Protection" })
    .click();
  await expect(page.getByRole("heading", { name: "Created Rescue Harness" })).toBeVisible();
  await expect(page.getByText("Rescue-42")).toBeVisible();
  const tabs = page.locator(".asset-tabs-panel");
  await expect(tabs.getByRole("tab", { name: "Log Book" })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: "Maintenance" })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: "Forms" })).toHaveCount(0);
  await expect(tabs.getByRole("tab", { name: "Reminders" })).toHaveCount(0);
  await expect(tabs.getByRole("tab", { name: "Documents" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add Log Entry" }).click();
  let entryDialog = page.locator(".asset-entry-dialog");
  await entryDialog.getByLabel("Site").fill("SOLO 4: Aerius");
  await entryDialog.getByLabel("Hours").fill("13");
  await entryDialog.getByLabel("Notes").fill("Inspection Completed: PASS LB");
  await entryDialog.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByText("Log entry added.")).toBeVisible();
  await expect(page.getByText("Inspection Completed: PASS LB")).toBeVisible();

  await tabs.getByRole("tab", { name: "Maintenance" }).click();
  await expect(page.getByText("No maintenance entries yet.")).toBeVisible();
  await page.getByRole("button", { name: "Add Maintenance Entry" }).click();
  entryDialog = page.locator(".asset-entry-dialog");
  await entryDialog.getByLabel("Performed by").fill("Leanne Bird");
  await entryDialog.getByLabel("Notes").fill("Replaced lanyard label sleeve.");
  await entryDialog.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByText("Maintenance entry added.")).toBeVisible();
  await expect(page.getByText("Replaced lanyard label sleeve.")).toBeVisible();
  await expect(page.getByText("Leanne Bird")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page).toHaveURL(/\/staff\/assets$/);
  await expect(page.getByText("Created Rescue Harness")).toHaveCount(0);

  await page.goto("/forms/asset_picker_smoke");
  await page.getByRole("button", { name: "Select asset" }).click();
  const pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await pickerDialog.getByLabel("Search assets").fill("Created Rescue Harness");
  await expect(pickerDialog.getByRole("button", { name: /Created Rescue Harness/ })).toHaveCount(0);
  await pickerDialog.getByLabel("Search assets").fill("Justin");
  await pickerDialog.getByRole("button", { name: /Justin - Lanyard/ }).click();
  await expect(page.locator(".template-asset-selected-card")).toContainText("Model: SP 1101L3");
  await page.getByRole("button", { name: "Submit Asset Picker Smoke" }).click();
  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.selected_asset).toEqual(expect.objectContaining({
    name: "Justin - Lanyard",
    model: "SP 1101L3",
    kmsMiles: "N/A",
    currentSite: "SOLO 4: Aerius",
  }));
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
  await expect(selectedBlock.getByLabel("Default answer")).toHaveValue("Northeast corner of site");

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

test("imported Salus templates keep major sections full-width while preserving field widths", async () => {
  for (const schema of importedSalusSchemas) {
    const sectionWidths = (schema.sections || []).map((section) => [
      section.id,
      section.settings?.layout?.width || "full",
    ]);
    for (const [sectionId, width] of sectionWidths) {
      expect(width, `${schema.formType}.${sectionId}`).toBe("full");
    }

    const fieldWidths = (schema.sections || [])
      .flatMap((section) => section.fields || [])
      .map((field) => field.settings?.layout?.width)
      .filter(Boolean);
    expect(fieldWidths, `${schema.formType} field widths`).toEqual(expect.arrayContaining(["half"]));
  }
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
  await expect(preview.locator(".template-section-new_worker_orientation")).toHaveClass(/template-width-full/);
  await expect(preview.locator(".template-section-1_site_safety_and_emergency_procedures")).toHaveClass(/template-width-full/);
  await expect(preview.getByRole("heading", { name: "NEW WORKER ORIENTATION", exact: true })).toBeVisible();
  await expect(preview.getByLabel("Worker Name")).toBeVisible();
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
  const inputMethod = preview
    .locator(".template-radio-choice-field")
    .filter({ hasText: "How will you input Make/Model/Serial # information?" });
  await expect(inputMethod.getByRole("radio", { name: "Photo" })).toHaveCount(0);
  await expect(preview.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toHaveCount(0);
  await inputMethod.getByRole("radio", { name: "Manually" }).click();
  await expect(preview.getByLabel("Make", { exact: true })).toBeVisible();
  await expect(preview.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toBeVisible();
  await inputMethod.getByRole("radio", { name: "Select Safety First Asset" }).click();
  await expect(preview.getByLabel("Make", { exact: true })).toHaveCount(0);
  await expect(preview.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toHaveCount(0);
  await expect(preview.getByRole("button", { name: "Select asset" })).toBeVisible();
  await preview.getByRole("button", { name: "Select asset" }).click();
  let pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await expect(pickerDialog.getByLabel("Search assets")).toBeVisible();
  await pickerDialog.getByRole("button", { name: "Close" }).click();
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

  const inputMethod = page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "How will you input Make/Model/Serial # information?" });
  await expect(inputMethod.getByRole("radio", { name: "Photo" })).toHaveCount(0);
  await expect(page.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toHaveCount(0);
  await inputMethod.getByRole("radio", { name: "Select Safety First Asset" }).click();
  await expect(page.getByLabel("Make", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select asset" })).toBeVisible();
  await page.getByRole("button", { name: "Select asset" }).click();
  const pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await expect(pickerDialog.getByLabel("Search assets")).toBeVisible();
  await pickerDialog.getByRole("button", { name: "Close" }).click();
  await inputMethod.getByRole("radio", { name: "Manually" }).click();
  await expect(page.getByLabel("Make", { exact: true })).toBeVisible();
  await expect(page.getByText("Add images of Make/Model/Serial #/Mfg date instead of typing above")).toBeVisible();
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

test("Fall Protection Form asset picker opens a compact mobile drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const row = template("fall_protection_form", "Fall Protection Form", fallProtectionSchema);
  const assetNames = ["Brandon", "Gabriel", "Gustavo", "Guy", "Leanne", "Matti", "Nagam", "Troiy"];
  const assets = assetNames.flatMap((name, index) => ([
    {
      ...defaultAssetRows[0],
      id: `fall-mobile-harness-${index}`,
      name: `${name} - Harness`,
      serialNumber: `0291750-${index}-LONG-SERIAL-FALL-PROTECTION`,
      currentSite: index % 2 ? "SOLO 4: Aerius" : "Downtown East",
    },
    {
      ...defaultAssetRows[0],
      id: `fall-mobile-lanyard-${index}`,
      name: `${name} - Lanyard`,
      serialNumber: `15.09.21-${index}-LONG-SERIAL-FALL-PROTECTION`,
      currentSite: index % 2 ? "SOLO 4: Aerius" : "Downtown East",
    },
  ]));
  await mockApis(page, [row], { assets });

  await page.goto("/forms/fall_protection_form");
  const inputMethod = page
    .locator(".template-radio-choice-field")
    .filter({ hasText: "How will you input Make/Model/Serial # information?" });
  await inputMethod.getByRole("radio", { name: "Select Safety First Asset" }).click();
  await expect(page.getByRole("button", { name: "Select asset" })).toBeVisible();
  await expect(page.locator(".template-asset-result")).toHaveCount(0);

  await page.getByRole("button", { name: "Select asset" }).click();
  const pickerDialog = page.getByRole("dialog", { name: "Choose asset" });
  await expect(pickerDialog.getByLabel("Search assets")).toBeVisible();
  await expect(pickerDialog.getByText("Type: Fall Protection")).toBeVisible();
  await expect(pickerDialog.getByRole("button", { name: /Brandon - Harness/ })).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: "test-results/fall-protection-asset-picker-mobile.png",
  });
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

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Safety Concerns Raised" })
    .filter({ hasText: "Action item rows" })
    .getByRole("button")
    .first()
    .click();
  const selectedBlock = page.locator(".template-v3-selected-block-card");
  await expect(selectedBlock.getByLabel("Conditional visibility")).toBeChecked();
  const visibilitySelects = selectedBlock.locator(".template-conditional-settings select");
  await expect(visibilitySelects.nth(0)).toHaveValue("daily_safety_concerns_today");
  await expect(visibilitySelects.nth(1)).toHaveValue("equals");
  await expect(visibilitySelects.nth(2)).toHaveValue("Yes");

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
  await expect(preview.getByText("No safety concerns raised today.")).toHaveCount(0);
  const previewSafetyConcernGroup = preview.getByRole("radiogroup", {
    name: "Are there any safety concerns raised by workers or supervisors today?",
  });
  await previewSafetyConcernGroup.getByRole("radio", { name: "No" }).click();
  await expect(preview.getByText("No safety concerns raised today.")).toHaveCount(0);
  await previewSafetyConcernGroup.getByRole("radio", { name: "Yes" }).click();
  await expect(preview.getByText("No safety concerns raised today.")).toBeVisible();
  await expect(preview.getByText("Safety concern 1")).toBeVisible();
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
  await expect(page.getByText("No safety concerns raised today.")).toHaveCount(0);
  await expect(page.getByText("Safety concern 1")).toHaveCount(0);
  const safetyConcernGroup = page.getByRole("radiogroup", {
    name: "Are there any safety concerns raised by workers or supervisors today?",
  });
  await safetyConcernGroup.getByRole("radio", { name: "No" }).click();
  await expect(page.getByText("No safety concerns raised today.")).toHaveCount(0);
  await expect(page.getByText("Safety concern 1")).toHaveCount(0);
  await safetyConcernGroup.getByRole("radio", { name: "Yes" }).click();
  await expect(page.getByText("No safety concerns raised today.")).toBeVisible();
  await expect(page.getByText("Safety concern 1")).toBeVisible();
  await expect(page.getByLabel("Referred To")).toBeVisible();
  await expect(page.getByLabel("Safety Concern Raised")).toBeVisible();
  await safetyConcernGroup.getByRole("radio", { name: "No" }).click();
  await expect(page.getByText("Safety concern 1")).toHaveCount(0);
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

  await page.getByRole("button", { name: "Submit Daily Safety Inspection" }).click();
  await expect(page.getByText("Inspector Signatures is required.")).toBeVisible();
  await expect(page.locator(".template-section-daily_signatures")).toHaveClass(/toolbox-section-invalid/);
});

test("Daily Safety Inspection omits hidden safety concern rows from submitted payload", async ({ page }) => {
  const row = template("daily_safety_inspection", "Daily Safety Inspection", dailySafetyInspectionSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/daily_safety_inspection");
  await page
    .getByRole("radiogroup", { name: "Are there any safety concerns raised by workers or supervisors today?" })
    .getByRole("radio", { name: "No" })
    .click();
  await drawSignatureOnCanvas(page, page.locator(".template-section-daily_signatures .template-signature-canvas").nth(0));
  await drawSignatureOnCanvas(page, page.locator(".template-section-daily_signatures .template-signature-canvas").nth(1));
  await page.getByRole("button", { name: "Submit Daily Safety Inspection" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.daily_safety_concerns_today).toBe("No");
  expect(submissions[0].formData.answers.daily_safety_concern_notes).toBeUndefined();
  expect(submissions[0].formData.actionItemBlocks.daily_safety_concern_rows).toBeUndefined();
});

test("Daily Safety Inspection includes safety concern rows when answered Yes", async ({ page }) => {
  const row = template("daily_safety_inspection", "Daily Safety Inspection", dailySafetyInspectionSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/daily_safety_inspection");
  await page
    .getByRole("radiogroup", { name: "Are there any safety concerns raised by workers or supervisors today?" })
    .getByRole("radio", { name: "Yes" })
    .click();
  await page.getByLabel("Referred To").fill("Site supervisor");
  await page.getByLabel("Safety Concern Raised").fill("Loose temporary railing near the west stair.");
  await page.getByLabel("Corrective Action").fill("Secure railing before work continues.");
  await page.getByLabel("Notes", { exact: true }).fill("Raised during morning inspection.");
  await drawSignatureOnCanvas(page, page.locator(".template-section-daily_signatures .template-signature-canvas").nth(0));
  await drawSignatureOnCanvas(page, page.locator(".template-section-daily_signatures .template-signature-canvas").nth(1));
  await page.getByRole("button", { name: "Submit Daily Safety Inspection" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.daily_safety_concerns_today).toBe("Yes");
  expect(submissions[0].formData.answers.daily_safety_concern_notes).toBe("Raised during morning inspection.");
  expect(submissions[0].formData.actionItemBlocks.daily_safety_concern_rows).toEqual({
    noItems: false,
    rows: [
      expect.objectContaining({
        suggestedAssignee: "Site supervisor",
        description: "Loose temporary railing near the west stair.",
        recommendedAction: "Secure railing before work continues.",
      }),
    ],
  });
});

test("Daily Washroom Inspection migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "daily_washroom_inspection",
    "Daily Washroom Inspection",
    dailyWashroomInspectionSchema,
    { displayOrder: 100 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Daily Washroom Inspection" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Daily Washroom Inspection" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Flushables 1-2-3 - AT GATE 1 (HOIST)" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card")).toContainText("Radio buttons");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Daily Washroom Inspection" }).first()).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Bathroom Inspection" })).toBeVisible();
  await expect(preview.getByText("Person(s) Inspecting")).toBeVisible();
  await expect(preview.getByText("Flushables 4-5 - NORTH GL (WHITE UNITS)")).toBeVisible();
  await expect(preview.getByText("Chemical 1-2-3-4-5 - NORTH EAST GROUND LEVEL")).toBeVisible();
  await expect(preview.getByText("Chemical 6-7-8-9-10-11-12 - IN TOWER")).toBeVisible();
  await expect(preview.locator(".template-field-daily_washroom_flushables_1_2_3_status").getByRole("radio", { name: "Pass" })).toBeVisible();
  await expect(preview.getByText("Flushables 1-2-3: Describe Issues")).toBeVisible();
});

test("Daily Washroom Inspection worker form submits status and issue details", async ({ page }) => {
  const row = template("daily_washroom_inspection", "Daily Washroom Inspection", dailyWashroomInspectionSchema);
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/daily_washroom_inspection");
  await expect(page.getByRole("heading", { name: "Daily Washroom Inspection" })).toBeVisible();
  await page
    .locator(".template-field-daily_washroom_flushables_1_2_3_status")
    .getByRole("radio", { name: "Fail" })
    .click();
  await page.getByLabel("Flushables 1-2-3: Describe Issues").fill("Flush handle is loose.");
  await page
    .locator(".template-field-daily_washroom_chemical_1_5_status")
    .getByRole("radio", { name: "Serviced by Safety" })
    .click();
  await page.getByLabel("Additional Notes").fill("Restocked paper and checked tower units.");
  await page.getByRole("button", { name: "Submit Daily Washroom Inspection" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.daily_washroom_persons_inspecting).toBe(worker.name);
  expect(submissions[0].formData.answers.daily_washroom_flushables_1_2_3_status).toBe("Fail");
  expect(submissions[0].formData.answers.daily_washroom_flushables_1_2_3_issues).toBe("Flush handle is loose.");
  expect(submissions[0].formData.answers.daily_washroom_chemical_1_5_status).toBe("Serviced by Safety");
  expect(submissions[0].formData.answers.daily_washroom_additional_notes).toBe("Restocked paper and checked tower units.");
});

test("Skid Steer Loader Pre-use Inspection migration opens as a hidden editable draft", async ({ page }) => {
  const row = draftTemplate(
    "skid_steer_loader_pre_use_inspection",
    "Skid Steer Loader Pre-use Inspection",
    skidSteerLoaderPreUseInspectionSchema,
    { displayOrder: 110 },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(
    page.getByRole("heading", { name: "Pre-use Inspection Checklist for Skid Steer Loader" }),
  ).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Skid Steer Loader Pre-use Inspection" });
  await expect(templateCard).toContainText("Draft ready");
  await expect(templateCard).toContainText("Hidden from workers");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Before starting engine, check the following:" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card").getByLabel("Display style")).toHaveValue("checklist");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(
    preview.getByRole("heading", { name: "Pre-use Inspection Checklist for Skid Steer Loader" }).first(),
  ).toBeVisible();
  await expect(preview.getByText("Visual Inspection")).toBeVisible();
  await expect(preview.getByText("Engine (check oil levels, look for leaks)")).toBeVisible();
  await expect(preview.getByText("Operating near a leading edge?")).toBeVisible();
  await expect(preview.getByText("Operator Information")).toBeVisible();
  await expect(preview.getByLabel("Operator Name")).toBeVisible();
});

test("Skid Steer Loader Pre-use Inspection worker form submits checklist and operator details", async ({ page }) => {
  const row = template(
    "skid_steer_loader_pre_use_inspection",
    "Skid Steer Loader Pre-use Inspection",
    skidSteerLoaderPreUseInspectionSchema,
  );
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/skid_steer_loader_pre_use_inspection");
  await expect(page.getByRole("heading", { name: "Pre-use Inspection Checklist for Skid Steer Loader" })).toBeVisible();
  await page
    .locator(".template-field-skid_steer_before_start_checks")
    .getByLabel("Engine (check oil levels, look for leaks)")
    .check();
  await page
    .locator(".template-field-skid_steer_before_start_checks")
    .getByLabel("Fuel tank (drain off moisture or sediment)")
    .check();
  await page
    .locator(".template-field-skid_steer_operating_near_leading_edge")
    .getByRole("radio", { name: "No" })
    .click();
  await page.getByLabel("Remarks").first().fill("No leaks observed.");
  await page.getByLabel("Vehicle #").fill("SS-14");
  await page.getByLabel("Hour Meter Reading").fill("247.5");
  await page.getByRole("button", { name: "Submit Pre-use Inspection Checklist for Skid Steer Loader" }).click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.skid_steer_before_start_checks).toEqual([
    "Engine (check oil levels, look for leaks)",
    "Fuel tank (drain off moisture or sediment)",
  ]);
  expect(submissions[0].formData.answers.skid_steer_operating_near_leading_edge).toBe("No");
  expect(submissions[0].formData.answers.skid_steer_visual_remarks).toBe("No leaks observed.");
  expect(submissions[0].formData.answers.skid_steer_vehicle_number).toBe("SS-14");
  expect(submissions[0].formData.answers.skid_steer_hour_meter_reading).toBe("247.5");
});

test("Weekly Sub-Trade Site Inspection migration opens as a published visible editable template", async ({ page }) => {
  const row = template(
    "weekly_sub_trade_site_inspection",
    "Weekly Sub-Trade Site Inspection",
    weeklySubTradeSiteInspectionSchema,
    { created_by_staff_id: null, displayOrder: 120, updated_by_staff_id: null },
  );
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Weekly Sub-Trade Site Inspection" })).toBeVisible();
  const templateCard = page.locator(".template-card").filter({ hasText: "Weekly Sub-Trade Site Inspection" });
  await expect(templateCard).toContainText("Shown to workers");
  await expect(page.locator(".template-editor-heading")).toContainText("Published v7");
  await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible();

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Will you team be doing any of the following critical tasks next week?" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card").getByLabel("Display style")).toHaveValue("checklist");

  await page
    .locator(".template-v3-field-card")
    .filter({ hasText: "Project work areas are clean, orderly, and free of excess trash and debris" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".template-v3-selected-block-card").getByLabel("Display style")).toHaveValue("radio");

  await openPreview(page);
  const preview = page.locator(".template-v3-preview-page");
  await expect(preview.getByRole("heading", { name: "Weekly Sub-Trade Site Inspection" }).first()).toBeVisible();
  await expect(preview.getByRole("heading", { name: "General Information" }).first()).toBeVisible();
  await expect(preview.getByLabel("Confined Space Entry")).toBeVisible();
  await expect(preview.getByText("Housekeeping and Sanitation")).toBeVisible();
  await expect(preview.getByRole("radio", { name: "Pass" }).first()).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Corrective Actions" }).first()).toBeVisible();
  await expect(preview.getByText("No action items needed.")).toBeVisible();
});

test("Weekly Sub-Trade Site Inspection worker form submits inspection rows and corrective action", async ({ page }) => {
  test.slow();
  const row = template(
    "weekly_sub_trade_site_inspection",
    "Weekly Sub-Trade Site Inspection",
    weeklySubTradeSiteInspectionSchema,
    { created_by_staff_id: null, displayOrder: 120, updated_by_staff_id: null },
  );
  const submissions = await mockApis(page, [row]);

  await page.goto("/forms/weekly_sub_trade_site_inspection");
  await expect(page.getByRole("heading", { name: "Weekly Sub-Trade Site Inspection" })).toBeVisible();
  await page
    .locator(".template-field-weekly_sub_trade_critical_tasks_next_week")
    .getByLabel("Confined Space Entry")
    .check();
  await page
    .locator(".template-field-weekly_sub_trade_critical_tasks_next_week")
    .getByLabel("Hot Work within 50 feet of a fire hazard")
    .check();
  await page
    .locator(".template-field-weekly_sub_trade_work_areas_clean")
    .getByRole("radio", { name: "Pass" })
    .click();
  await page
    .locator(".template-field-weekly_sub_trade_drains_clear")
    .getByRole("radio", { name: "Fail" })
    .click();
  await page
    .locator(".template-field-weekly_sub_trade_pfas_used_properly")
    .getByRole("radio", { name: "N/A" })
    .click();

  const correctiveActions = page.locator(".template-field-weekly_sub_trade_corrective_actions");
  await correctiveActions.getByLabel("Suggested assignee").fill("Sub-trade foreman");
  await correctiveActions.getByLabel("Location / area").fill("Level 2 drain");
  await correctiveActions.getByLabel("Action item / issue").fill("Drain area has sludge and debris.");
  await correctiveActions.getByLabel("Recommended corrective action").fill("Clean drain area before next shift.");
  await page.locator("form.template-worker-form button[type='submit']").click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0].formData.answers.weekly_sub_trade_inspector).toBe(worker.name);
  expect(submissions[0].formData.answers.weekly_sub_trade_trade_name).toBe(worker.company);
  expect(submissions[0].formData.answers.weekly_sub_trade_critical_tasks_next_week).toEqual([
    "Confined Space Entry",
    "Hot Work within 50 feet of a fire hazard",
  ]);
  expect(submissions[0].formData.answers.weekly_sub_trade_work_areas_clean).toBe("Pass");
  expect(submissions[0].formData.answers.weekly_sub_trade_drains_clear).toBe("Fail");
  expect(submissions[0].formData.answers.weekly_sub_trade_pfas_used_properly).toBe("N/A");
  expect(submissions[0].formData.actionItemBlocks.weekly_sub_trade_corrective_actions).toEqual({
    noItems: false,
    rows: [
      expect.objectContaining({
        suggestedAssignee: "Sub-trade foreman",
        location: "Level 2 drain",
        description: "Drain area has sludge and debris.",
        recommendedAction: "Clean drain area before next shift.",
      }),
    ],
  });
});

test("regular staff can edit another editable template and restore saved states", async ({ page }) => {
  const regularStaff = {
    ...staff,
    id: "regular-edit-staff",
    role: "staff",
    username: "regular-edit",
    email: "regular-edit@example.com",
  };
  const editableSchema = {
    schemaVersion: 1,
    formType: "other_staff_editable",
    title: "Other Staff Editable",
    description: "Editable by all staff.",
    sections: [
      {
        id: "main",
        title: "Main",
        description: "",
        fields: [
          {
            id: "original_question",
            type: "short_text",
            label: "Original question",
            required: false,
          },
        ],
      },
    ],
  };
  const row = draftTemplate("other_staff_editable", "Other Staff Editable", editableSchema, {
    created_by_staff_id: "other-staff",
    updated_by_staff_id: "other-staff",
  });
  const mockState = await mockApis(page, [row], { staff: regularStaff });

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Other Staff Editable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);
  await expect(page.locator(".template-v3-template-options-card").getByLabel("Active template")).toBeDisabled();

  await page.locator(".template-v3-field-card").filter({ hasText: "Original question" }).getByRole("button").first().click();
  await page.locator(".template-v3-selected-block-card").getByLabel("Question label").fill("Updated question");
  await page.getByRole("button", { name: "Save draft", exact: true }).first().click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await expect(page.locator(".template-saved-state-select").first()).toContainText("v2 / Draft");
  await expect(page.locator(".template-saved-state-select").first()).toContainText("v1 / Saved");
  expect(mockState.templatePatchRequests).toHaveLength(0);

  await page.locator(".template-editor-heading .template-saved-state-select").selectOption("other_staff_editable-version-1");
  await page.locator(".template-editor-heading").getByRole("button", { name: "Revert", exact: true }).click();
  await expect(page.getByText("Restored version 1 into draft.")).toBeVisible();
  await expect(page.locator(".template-v3-field-card").filter({ hasText: "Original question" })).toBeVisible();
  await expect(page.locator(".template-saved-state-select").first()).toContainText("v3 / Draft");
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
  const orientationSection = page.locator(".template-section-new_worker_orientation");
  const siteSafetySection = page.locator(".template-section-1_site_safety_and_emergency_procedures");
  await expect(orientationSection).toHaveClass(/template-width-full/);
  await expect(siteSafetySection).toHaveClass(/template-width-full/);
  await expect
    .poll(async () => {
      const firstBox = await orientationSection.boundingBox();
      const secondBox = await siteSafetySection.boundingBox();
      if (!firstBox || !secondBox) return false;
      return secondBox.y > firstBox.y + firstBox.height - 4;
    })
    .toBe(true);
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

test("admin can reorder all active form templates", async ({ page }) => {
  const adminStaff = {
    ...staff,
    id: "admin-reorder-staff",
    role: "admin",
    username: "admin-reorder",
    email: "admin-reorder@example.com",
  };
  const protectedDefault = template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, {
    created_by_staff_id: null,
    displayOrder: 10,
    updated_by_staff_id: null,
  });
  const otherOwned = template("other_reorder", "Other Staff Form", {
    ...toolboxSignatureSchema,
    formType: "other_reorder",
    title: "Other Staff Form",
  }, {
    created_by_staff_id: "other-staff",
    displayOrder: 20,
  });
  const mockState = await mockApis(page, [protectedDefault, otherOwned], { staff: adminStaff });

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("button", { name: "Drag Toolbox Talk to reorder forms" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Drag Other Staff Form to reorder forms" })).toBeVisible();

  const firstHandle = page.getByRole("button", { name: "Drag Toolbox Talk to reorder forms" });
  const secondCard = page.locator(".template-card").filter({ hasText: "Other Staff Form" });
  const handleBox = await firstHandle.boundingBox();
  const targetBox = await secondCard.boundingBox();
  expect(handleBox).toBeTruthy();
  expect(targetBox).toBeTruthy();

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.8, { steps: 8 });
  await page.mouse.up();

  await expect.poll(() =>
    mockState.templatePatchRequests
      .filter((request) => request.body.displayOrder !== undefined || request.body.display_order !== undefined)
      .length,
  ).toBe(2);
  expect(mockState.templatePatchRequests.every((request) => request.staffId === adminStaff.id)).toBe(true);
  expect(
    mockState.templatePatchRequests
      .filter((request) => request.body.displayOrder !== undefined)
      .map((request) => [request.formType, request.body.displayOrder]),
  ).toEqual(expect.arrayContaining([
    ["other_reorder", 10],
    ["toolbox_talk", 20],
  ]));
  await expect(page.getByText("Form order saved.")).toBeVisible();
});

test("regular staff do not see form template reorder handles", async ({ page }) => {
  const regularStaff = {
    ...staff,
    id: "regular-reorder-staff",
    role: "staff",
    username: "regular-reorder",
    email: "regular-reorder@example.com",
  };
  const protectedDefault = template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, {
    created_by_staff_id: null,
    displayOrder: 10,
    updated_by_staff_id: null,
  });
  const otherOwned = template("other_reorder", "Other Staff Form", {
    ...toolboxSignatureSchema,
    formType: "other_reorder",
    title: "Other Staff Form",
  }, {
    created_by_staff_id: "other-staff",
    displayOrder: 20,
  });
  const mockState = await mockApis(page, [protectedDefault, otherOwned], { staff: regularStaff });

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("button", { name: /to reorder forms/ })).toHaveCount(0);
  expect(mockState.templatePatchRequests).toHaveLength(0);
});

test("staff can open fill-out forms from the Forms menu", async ({ page }) => {
  const readyRow = template("daily_safety_inspection", "Daily Safety Inspection", dailySafetyInspectionSchema, {
    shareLink: {
      token: "daily-safety-smoke",
      urlPath: "/form-links/daily-safety-smoke",
    },
  });
  const hiddenDraft = draftTemplate("hidden_draft", "Hidden Draft", {
    ...toolboxSignatureSchema,
    formType: "hidden_draft",
    title: "Hidden Draft",
  });
  await mockApis(page, [readyRow, hiddenDraft]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("button", { name: "Fill Out Forms" })).toHaveCount(0);
  await page.locator(".staff-mobile-menu-trigger").click();
  await page.getByRole("menuitem", { exact: true, name: "FORMS" }).click();
  await page.getByRole("menuitem", { name: "Fill A Form" }).click();
  await expect(page).toHaveURL(/\/staff\/forms-to-fill-out$/);
  await expect(page.locator(".staff-mobile-menu-trigger")).toContainText("FORMS");
  await expect(page.getByRole("heading", { name: "Submit a Safety Form" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submitted Forms" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await expect(page.locator(".safety-form-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: /Daily Safety Inspection/ })).toBeVisible();
  await expect(page.getByText("Hidden Draft")).toHaveCount(0);

  await page.getByRole("button", { name: /Daily Safety Inspection/ }).click();
  await expect(page).toHaveURL(/\/form-links\/daily-safety-smoke$/);
});

test("template QR download opens native image share when available", async ({ page }) => {
  await page.addInitScript(() => {
    window.__qrSharePayload = null;
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (payload) => Boolean(payload?.files?.length),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__qrSharePayload = {
          files: (payload.files || []).map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          title: payload.title,
        };
      },
    });
  });
  const readyRow = template("daily_safety_inspection", "Daily Safety Inspection", dailySafetyInspectionSchema, {
    shareLink: {
      token: "daily-safety-share-smoke",
      urlPath: "/form-links/daily-safety-share-smoke",
    },
  });
  await mockApis(page, [readyRow]);

  await page.goto("/staff/form-templates");
  const qrImage = page.locator(".template-qr-image img");
  await expect.poll(() => qrImage.evaluate((image) => ({
    height: image.naturalHeight,
    width: image.naturalWidth,
  }))).toMatchObject({
    height: expect.any(Number),
    width: 640,
  });
  const qrImageSize = await qrImage.evaluate((image) => ({
    height: image.naturalHeight,
    width: image.naturalWidth,
  }));
  expect(qrImageSize.height).toBeGreaterThan(qrImageSize.width);
  const downloadButton = page.getByRole("button", { name: "Download QR" });
  await expect(downloadButton).toBeEnabled();
  await downloadButton.click();

  await expect.poll(() => page.evaluate(() => window.__qrSharePayload)).toMatchObject({
    files: [
      {
        name: "daily_safety_inspection-qr-code.png",
        type: "image/png",
      },
    ],
    title: "Daily Safety Inspection QR code",
  });
  const sharedSize = await page.evaluate(() => window.__qrSharePayload?.files?.[0]?.size || 0);
  expect(sharedSize).toBeGreaterThan(0);
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

test("mobile form templates hide form duplicate actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toolboxRow = template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, {
    displayOrder: 1,
    shareLink: {
      token: "toolbox-mobile-smoke",
      urlPath: "/form-links/toolbox-mobile-smoke",
    },
    versionNumber: 4,
  });
  const siteRow = template("site_inspection", "Site Inspection", siteSignatureSchema, {
    displayOrder: 2,
    shareLink: {
      token: "site-mobile-smoke",
      urlPath: "/form-links/site-mobile-smoke",
    },
    versionNumber: 4,
  });
  await mockApis(page, [toolboxRow, siteRow]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("button", { name: "New Form" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Fill Out Forms" })).toHaveCount(0);
  await expect(page.locator(".template-card-list")).toBeVisible();
  await expect(page.getByText("Please use a larger screen to build or edit form templates.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate", exact: true })).toHaveCount(0);
  await page.locator(".template-card").filter({ hasText: "Site Inspection" }).getByRole("button").first().click();
  await expect(page.locator(".template-card-list")).toBeHidden();
  await expect(page.getByRole("button", { name: "Show form template list" })).toBeVisible();
  await expect(page.locator(".template-editor-panel").getByRole("heading", { name: "Site Inspection" })).toBeVisible();
  await expect(page.locator(".template-editor-panel img[alt='Site Inspection QR code']")).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
  ).toBe(true);
});
