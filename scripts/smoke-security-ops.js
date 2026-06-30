const baseUrl = (process.env.SMOKE_BASE_URL || process.env.APP_PUBLIC_URL || "").replace(/\/+$/, "");
const staffUsername = process.env.SMOKE_STAFF_USERNAME || process.env.SEED_STAFF_USERNAME || "";
const staffPassword = process.env.SMOKE_STAFF_PASSWORD || process.env.SEED_STAFF_PASSWORD || "";

if (!baseUrl) {
  console.error("Set SMOKE_BASE_URL or APP_PUBLIC_URL before running smoke:ops.");
  process.exit(1);
}

const checks = [];

await checkPage("/staff-login", "Staff login page");
await checkPage("/worker-login", "Worker login page");
await checkUnauthorized("/api/auth/me", "Staff me requires login");
await checkUnauthorized("/api/auth/worker-me", "Worker me requires login");

if (staffUsername && staffPassword) {
  await checkStaffLoginAndHealth();
} else {
  checks.push({
    name: "Staff authenticated health check",
    ok: true,
    detail: "Skipped. Set SMOKE_STAFF_USERNAME and SMOKE_STAFF_PASSWORD to include it.",
  });
}

const failed = checks.filter((check) => !check.ok);
checks.forEach((check) => {
  console.log(`${check.ok ? "ok" : "fail"} - ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
});

if (failed.length) process.exit(1);

async function checkPage(path, name) {
  const response = await fetchUrl(path);
  checks.push({
    name,
    ok: response.ok && /text\/html/i.test(response.headers.get("content-type") || ""),
    detail: `${response.status}`,
  });
}

async function checkUnauthorized(path, name) {
  const response = await fetchUrl(path);
  checks.push({
    name,
    ok: response.status === 401,
    detail: `${response.status}`,
  });
}

async function checkStaffLoginAndHealth() {
  const loginResponse = await fetchUrl("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: staffUsername,
      password: staffPassword,
    }),
  });
  const cookie = loginResponse.headers.get("set-cookie") || "";
  const loginPayload = await loginResponse.clone().json().catch(() => ({}));
  const role = loginPayload.staff?.role || "";
  checks.push({
    name: "Staff login",
    ok: loginResponse.ok && cookie.includes("sf_staff_session="),
    detail: role ? `${loginResponse.status}, ${role}` : `${loginResponse.status}`,
  });
  if (!loginResponse.ok || !cookie) return;

  if (["owner", "admin"].includes(role)) {
    const healthResponse = await fetchUrl("/api/staff/health", {
      headers: { cookie },
    });
    checks.push({
      name: "Staff health API",
      ok: healthResponse.ok,
      detail: `${healthResponse.status}`,
    });
    return;
  }

  const templatesResponse = await fetchUrl("/api/staff/form-templates", {
    headers: { cookie },
  });
  checks.push({
    name: "Staff form templates API",
    ok: templatesResponse.ok,
    detail: `${templatesResponse.status}`,
  });
}

async function fetchUrl(path, options = {}) {
  return fetch(new URL(path, baseUrl), {
    redirect: "manual",
    ...options,
  });
}
