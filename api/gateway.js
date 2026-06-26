import {
  clearStaffSessionCookie,
  getStaffFromRequest,
  loginStaff,
  requireStaff,
  setStaffSessionCookie,
} from "./_lib/auth.js";
import { processStaffAutoReports } from "./_lib/auto-reports.js";
import { assertCronAuthorized } from "./_lib/cron-auth.js";
import { assertDateString, getVancouverDate } from "./_lib/date.js";
import {
  createFileUploadTarget,
  createWorkerSubmission,
  deleteWorkerSubmission,
  getSubmissionById,
  listStaffSubmissions,
  listWorkerSubmissions,
  retrySubmissionBackup,
  runSubmissionMaintenance,
} from "./_lib/form-submissions.js";
import {
  handleApiError,
  parseQuery,
  readJson,
  sendJson,
  sendMethodNotAllowed,
} from "./_lib/http.js";
import { buildCompanySummaryReport, buildSignInReport, sendSignInReportEmail } from "./_lib/reports.js";
import {
  getSettingsSystemStatus,
  getStaffReportSettings,
  getStaffSettings,
  updateStaffSettings,
} from "./_lib/settings.js";
import {
  clearWorkerSignInCookie,
  getCurrentWorkerSignIn,
  getCurrentWorkerSignInsByIds,
  GROUP_FIELDS,
  groupSignIns,
  listSignIns,
  setWorkerSignInCookie,
  signOutCurrentWorker,
  signOutWorkerSignInsByIds,
  createWorkerSignIn,
} from "./_lib/signins.js";
import { buildStaffTrends, updateCompanyMappings } from "./_lib/trends.js";
import {
  clearWorkerSessionCookie,
  createWorkerProfile,
  getWorkerFromRequest,
  listWorkerProfiles,
  loginWorker,
  logoutWorker,
  requireWorker,
  setWorkerSessionCookie,
  updateWorkerProfile,
} from "./_lib/worker-auth.js";

export default async function handler(req, res) {
  const parts = apiPathParts(req);

  try {
    if (parts[0] === "auth") return await handleAuth(req, res, parts.slice(1));
    if (parts[0] === "cron") return await handleCron(req, res, parts.slice(1));
    if (parts[0] === "staff") return await handleStaff(req, res, parts.slice(1));
    if (parts[0] === "worker") return await handleWorker(req, res, parts.slice(1));
    if (parts[0] === "worker-signins") return await handleWorkerSignIns(req, res);
    if (parts[0] === "worker-signout") return await handleWorkerSignOut(req, res);
    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function handleAuth(req, res, parts) {
  const route = parts.join("/");
  if (route === "login") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    const body = await readJson(req);
    const staff = await loginStaff(body.username, body.password);
    setStaffSessionCookie(res, staff);
    return sendJson(res, 200, {
      staff: {
        username: staff.username,
        email: staff.email,
        role: staff.role,
      },
    });
  }

  if (route === "logout") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    clearStaffSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (route === "me") {
    if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
    const staff = await getStaffFromRequest(req);
    if (!staff) return sendJson(res, 401, { staff: null });
    return sendJson(res, 200, {
      staff: {
        username: staff.username,
        email: staff.email,
        role: staff.role,
      },
    });
  }

  if (route === "worker-login") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    const body = await readJson(req);
    const result = await loginWorker(body.identifier, body.password, body.rememberMe);
    setWorkerSessionCookie(res, result.sessionToken, body.rememberMe);
    return sendJson(res, 200, { worker: result.worker });
  }

  if (route === "worker-logout") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    await logoutWorker(req);
    clearWorkerSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (route === "worker-me") {
    if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
    const worker = await getWorkerFromRequest(req);
    if (!worker) return sendJson(res, 401, { worker: null });
    return sendJson(res, 200, { worker });
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleCron(req, res, parts) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
  assertCronAuthorized(req);
  const route = parts.join("/");
  if (route === "auto-reports") {
    return sendJson(res, 200, await processStaffAutoReports());
  }
  if (route === "submission-maintenance") {
    return sendJson(res, 200, await runSubmissionMaintenance());
  }
  return sendJson(res, 404, { error: "Not found" });
}

async function handleStaff(req, res, parts) {
  const staff = await requireStaff(req);
  if (parts[0] === "settings") return handleSettings(req, res, staff);
  if (parts[0] === "trends") return handleTrends(req, res);
  if (parts[0] === "company-profiles") return handleCompanyProfiles(req, res, staff);
  if (parts[0] === "signins") return handleStaffSignIns(req, res, staff, parts.slice(1));
  if (parts[0] === "workers") return handleStaffWorkers(req, res, staff);
  if (parts[0] === "submissions") return handleStaffSubmissions(req, res, parts.slice(1));
  return sendJson(res, 404, { error: "Not found" });
}

async function handleSettings(req, res, staff) {
  if (!["GET", "PATCH"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "PATCH"]);
  }
  const settings =
    req.method === "PATCH"
      ? await updateStaffSettings(await readJson(req), staff.id)
      : await getStaffSettings(staff.id);
  return sendJson(res, 200, {
    settings,
    system: getSettingsSystemStatus(),
  });
}

async function handleTrends(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
  return sendJson(res, 200, await buildStaffTrends(parseQuery(req)));
}

async function handleCompanyProfiles(req, res, staff) {
  if (req.method !== "PATCH") return sendMethodNotAllowed(res, ["PATCH"]);
  const body = await readJson(req);
  const mappings = await updateCompanyMappings(body.mappings, staff.id);
  return sendJson(res, 200, { mappings });
}

