import { expect, test } from "@playwright/test";

const staff = {
  id: "staff-certificates",
  role: "staff",
  username: "lbird",
  display_name: "Leanne Bird",
  email: "leanne@example.com",
};

const seedTypes = [
  "Core of Supervision",
  "BC Driver's License",
  "COR Auditor Certificate",
  "Core of Confined Spaces",
  "Core of Fall Protection",
  "Core of JOHS",
  "CSO - TSC",
  "ED Operator - Personnel Hoist & Constr Elevator",
  "Forklift",
  "Hearing Test",
  "MEWP Operator",
  "Mobile Equipment Operator Certificate",
  "Occupational First Aid",
  "Occupational First Aid Lvl 2",
  "Occupational First Aid Lvl 3",
  "Other",
  "Respiratory Fit Test - Large",
  "Respiratory Fit Test - Medium",
  "Rigging, Intermediate Lvl 2",
  "Skid Steer",
  "Tower Rescue Canada - Lvl A-1",
  "Traffic Control Person",
  "WHMIS",
];

const seedProviders = [
  "Access Rescue Canada",
  "Aix Health Safety and Environmental",
  "BCCSA",
  "Care Institute of Safety & Health Inc",
  "CCOHS",
  "Dominion Masonry",
  "Leavitt Training",
  "Lift Pro",
  "Other",
  "Reliable Hearing Van",
  "St John's Ambulance",
  "Technical Safety BC",
  "Trauma Tech",
  "True North Safety",
  "Universal Health & Safety",
  "We the Safe",
];

const longCertificateFileName = "361b2c7c-6b3a-4c9c-bacb-b32db155a567-salus-front-certificate.pdf";
const certificateFileButtonLabel = "View PDF";

