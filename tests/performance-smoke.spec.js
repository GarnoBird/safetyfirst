import { expect, test } from "@playwright/test";

const staff = {
  id: "staff-performance",
  role: "owner",
  username: "gbird",
  display_name: "Garnet Bird",
  email: "garnet@example.com",
};

const worker = {
  id: "worker-performance",
  name: "Leanne Bird",
  phone: "6049025665",
  company: "Birding Scopes",
  username: "lbird",
};

const publicFormLinkTemplate = {
  id: "salus-toolbox-talk-template",
  form_type: "toolbox_talk",
  label: "Salus Toolbox Talk",
  description: "",
  renderer_type: "template",
  active: true,
  worker_visible: true,
};

test("public form-link chooser stays inside startup budgets", async ({ page }) => {
  await mockPerformanceApis(page);
  const metrics = collectRouteMetrics(page);
  const startedAt = Date.now();

  await page.goto("/form-links/salus-toolbox-talk");
  await expect(page.getByRole("heading", { name: "Salus Toolbox Talk" })).toBeVisible();
  await expect(page.getByText("Choose how to submit this form.")).toBeVisible();

  const visibleContentMs = Date.now() - startedAt;
  await reportMetrics("public form-link chooser", metrics, visibleContentMs);

  expect(visibleContentMs).toBeLessThan(5_000);
  expect(metrics.apiCount()).toBeLessThanOrEqual(2);
  expect(metrics.largestScriptBytes()).toBeLessThan(250_000);
  expect(metrics.totalScriptBytes()).toBeLessThan(320_000);
});

test("staff forms list stays inside startup budgets", async ({ page }) => {
  await mockPerformanceApis(page);
  const metrics = collectRouteMetrics(page);
  const startedAt = Date.now();

  await page.goto("/staff/forms");
  await expect(page.getByText("17 form submissions")).toBeVisible();
  await expect(page.getByRole("cell", { name: "The Garno Questionnaire" }).first()).toBeVisible();

  const visibleContentMs = Date.now() - startedAt;
  await reportMetrics("staff forms list", metrics, visibleContentMs);

  expect(visibleContentMs).toBeLessThan(5_000);
  expect(metrics.apiCount()).toBeLessThanOrEqual(4);
  expect(metrics.totalScriptBytes()).toBeLessThan(850_000);
});

test("login routes stay in lightweight route chunks", async ({ page }) => {
  await mockPerformanceApis(page, { workerAuthenticated: false });

  const staffMetrics = collectRouteMetrics(page);
  let startedAt = Date.now();
  await page.goto("/staff-login");
  await expect(page.getByRole("heading", { name: "Staff Login" })).toBeVisible();
  await reportMetrics("staff login", staffMetrics, Date.now() - startedAt);
  expect(staffMetrics.totalScriptBytes()).toBeLessThan(240_000);
  expect(staffMetrics.largestScriptBytes()).toBeLessThan(250_000);

  const workerPage = await page.context().newPage();
  await mockPerformanceApis(workerPage, { workerAuthenticated: false });
  const workerMetrics = collectRouteMetrics(workerPage);
  startedAt = Date.now();
  await workerPage.goto("/worker-login");
  await expect(workerPage.getByRole("heading", { name: "Worker Forms" })).toBeVisible();
  await reportMetrics("worker login", workerMetrics, Date.now() - startedAt);
  expect(workerMetrics.apiCount()).toBeLessThanOrEqual(1);
  expect(workerMetrics.totalScriptBytes()).toBeLessThan(240_000);
  expect(workerMetrics.largestScriptBytes()).toBeLessThan(250_000);
  await workerPage.close();
});

function collectRouteMetrics(page) {
  const apiResponses = [];
  const scriptResponses = [];

  page.on("response", async (response) => {
    const request = response.request();
    const url = response.url();
    if (url.includes("/api/")) {
      apiResponses.push({
        method: request.method(),
        status: response.status(),
        url,
      });
      return;
    }
    if (request.resourceType() !== "script" || !url.includes("/assets/")) return;
    try {
      const body = await response.body();
      scriptResponses.push({
        bytes: body.length,
        url,
      });
    } catch {
      scriptResponses.push({
        bytes: 0,
        url,
      });
    }
  });

  return {
    apiResponses,
    scriptResponses,
    apiCount() {
      return apiResponses.length;
    },
    largestScriptBytes() {
      return Math.max(0, ...scriptResponses.map((script) => script.bytes));
    },
    totalScriptBytes() {
      return scriptResponses.reduce((sum, script) => sum + script.bytes, 0);
    },
  };
}

