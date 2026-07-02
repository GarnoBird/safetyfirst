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

const toolboxSignatureSchema = {
  schemaVersion: 1,
  formType: "toolbox_talk",
  title: "Toolbox Talk Smoke",
  description: "Toolbox smoke template.",
  sections: [requiredSignatureSection],
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
        { id: "dropdown", type: "dropdown", label: "Dropdown", options: ["One", "Two"] },
        { id: "multi", type: "multi_select", label: "Multi Select", options: ["A", "B"] },
        { id: "checkbox", type: "checkbox", label: "Checkbox confirmation" },
        { id: "signature", type: "signature", label: "Signature" },
        { id: "actions", type: "action_item_rows", label: "Action item rows" },
      ],
    },
  ],
};

async function mockApis(page, templates) {
  const templatesByType = new Map(templates.map((row) => [row.form_type, row]));
  const submissions = [];
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
    if (path === "/api/staff/form-templates" && method === "GET") return json({ rows: templates });
    if (path.startsWith("/api/worker/form-templates/") && path.endsWith("/published")) {
      const formType = decodeURIComponent(path.split("/").at(-2));
      const row = templatesByType.get(formType);
      return row ? json({ template: row }) : json({ error: "Not found" }, 404);
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

  await page.goto("/forms/toolbox_talk_copy");
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await page.getByRole("button", { name: "Submit Toolbox Talk" }).click();
  await expect(page.getByText("Signature is required.")).toBeVisible();
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

test("custom Site Inspection preview and worker form render added drawn signatures", async ({ page }) => {
  const row = template("site_inspection_copy", "Site Inspection copy", siteSignatureSchema);
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await expect(page.getByRole("heading", { name: "Site Inspection Smoke" })).toBeVisible();
  await openPreview(page);
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Deficiencies").first()).toBeVisible();

  await page.goto("/forms/site_inspection_copy");
  await expect(page.locator(".template-signature-canvas")).toBeVisible();
  await expect(page.getByText("Suggested due date").first()).toBeVisible();
});

test("generic V3 preview renders all normal field types and action item rows", async ({ page }) => {
  const row = template("generic_smoke", "Generic Smoke", genericAllFieldsSchema);
  await mockApis(page, [row]);

  await page.goto("/staff/form-templates");
  await openPreview(page);

  for (const label of [
    "Short Answer",
    "Long Answer",
    "Number",
    "Date",
    "Time",
    "Yes No",
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
