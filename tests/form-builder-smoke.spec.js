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
    display_order: overrides.displayOrder || 10,
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
    display_order: overrides.displayOrder || 40,
    draftVersion,
    publishedVersion: null,
    versions: [draftVersion],
    ...overrides,
  };
}

function readMigrationSchema(filename) {
  const sql = fs.readFileSync(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8");
  const match = sql.match(/\$schema\$\s*([\s\S]*?)\s*\$schema\$::jsonb/);
  if (!match) throw new Error(`Could not find schema block in ${filename}`);
  return JSON.parse(match[1]);
}

const newWorkerOrientationSchema = readMigrationSchema("019_new_worker_orientation_template.sql");

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

async function mockApis(page, templates) {
  const templatesByType = new Map(templates.map((row) => [row.form_type, row]));
  const submissions = [];
  let uploadCount = 0;
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

    if (path === "/api/auth/me") return json({ staff });
    if (path === "/api/auth/worker-me") return json({ worker });
    if (path.startsWith("/api/mock-upload/") && method === "PUT") {
      return route.fulfill({ status: 200, body: "" });
    }
    if (path === "/api/staff/form-templates" && method === "GET") return json({ rows: templates });
    if (path.startsWith("/api/worker/form-templates/") && path.endsWith("/published")) {
      const formType = decodeURIComponent(path.split("/").at(-2));
      const row = templatesByType.get(formType);
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

test("custom Toolbox Talk preview and worker form render added drawn signatures", async ({ page }) => {
  const row = template("toolbox_talk_copy", "Toolbox Talk copy", toolboxSignatureSchema);
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Toolbox Talk Smoke" })).toBeVisible();
  await page.locator(".template-v3-field-card").filter({ hasText: "Signature" }).getByRole("button").first().click();
  await expect(page.locator(".template-v3-selected-block-card")).toContainText("Selected Block");
  await expectCardAbove(page, ".template-v3-selected-block-card", ".template-v3-template-options-card");
  await page.locator(".template-v3-template-options-card input").first().click();
  await expectCardAbove(page, ".template-v3-template-options-card", ".template-v3-selected-block-card");
  await page.locator(".template-v3-selected-block-card input").first().click();
  await expectCardAbove(page, ".template-v3-selected-block-card", ".template-v3-template-options-card");
  await openPreview(page);
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Signature", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();

  await page.goto("/forms/toolbox_talk_copy");
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Photo attachments").first()).toBeVisible();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect(page.getByText("Signature is required.")).toBeVisible();
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

test("protected default templates open in the V3 shell without edit actions", async ({ page }) => {
  const row = template("toolbox_talk", "Toolbox Talk", toolboxSignatureSchema, { versionNumber: 4 });
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByText("Protected default. Duplicate to edit.").first()).toBeVisible();
  await expect(page.locator(".template-v3-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore previous", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive form", exact: true })).toHaveCount(0);
});