async function handleStaffSignIns(req, res, staff, parts) {
  if (!parts.length) {
    if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
    const query = parseQuery(req);
    const date = assertDateString(query.get("date") || getVancouverDate());
    const sort = query.get("sort") || "signed_in_at";
    const dir = query.get("dir") === "desc" ? "desc" : "asc";
    const group = GROUP_FIELDS.includes(query.get("group"))
      ? query.get("group")
      : "none";
    const rows = await listSignIns({ date, sort, dir });
    return sendJson(res, 200, {
      date,
      sort,
      dir,
      group,
      rows,
      groups: groupSignIns(rows, group),
    });
  }

  if (parts[0] === "email-report") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    const body = await readJson(req);
    const date = assertDateString(body.date || getVancouverDate());
    const settings = await getStaffReportSettings(staff.id);
    const reportType = body.type === "company" ? "company" : "people";
    const format = ["csv", "xml", "both"].includes(body.format)
      ? body.format
      : settings.report_format;
    const result = await sendSignInReportEmail({
      date,
      recipientEmail: settings.recipient_emails,
      format: reportType === "company" ? "both" : format,
      kind: "manual",
      reportType,
      staffId: staff.id,
    });
    return sendJson(res, 200, result);
  }

  if (parts[0] === "export") {
    if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
    const query = parseQuery(req);
    const date = assertDateString(query.get("date") || getVancouverDate());
    const format = query.get("format") === "xml" ? "xml" : "csv";
    const isCompanyReport = query.get("type") === "company";
    const report = isCompanyReport
      ? await buildCompanySummaryReport(date)
      : await buildSignInReport(date);
    const body = report[format];
    const filenamePrefix = isCompanyReport ? "worker-company-summary" : "worker-sign-ins";
    res.statusCode = 200;
    res.setHeader(
      "content-type",
      format === "xml" ? "application/xml; charset=utf-8" : "text/csv; charset=utf-8",
    );
    res.setHeader(
      "content-disposition",
      `attachment; filename="${filenamePrefix}-${date}.${format}"`,
    );
    return res.end(body);
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleStaffWorkers(req, res, staff) {
  if (req.method === "GET") {
    const query = parseQuery(req);
    const rows = await listWorkerProfiles({
      search: query.get("search") || "",
      company: query.get("company") || "",
      active: query.get("active") || "all",
    });
    return sendJson(res, 200, { rows });
  }
  if (req.method === "POST") {
    const worker = await createWorkerProfile(await readJson(req), staff.id);
    return sendJson(res, 201, { worker });
  }
  if (req.method === "PATCH") {
    const worker = await updateWorkerProfile(await readJson(req), staff.id);
    return sendJson(res, 200, { worker });
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "PATCH"]);
}

async function handleStaffSubmissions(req, res, parts) {
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, await listStaffSubmissions(parseQuery(req)));
  }
  if (parts.length === 1 && req.method === "GET") {
    const submission = await getSubmissionById(parts[0], { includeDeleted: true });
    return sendJson(res, 200, { submission });
  }
  if (parts.length === 2 && parts[1] === "backup-retry" && req.method === "POST") {
    const submission = await retrySubmissionBackup(parts[0]);
    return sendJson(res, 200, { submission });
  }
  return sendMethodNotAllowed(res, ["GET", "POST"]);
}

async function handleWorker(req, res, parts) {
  const worker = await requireWorker(req);
  if (parts[0] !== "submissions") return sendJson(res, 404, { error: "Not found" });
  const tail = parts.slice(1);

  if (!tail.length && req.method === "GET") {
    return sendJson(res, 200, { rows: await listWorkerSubmissions(worker) });
  }
  if (!tail.length && req.method === "POST") {
    const submission = await createWorkerSubmission(worker, await readJson(req));
    return sendJson(res, 201, { submission });
  }
  if (tail.length === 1 && tail[0] === "file-upload-url" && req.method === "POST") {
    const upload = await createFileUploadTarget(worker, await readJson(req));
    return sendJson(res, 200, { upload });
  }
  if (tail.length === 1 && req.method === "DELETE") {
    return sendJson(res, 200, await deleteWorkerSubmission(worker, tail[0]));
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "DELETE"]);
}

async function handleWorkerSignIns(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
  const signIn = await createWorkerSignIn(await readJson(req));
  setWorkerSignInCookie(res, signIn.id);
  return sendJson(res, 201, { signIn });
}

async function handleWorkerSignOut(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "POST"]);
  }

  if (req.method === "GET") {
    const ids = parseQuery(req).get("ids");
    if (ids) {
      const signIns = await getCurrentWorkerSignInsByIds(ids);
      return sendJson(res, 200, { signIns });
    }
    const signIn = await getCurrentWorkerSignIn(req);
    return sendJson(res, 200, { signIn });
  }

  const body = await readJson(req);
  if (Array.isArray(body.signInIds) && body.signInIds.length) {
    const signIns = await signOutWorkerSignInsByIds(body.signInIds);
    clearWorkerSignInCookie(res);
    return sendJson(res, 200, { signIns, signIn: signIns[0] || null });
  }

  const signIn = await signOutCurrentWorker(req);
  clearWorkerSignInCookie(res);
  return sendJson(res, 200, { signIn });
}

function apiPathParts(req) {
  const queryValue = req.query?.path;
  const path =
    Array.isArray(queryValue)
      ? queryValue.join("/")
      : String(queryValue || pathFromUrl(req.url));
  return path.split("/").filter(Boolean);
}

function pathFromUrl(urlValue) {
  const url = new URL(urlValue || "/", "https://safetyfirst.local");
  return url.pathname.replace(/^\/api\/gateway\/?/, "").replace(/^\/api\/?/, "");
}
