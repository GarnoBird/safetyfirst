import { expect, test } from "@playwright/test";

const staff = {
  id: "staff-mobile-tables",
  role: "staff",
  username: "lbird",
  display_name: "Leanne Bird",
  email: "leanne@example.com",
};

const assets = [
  {
    id: "asset-mobile-1",
    name: "Mobile Harness",
    assetType: "Fall Protection",
    serialNumber: "MH-001",
    hours: 12,
    currentSite: "SOLO 4: Aerius",
    status: "active",
    archivedAt: null,
    lastUsedAt: "2026-07-01T17:30:00.000Z",
  },
];

const certificates = [
  {
    id: "certificate-mobile-1",
    workerName: "Leanne Bird",
    certificateTypeId: "type-hearing-test",
    certificateTypeName: "Hearing Test",
    providerId: "provider-reliable-hearing-van",
    providerName: "Reliable Hearing Van",
    issueDate: "2025-07-11",
    expiryDate: "2026-07-11",
    status: "approved",
    archivedAt: null,
    files: [
      {
        id: "certificate-file-mobile-1",
        originalFilename: "361b2c7c-6b3a-4c9c-bacb-b32db155a567.jpg",
      },
    ],
  },
];

test("mobile staff assets and certificates keep their result tables visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStaffTableApis(page);

  await page.goto("/staff/assets");
  await expect(page.getByRole("heading", { name: "Safety First assets" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Mobile Harness Fall Protection MH-001/ })).toBeVisible();
  await expect(page.locator(".staff-assets-panel .staff-table-scroll")).toHaveCSS("display", "block");

  await page.goto("/staff/certificates");
  await expect(page.getByRole("heading", { name: "Safety First certificates" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Worker Name" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Leanne Bird Hearing Test Reliable Hearing Van/ })).toBeVisible();
  await expect(page.locator(".certificates-panel .staff-table-scroll")).toHaveCSS("display", "block");
});

async function mockStaffTableApis(page) {
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
    if (path === "/api/staff/assets" && method === "GET") return json({ rows: assets });
    if (path === "/api/staff/certificates" && method === "GET") return json({ rows: certificates });
    if (path === "/api/staff/certificates/types" && method === "GET") {
      return json({ rows: [{ id: "type-hearing-test", name: "Hearing Test", archivedAt: null }] });
    }
    if (path === "/api/staff/certificates/providers" && method === "GET") {
      return json({ rows: [{ id: "provider-reliable-hearing-van", name: "Reliable Hearing Van", archivedAt: null }] });
    }

    return json({ error: `Unhandled ${method} ${path}` }, 404);
  });
}