test("staff certificates support tabs, seeded options, upload, and archive filtering", async ({ page }) => {
  const state = await mockCertificateApis(page);
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/staff/certificates");
  await expect(page.getByRole("heading", { name: "Safety First certificates" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Approved" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("No certificates found.")).toBeVisible();

  await page.getByRole("tab", { name: "Types" }).click();
  await expect(page.getByRole("heading", { name: "Certificate Types" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "WHMIS" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ED Operator - Personnel Hoist & Constr Elevator" })).toBeVisible();

  await page.getByRole("tab", { name: "Providers" }).click();
  await expect(page.getByRole("heading", { name: "Certificate Providers" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "We the Safe" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Universal Health & Safety", exact: true })).toHaveCount(1);

  await page.getByRole("tab", { name: "Approved" }).click();
  await page.getByRole("button", { name: "Create Certificate" }).click();
  const certificateDialog = page.locator(".certificate-edit-dialog");
  await certificateDialog.getByRole("button", { name: "Create certificate" }).click();
  await expect(certificateDialog.getByText("Worker name, certificate type, provider, issue date, and expiry date are required.")).toBeVisible();

  await certificateDialog.getByLabel("Worker Name").fill("Leanne Bird");
  await certificateDialog.getByLabel("Certificate Type").selectOption({ label: "WHMIS" });
  await certificateDialog.getByLabel("Provider").selectOption({ label: "We the Safe" });
  await certificateDialog.getByLabel("Issue Date").fill("2026-06-11");
  await certificateDialog.getByLabel("Expiry Date").fill("2029-06-11");
  await certificateDialog.getByLabel("Media upload").setInputFiles({
    name: longCertificateFileName,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% certificate smoke\n%%EOF"),
  });
  await certificateDialog.getByRole("button", { name: "Create certificate" }).click();
  await expect(page.getByText("Certificate created.")).toBeVisible();
  const leanneRow = page.getByRole("row", { name: /Leanne Bird WHMIS We the Safe/ });
  await expect(leanneRow).toBeVisible();
  const fileButton = leanneRow.getByRole("button", { name: certificateFileButtonLabel });
  await expect(fileButton).toBeVisible();
  await expect(fileButton).toHaveAttribute("title", `${certificateFileButtonLabel}: ${longCertificateFileName}`);
  await expect(leanneRow.getByText(longCertificateFileName)).toHaveCount(0);
  const fileButtonBox = await fileButton.boundingBox();
  const fileCellBox = await leanneRow.locator("td").nth(5).boundingBox();
  const actionsCellBox = await leanneRow.locator("td").nth(6).boundingBox();
  expect(fileButtonBox).not.toBeNull();
  expect(fileCellBox).not.toBeNull();
  expect(actionsCellBox).not.toBeNull();
  expect(fileButtonBox.x + fileButtonBox.width).toBeLessThanOrEqual(fileCellBox.x + fileCellBox.width + 1);
  expect(fileButtonBox.x + fileButtonBox.width).toBeLessThanOrEqual(actionsCellBox.x + 1);
  const editButtonBox = await leanneRow.getByRole("button", { name: "Edit" }).boundingBox();
  const archiveButtonBox = await leanneRow.getByRole("button", { name: "Archive" }).boundingBox();
  expect(editButtonBox).not.toBeNull();
  expect(archiveButtonBox).not.toBeNull();
  expect(Math.abs(editButtonBox.y - archiveButtonBox.y)).toBeLessThanOrEqual(2);
  expect(editButtonBox.x + editButtonBox.width).toBeLessThanOrEqual(archiveButtonBox.x);
  expect(state.uploads).toHaveLength(1);
  expect(state.certificates[0]).toMatchObject({
    workerName: "Leanne Bird",
    certificateTypeName: "WHMIS",
    providerName: "We the Safe",
  });

  await page
    .getByRole("row", { name: /Leanne Bird WHMIS We the Safe/ })
    .getByRole("cell", { name: "Leanne Bird" })
    .click();
  const detailsDialog = page.locator(".certificate-detail-dialog");
  await expect(detailsDialog.getByRole("heading", { name: "Leanne Bird" })).toBeVisible();
  await expect(detailsDialog.locator("dd").filter({ hasText: "WHMIS" })).toBeVisible();
  await expect(detailsDialog.getByRole("button", { name: certificateFileButtonLabel })).toBeVisible();
  await detailsDialog.getByRole("button", { name: "Close" }).click();

  await fileButton.click();
  await expect(page.getByRole("heading", { name: longCertificateFileName })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();

  await page.getByRole("tab", { name: "Types" }).click();
  await page.getByRole("button", { name: "Add Type" }).click();
  let optionDialog = page.locator(".certificate-option-dialog");
  await optionDialog.getByLabel("Name").fill("Tower Rescue Advanced");
  await optionDialog.getByRole("button", { name: "Create type" }).click();
  await expect(page.getByText("Type created.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Tower Rescue Advanced" })).toBeVisible();

  await page.getByRole("tab", { name: "Providers" }).click();
  await page.getByRole("button", { name: "Add Provider" }).click();
  optionDialog = page.locator(".certificate-option-dialog");
  await optionDialog.getByLabel("Name").fill("Safety First Training");
  await optionDialog.getByRole("button", { name: "Create provider" }).click();
  await expect(page.getByText("Provider created.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Safety First Training" })).toBeVisible();

  await page.getByRole("tab", { name: "Approved" }).click();
  await page.getByRole("button", { name: "Create Certificate" }).click();
  const secondDialog = page.locator(".certificate-edit-dialog");
  await secondDialog.getByLabel("Worker Name").fill("Caleb Isbister");
  await secondDialog.getByLabel("Certificate Type").selectOption({ label: "Tower Rescue Advanced" });
  await secondDialog.getByLabel("Provider").selectOption({ label: "Safety First Training" });
  await secondDialog.getByLabel("Issue Date").fill("2026-07-01");
  await secondDialog.getByLabel("Expiry Date").fill("2027-07-01");
  await secondDialog.getByRole("button", { name: "Create certificate" }).click();
  await expect(page.getByRole("row", { name: /Caleb Isbister Tower Rescue Advanced Safety First Training/ })).toBeVisible();

  await page.getByRole("tab", { name: "Types" }).click();
  await page
    .getByRole("row", { name: /Tower Rescue Advanced/ })
    .getByRole("button", { name: "Archive" })
    .click();
  await expect(page.getByText("Type archived.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Tower Rescue Advanced" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Providers" }).click();
  await page
    .getByRole("row", { name: /Safety First Training/ })
    .getByRole("button", { name: "Archive" })
    .click();
  await expect(page.getByText("Provider archived.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Safety First Training" })).toHaveCount(0);

  await page.getByRole("tab", { name: "Approved" }).click();
  await expect(page.getByRole("row", { name: /Caleb Isbister Tower Rescue Advanced Safety First Training/ })).toBeVisible();
  await page
    .getByRole("row", { name: /Caleb Isbister Tower Rescue Advanced Safety First Training/ })
    .getByRole("button", { name: "Edit" })
    .click();
  const editDialog = page.locator(".certificate-edit-dialog");
  await expect(editDialog.getByLabel("Certificate Type")).toContainText("Tower Rescue Advanced");
  await expect(editDialog.getByLabel("Provider")).toContainText("Safety First Training");
  await editDialog.getByLabel("Expiry Date").fill("2028-07-01");
  await editDialog.getByRole("button", { name: "Save certificate" }).click();
  await expect(page.getByText("Certificate updated.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Caleb Isbister Tower Rescue Advanced Safety First Training 2026-07-01 2028-07-01/ })).toBeVisible();

  await page.getByRole("button", { name: "Create Certificate" }).click();
  const thirdDialog = page.locator(".certificate-edit-dialog");
  const typeOptions = await thirdDialog.getByLabel("Certificate Type").locator("option").allTextContents();
  const providerOptions = await thirdDialog.getByLabel("Provider").locator("option").allTextContents();
  expect(typeOptions).not.toContain("Tower Rescue Advanced");
  expect(providerOptions).not.toContain("Safety First Training");
});

async function mockCertificateApis(page) {
  const state = {
    certificates: [],
    types: seedTypes.map((name, index) => mockOption("type", name, index + 1)),
    providers: seedProviders.map((name, index) => mockOption("provider", name, index + 1)),
    uploads: [],
  };
  let certificateCount = 0;
  let typeCount = state.types.length;
  let providerCount = state.providers.length;
  let fileCount = 0;

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
    if (path.startsWith("/api/mock-upload/") && method === "PUT") {
      state.uploads.push(decodeURIComponent(path.replace("/api/mock-upload/", "")));
      return route.fulfill({ status: 200, body: "" });
    }

    if (path === "/api/staff/certificates" && method === "GET") {
      const search = normalize(url.searchParams.get("search") || "");
      const rows = state.certificates
        .filter((certificate) => !certificate.archivedAt)
        .filter((certificate) => {
          if (!search) return true;
          return [certificate.workerName, certificate.certificateTypeName, certificate.providerName]
            .some((value) => normalize(value).includes(search));
        });
      return json({ rows });
    }

    if (path === "/api/staff/certificates" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      const type = state.types.find((row) => row.id === body.certificateTypeId && !row.archivedAt);
      const provider = state.providers.find((row) => row.id === body.providerId && !row.archivedAt);
      if (!String(body.workerName || "").trim() || !type || !provider || !body.issueDate || !body.expiryDate) {
        return json({ error: "Worker name, certificate type, provider, issue date, and expiry date are required." }, 400);
      }
      certificateCount += 1;
      const certificate = {
        id: `certificate-${certificateCount}`,
        workerName: String(body.workerName).trim(),
        certificateTypeId: type.id,
        certificateTypeName: type.name,
        providerId: provider.id,
        providerName: provider.name,
        issueDate: body.issueDate,
        expiryDate: body.expiryDate,
        status: "approved",
        archivedAt: null,
        files: [],
      };
      state.certificates.push(certificate);
      return json({ certificate }, 201);
    }

    if (path === "/api/staff/certificates/types" && method === "GET") {
      return json({ rows: filterOptions(state.types, url) });
    }
    if (path === "/api/staff/certificates/providers" && method === "GET") {
      return json({ rows: filterOptions(state.providers, url) });
    }
    if (path === "/api/staff/certificates/types" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      typeCount += 1;
      const type = mockOption("type", body.name, typeCount);
      state.types.push(type);
      return json({ type }, 201);
    }
    if (path === "/api/staff/certificates/providers" && method === "POST") {
      const body = JSON.parse(request.postData() || "{}");
      providerCount += 1;
      const provider = mockOption("provider", body.name, providerCount);
      state.providers.push(provider);
      return json({ provider }, 201);
    }

    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "api" && parts[1] === "staff" && parts[2] === "certificates") {
      if (parts[3] === "types" && parts.length === 5 && method === "DELETE") {
        const type = state.types.find((row) => row.id === parts[4]);
        if (!type) return json({ error: "Not found" }, 404);
        type.archivedAt = "2026-07-05T18:00:00.000Z";
        return json({ type });
      }
      if (parts[3] === "providers" && parts.length === 5 && method === "DELETE") {
        const provider = state.providers.find((row) => row.id === parts[4]);
        if (!provider) return json({ error: "Not found" }, 404);
        provider.archivedAt = "2026-07-05T18:00:00.000Z";
        return json({ provider });
      }
      const certificate = state.certificates.find((row) => row.id === parts[3]);
      if (!certificate) return json({ error: "Not found" }, 404);
      if (parts.length === 4 && method === "DELETE") {
        certificate.archivedAt = "2026-07-05T18:00:00.000Z";
        certificate.status = "archived";
        return json({ certificate });
      }
      if (parts.length === 4 && method === "PATCH") {
        const body = JSON.parse(request.postData() || "{}");
        const type = state.types.find((row) => row.id === body.certificateTypeId && (!row.archivedAt || row.id === certificate.certificateTypeId));
        const provider = state.providers.find((row) => row.id === body.providerId && (!row.archivedAt || row.id === certificate.providerId));
        if (!String(body.workerName || "").trim() || !type || !provider || !body.issueDate || !body.expiryDate) {
          return json({ error: "Worker name, certificate type, provider, issue date, and expiry date are required." }, 400);
        }
        certificate.workerName = String(body.workerName).trim();
        certificate.certificateTypeId = type.id;
        certificate.certificateTypeName = type.name;
        certificate.providerId = provider.id;
        certificate.providerName = provider.name;
        certificate.issueDate = body.issueDate;
        certificate.expiryDate = body.expiryDate;
        return json({ certificate });
      }
      if (parts.length === 6 && parts[4] === "files" && parts[5] === "upload-url" && method === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        const safeName = String(body.file?.originalFilename || "certificate.pdf").replace(/[^a-z0-9._-]+/gi, "-");
        const storagePath = `certificates/${certificate.id}/mock-${safeName}`;
        return json({
          upload: {
            bucket: "safety-form-submissions",
            storagePath,
            signedUrl: `${url.origin}/api/mock-upload/${encodeURIComponent(storagePath)}`,
          },
        });
      }
      if (parts.length === 5 && parts[4] === "files" && method === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        fileCount += 1;
        const file = {
          id: `certificate-file-${fileCount}`,
          certificateId: certificate.id,
          bucket: "safety-form-submissions",
          storagePath: body.storagePath,
          originalFilename: body.file?.originalFilename || "certificate.pdf",
          original_filename: body.file?.originalFilename || "certificate.pdf",
          mimeType: body.file?.mimeType || "application/pdf",
          mime_type: body.file?.mimeType || "application/pdf",
          sizeBytes: body.file?.sizeBytes || 1,
          size_bytes: body.file?.sizeBytes || 1,
        };
        certificate.files.push(file);
        return json({ certificate, file }, 201);
      }
      if (parts.length === 7 && parts[4] === "files" && parts[6] === "url" && method === "GET") {
        const file = certificate.files.find((item) => item.id === parts[5]);
        if (!file) return json({ error: "Not found" }, 404);
        return json({
          file,
          url: `${url.origin}/api/mock-file/${file.id}`,
          downloadUrl: `${url.origin}/api/mock-file/${file.id}?download=1`,
          expiresInSeconds: 600,
        });
      }
    }

    return json({ error: `Unhandled ${method} ${path}` }, 404);
  });

  return state;
}

function mockOption(kind, name, index) {
  const cleanName = String(name || "").trim();
  return {
    id: `${kind}-${index}`,
    slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    name: cleanName,
    archivedAt: null,
  };
}

function filterOptions(rows, url) {
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  return rows.filter((row) => includeArchived || !row.archivedAt);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