async function reportMetrics(routeName, metrics, visibleContentMs) {
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.info(
    `[performance-smoke] ${routeName}: ${JSON.stringify({
      visibleContentMs,
      apiCount: metrics.apiCount(),
      routeJsBytes: metrics.totalScriptBytes(),
      largestJsBytes: metrics.largestScriptBytes(),
      apiPaths: metrics.apiResponses.map((response) => {
        const url = new URL(response.url);
        return `${response.method} ${url.pathname} ${response.status}`;
      }),
      scripts: metrics.scriptResponses.map((script) => ({
        bytes: script.bytes,
        file: new URL(script.url).pathname.split("/").pop(),
      })),
    })}`,
  );
}

async function mockPerformanceApis(page, options = {}) {
  const workerAuthenticated = options.workerAuthenticated !== false;
  const staffAuthenticated = options.staffAuthenticated !== false;
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

    if (method === "GET" && path === "/api/auth/me") {
      if (!staffAuthenticated) return json({ staff: null }, 401);
      return json({ staff });
    }

    if (method === "GET" && path === "/api/auth/worker-me") {
      if (!workerAuthenticated) return json({ worker: null }, 401);
      return json({ worker });
    }

    if (method === "GET" && path === "/api/form-links/salus-toolbox-talk/session") {
      return json({ worker, staff });
    }

    if (method === "GET" && path === "/api/form-links/salus-toolbox-talk") {
      return json({
        template: publicFormLinkTemplate,
        link: {
          id: "salus-toolbox-talk-link",
          slug: "salus-toolbox-talk",
          token: "salus-toolbox-talk",
          active: true,
          urlPath: "/form-links/salus-toolbox-talk",
        },
      });
    }

    if (method === "GET" && path === "/api/staff/submissions") {
      const offset = Math.max(0, Number(url.searchParams.get("offset") || 0) || 0);
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50) || 50));
      const rows = staffSubmissionRows().slice(offset, offset + limit);
      return json({
        rows,
        total: 17,
        limit,
        offset,
        hasMore: offset + rows.length < 17,
        sort: url.searchParams.get("sort") || "submitted_at",
        dir: url.searchParams.get("dir") || "desc",
      });
    }

    if (method === "GET" && path === "/api/staff/submissions/filters") {
      return json({
        companyOptions: ["Appia Staff (Ibird)", "Birding Scopes", "GarnoCo"],
        formOptions: [
          { id: "toolbox_talk", label: "Toolbox Talk" },
          { id: "garno_questionnaire", label: "The Garno Questionnaire" },
          { id: "fall_protection", label: "Fall Protection Form" },
        ],
      });
    }

    return json({ error: `Unhandled performance smoke API route: ${method} ${path}` }, 404);
  });
}

function staffSubmissionRows() {
  const seeds = [
    ["2026-07-07T23:22:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-07T21:37:00.000Z", "GarnoCo", "Garnet Bird", "604.354.8262", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-07T17:59:00.000Z", "GarnoCo", "Garnet Bird", "604.354.8262", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-06T23:44:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-06T23:07:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-06T19:26:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-06T19:25:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "garno_questionnaire", "The Garno Questionnaire"],
    ["2026-07-06T04:09:00.000Z", "Appia Admin (Garnet)", "Garnet", "6043548262", "weekly_sub_trade_site_inspection", "Weekly Sub-Trade Site Inspection"],
    ["2026-07-06T01:43:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "toolbox_talk", "Toolbox Talk"],
    ["2026-07-05T23:09:00.000Z", "GarnoCo", "Garnet Bird", "604.354.8262", "fall_protection", "Fall Protection Form"],
    ["2026-07-05T17:41:00.000Z", "Birding Scopes", "Leanne Bird", "6049025665", "daily_safety_inspection", "Daily Safety Inspection"],
    ["2026-07-03T19:04:00.000Z", "Birding Scopes", "Leanne Bird", "6049025665", "new_worker_orientation", "New Worker Orientation"],
    ["2026-07-03T16:55:00.000Z", "Birding Scopes", "Leanne Bird", "6049025665", "toolbox_talk", "Toolbox Talk"],
    ["2026-07-03T15:25:00.000Z", "GarnoCo", "Garnet Bird", "604.354.8262", "toolbox_talk", "Toolbox Talk"],
    ["2026-07-02T22:10:00.000Z", "Appia Staff (Ibird)", "Ibird", "6049025665", "hoist_competency_observation", "Hoist Competency Observation"],
    ["2026-07-02T20:44:00.000Z", "Birding Scopes", "Leanne Bird", "6049025665", "fall_protection", "Fall Protection Form"],
    ["2026-07-01T19:17:00.000Z", "GarnoCo", "Garnet Bird", "604.354.8262", "daily_washroom_inspection", "Daily Washroom Inspection"],
  ];
  return seeds.map(([submittedAt, company, workerName, workerPhone, formType, formLabel], index) => ({
    id: `submission-performance-${index + 1}`,
    submitted_at: submittedAt,
    company,
    worker_name: workerName,
    worker_phone: workerPhone,
    form_type: formType,
    form_current_label: formLabel,
    submission_mode: "fill_form",
    one_drive_backup_status: "pending",
  }));
}
