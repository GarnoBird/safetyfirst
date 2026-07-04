import {
  clearStaffSessionCookie,
  getStaffFromRequest,
  loginStaff,
  publicStaff,
  requireStaff,
  requireStaffRole,
  setStaffSessionCookie,
} from "./_lib/auth.js";
import { listAuditEvents, recordAuditEvent } from "./_lib/audit.js";
import {
  addActionItemComment,
  attachActionItemFile,
  bulkUpdateActionItems,
  createActionItem,
  createActionItemFileAccess,
  createActionItemFileUploadTarget,
  deleteActionItem,
  getActionItemById,
  getActionItemsForSubmission,
  listActionItems,
  updateActionItem,
} from "./_lib/action-items.js";
import { processStaffAutoReports } from "./_lib/auto-reports.js";
import { assertCronAuthorized } from "./_lib/cron-auth.js";
import { assertDateString, getVancouverDate } from "./_lib/date.js";
import {
  appendStaffSubmissionSignoff,
  createFileUploadTarget,
  createStaffSubmissionPdf,
  createStaffSubmissionFileAccess,
  deleteStaffSubmission,
  deleteStaffSubmissions,
  createWorkerSubmission,
  deleteWorkerSubmission,
  emailStaffSubmissionPdf,
  getSubmissionById,
  listStaffSubmissions,
  listWorkerSubmissions,
  retryFailedSubmissionBackups,
  retrySubmissionBackup,
  runSubmissionMaintenance,
  updateStaffSubmission,
} from "./_lib/form-submissions.js";
import {
  createFormTemplate,
  deleteArchivedFormTemplates,
  duplicateFormTemplate,
  getFormTemplate,
  getPublishedWorkerFormTemplate,
  listFormTemplates,
  listWorkerVisibleFormTemplates,
  lockFormTemplate,
  publishFormTemplateDraft,
  restoreFormTemplateVersion,
  saveFormTemplateDraft,
  unlockFormTemplate,
  updateFormTemplate,
} from "./_lib/form-templates.js";
import {
  handleApiError,
  parseQuery,
  readJson,
  sendJson,
  sendMethodNotAllowed,
} from "./_lib/http.js";
import { buildCompanySummaryReport, buildSignInReport, sendSignInReportEmail } from "./_lib/reports.js";
import {
  createSystemAlert,
  getBackupQueue,
  getSystemHealth,
  listSystemAlerts,
  recordJobRun,
  updateSystemAlert,
} from "./_lib/ops.js";
import { assertLoginAllowed, recordLoginAttempt } from "./_lib/security.js";
import {
  getSettingsSystemStatus,
  getStaffReportSettings,
  getStaffSettings,
  updateStaffSettings,
} from "./_lib/settings.js";
import {
  createStaffUser,
  deleteStaffUser,
  listStaffUsers,
  updateOwnStaffProfile,
  updateStaffUser,
} from "./_lib/staff-users.js";
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
  deleteWorkerProfile,
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
    await assertLoginAllowed({ scope: "staff", identifier: body.username, req });
    try {
      const staff = await loginStaff(body.username, body.password);
      await recordLoginAttempt({
        scope: "staff",
        identifier: body.username,
        success: true,
        req,
      });
      await recordAuditEvent({
        req,
        staff,
        action: "staff_login_success",
        targetType: "staff",
        targetId: staff.id,
        summary: `${staff.username} signed in.`,
      });
      setStaffSessionCookie(res, staff);
      return sendJson(res, 200, { staff: publicStaff(staff) });
    } catch (error) {
      await recordLoginAttempt({
        scope: "staff",
        identifier: body.username,
        success: false,
        failureReason: error.message,
        req,
      });
      await recordAuditEvent({
        req,
        action: "staff_login_failed",
        targetType: "staff",
        targetId: String(body.username || "").trim().toLowerCase(),
        summary: "Staff login failed.",
        metadata: { reason: error.statusCode === 401 ? "invalid_credentials" : error.message },
      });
      throw error;
    }
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
    return sendJson(res, 200, { staff: publicStaff(staff) });
  }

  if (route === "worker-login") {
    if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
    const body = await readJson(req);
    await assertLoginAllowed({ scope: "worker", identifier: body.identifier, req });
    try {
      const result = await loginWorker(body.identifier, body.password, body.rememberMe);
      await recordLoginAttempt({
        scope: "worker",
        identifier: body.identifier,
        success: true,
        req,
      });
      setWorkerSessionCookie(res, result.sessionToken, body.rememberMe);
      return sendJson(res, 200, { worker: result.worker });
    } catch (error) {
      await recordLoginAttempt({
        scope: "worker",
        identifier: body.identifier,
        success: false,
        failureReason: error.message,
        req,
      });
      await recordAuditEvent({
        req,
        action: "worker_login_failed",
        targetType: "worker",
        targetId: String(body.identifier || "").trim().toLowerCase(),
        summary: "Worker login failed.",
        metadata: { reason: error.statusCode === 401 ? "invalid_credentials" : error.message },
      });
      throw error;
    }
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
    const startedAt = new Date().toISOString();
    try {
      const result = await processStaffAutoReports();
      await recordJobRun({
        jobName: "auto_reports",
        status: "succeeded",
        triggeredBy: "cron",
        startedAt,
        summary: result,
      });
      return sendJson(res, 200, result);
    } catch (error) {
      await recordJobRun({
        jobName: "auto_reports",
        status: "failed",
        triggeredBy: "cron",
        startedAt,
        error: error.message,
      });
      await createSystemAlert({
        source: "cron",
        alertKey: "auto_reports_failed",
        severity: "critical",
        title: "Auto report cron failed",
        body: error.message,
      });
      throw error;
    }
  }
  if (route === "submission-maintenance") {
    const startedAt = new Date().toISOString();
    try {
      const result = await runSubmissionMaintenance();
      await recordJobRun({
        jobName: "submission_maintenance",
        status: result.backupSkipped ? "skipped" : "succeeded",
        triggeredBy: "cron",
        startedAt,
        summary: result,
      });
      if ((result.backups || []).some((item) => item.status === "failed")) {
        await createSystemAlert({
          source: "backup",
          alertKey: "maintenance_backup_failures",
          severity: "warning",
          title: "Submission maintenance found failed backups",
          body: "One or more form submissions could not be backed up during maintenance.",
          metadata: result,
        });
      }
      return sendJson(res, 200, result);
    } catch (error) {
      await recordJobRun({
        jobName: "submission_maintenance",
        status: "failed",
        triggeredBy: "cron",
        startedAt,
        error: error.message,
      });
      await createSystemAlert({
        source: "cron",
        alertKey: "submission_maintenance_failed",
        severity: "critical",
        title: "Submission maintenance cron failed",
        body: error.message,
      });
      throw error;
    }
  }
  return sendJson(res, 404, { error: "Not found" });
}

async function handleStaff(req, res, parts) {
  const staff = await requireStaff(req);
  if (parts[0] === "settings") return handleSettings(req, res, staff);
  if (parts[0] === "profile") return handleStaffProfile(req, res, staff);
  if (parts[0] === "trends") return handleTrends(req, res);
  if (parts[0] === "company-profiles") return handleCompanyProfiles(req, res, staff);
  if (parts[0] === "signins") return handleStaffSignIns(req, res, staff, parts.slice(1));
  if (parts[0] === "workers") return handleStaffWorkers(req, res, staff, parts.slice(1));
  if (parts[0] === "users") return handleStaffUsers(req, res, staff, parts.slice(1));
  if (parts[0] === "audit") return handleStaffAudit(req, res, staff);
  if (parts[0] === "alerts") return handleStaffAlerts(req, res, staff, parts.slice(1));
  if (parts[0] === "health") return handleStaffHealth(req, res);
  if (parts[0] === "backups") return handleStaffBackups(req, res, staff, parts.slice(1));
  if (parts[0] === "submissions") return handleStaffSubmissions(req, res, staff, parts.slice(1));
  if (parts[0] === "form-templates") return handleStaffFormTemplates(req, res, staff, parts.slice(1));
  if (parts[0] === "action-items") return handleStaffActionItems(req, res, staff, parts.slice(1));
  return sendJson(res, 404, { error: "Not found" });
}

async function handleSettings(req, res, staff) {
  if (!["GET", "PATCH"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "PATCH"]);
  }
  let settings;
  if (req.method === "PATCH") {
    requireStaffRole(staff, ["owner", "admin"]);
    settings = await updateStaffSettings(await readJson(req), staff.id);
    await recordAuditEvent({
      req,
      staff,
      action: "settings_updated",
      targetType: "settings",
      targetId: "default",
      summary: `${staff.username} updated staff settings.`,
      metadata: { oneDriveBackupEnabled: settings.one_drive_backup_enabled },
    });
  } else {
    settings = await getStaffSettings(staff.id);
  }
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
  requireStaffRole(staff, ["owner", "admin"]);
  const body = await readJson(req);
  const mappings = await updateCompanyMappings(body.mappings, staff.id);
  await recordAuditEvent({
    req,
    staff,
    action: "company_profiles_updated",
    targetType: "company_profiles",
    summary: `${staff.username} updated company profile mappings.`,
    metadata: { count: Array.isArray(body.mappings) ? body.mappings.length : 0 },
  });
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

async function handleStaffWorkers(req, res, staff, parts = []) {
  if (parts.length === 1 && req.method === "DELETE") {
    requireStaffRole(staff, ["owner", "admin"]);
    const worker = await deleteWorkerProfile(parts[0]);
    await recordAuditEvent({
      req,
      staff,
      action: "worker_deleted",
      targetType: "worker",
      targetId: worker.id,
      summary: `${staff.username} deleted worker ${worker.username}.`,
      metadata: { username: worker.username, company: worker.company },
    });
    return sendJson(res, 200, { worker, deleted: true });
  }

  if (parts.length) return sendJson(res, 404, { error: "Not found" });

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
    const body = await readJson(req);
    const worker = await createWorkerProfile(body, staff.id);
    await recordAuditEvent({
      req,
      staff,
      action: "worker_created",
      targetType: "worker",
      targetId: worker.id,
      summary: `${staff.username} created worker ${worker.username}.`,
      metadata: { username: worker.username, company: worker.company },
    });
    return sendJson(res, 201, { worker });
  }
  if (req.method === "PATCH") {
    requireStaffRole(staff, ["owner", "admin"]);
    const body = await readJson(req);
    const worker = await updateWorkerProfile(body, staff.id);
    await recordAuditEvent({
      req,
      staff,
      action: body.password ? "worker_password_reset" : "worker_updated",
      targetType: "worker",
      targetId: worker.id,
      summary: `${staff.username} updated worker ${worker.username}.`,
      metadata: {
        username: worker.username,
        company: worker.company,
        active: worker.active,
        passwordReset: Boolean(body.password),
      },
    });
    return sendJson(res, 200, { worker });
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
}

async function handleStaffUsers(req, res, staff, parts = []) {
  if (parts.length === 1 && req.method === "DELETE") {
    requireStaffRole(staff, ["owner", "admin"]);
    const user = await deleteStaffUser(parts[0], staff);
    await recordAuditEvent({
      req,
      staff,
      action: "staff_user_deleted",
      targetType: "staff",
      targetId: user.id,
      summary: `${staff.username} deleted staff user ${user.username}.`,
      metadata: { username: user.username, role: user.role, active: user.active },
    });
    return sendJson(res, 200, { user, deleted: true });
  }

  if (parts.length) return sendJson(res, 404, { error: "Not found" });

  if (req.method === "GET") {
    const query = parseQuery(req);
    const rows = await listStaffUsers({
      search: query.get("search") || "",
      role: query.get("role") || "",
      active: query.get("active") || "all",
      includeEmail: ["owner", "admin"].includes(staff.role),
    });
    return sendJson(res, 200, { rows });
  }
  if (req.method === "POST") {
    requireStaffRole(staff, ["owner", "admin"]);
    const body = await readJson(req);
    const user = await createStaffUser(body, staff);
    await recordAuditEvent({
      req,
      staff,
      action: "staff_user_created",
      targetType: "staff",
      targetId: user.id,
      summary: `${staff.username} created staff user ${user.username}.`,
      metadata: { username: user.username, role: user.role, active: user.active },
    });
    return sendJson(res, 201, { user });
  }
  if (req.method === "PATCH") {
    requireStaffRole(staff, ["owner", "admin"]);
    const body = await readJson(req);
    const user = await updateStaffUser(body, staff);
    await recordAuditEvent({
      req,
      staff,
      action: body.password ? "staff_password_reset" : "staff_user_updated",
      targetType: "staff",
      targetId: user.id,
      summary: `${staff.username} updated staff user ${user.username}.`,
      metadata: {
        username: user.username,
        role: user.role,
        active: user.active,
        passwordReset: Boolean(body.password),
      },
    });
    return sendJson(res, 200, { user });
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
}

async function handleStaffProfile(req, res, staff) {
  if (req.method === "GET") {
    return sendJson(res, 200, { staff: publicStaff(staff) });
  }
  if (req.method === "PATCH") {
    const body = await readJson(req);
    const updated = await updateOwnStaffProfile(body, staff);
    await recordAuditEvent({
      req,
      staff: { ...staff, username: updated.username, role: staff.role },
      action: body.password ? "staff_profile_password_updated" : "staff_profile_updated",
      targetType: "staff",
      targetId: staff.id,
      summary: `${staff.username} updated their staff profile.`,
      metadata: {
        username: updated.username,
        role: updated.role,
        passwordUpdated: Boolean(body.password),
      },
    });
    return sendJson(res, 200, { staff: updated });
  }
  return sendMethodNotAllowed(res, ["GET", "PATCH"]);
}

async function handleStaffAudit(req, res, staff) {
  requireStaffRole(staff, ["owner", "admin"]);
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
  return sendJson(res, 200, await listAuditEvents(req));
}

async function handleStaffAlerts(req, res, staff, parts) {
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, await listSystemAlerts(req));
  }
  if (parts.length === 1 && req.method === "PATCH") {
    const alert = await updateSystemAlert(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "system_alert_updated",
      targetType: "system_alert",
      targetId: alert.id,
      summary: `${staff.username} set alert ${alert.title} to ${alert.status}.`,
      metadata: { status: alert.status, severity: alert.severity },
    });
    return sendJson(res, 200, { alert });
  }
  return sendMethodNotAllowed(res, ["GET", "PATCH"]);
}

async function handleStaffHealth(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);
  return sendJson(res, 200, await getSystemHealth());
}

async function handleStaffBackups(req, res, staff, parts) {
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, await getBackupQueue());
  }
  if (parts.length === 1 && parts[0] === "retry-all" && req.method === "POST") {
    requireStaffRole(staff, ["owner", "admin"]);
    const startedAt = new Date().toISOString();
    const result = await retryFailedSubmissionBackups();
    await recordJobRun({
      jobName: "backup_retry_all",
      status: result.results.some((item) => item.status === "failed") ? "failed" : "succeeded",
      triggeredBy: "staff",
      staff,
      startedAt,
      summary: result,
      error: result.results.find((item) => item.status === "failed")?.error || "",
    });
    await recordAuditEvent({
      req,
      staff,
      action: "backup_retry_all",
      targetType: "backup",
      summary: `${staff.username} retried all failed backups.`,
      metadata: result,
    });
    if (result.results.some((item) => item.status === "failed")) {
      await createSystemAlert({
        source: "backup",
        alertKey: "manual_retry_failures",
        severity: "warning",
        title: "Manual backup retry had failures",
        body: "One or more failed form backups still could not be completed.",
        metadata: result,
      });
    }
    return sendJson(res, 200, result);
  }
  if (parts.length === 1 && parts[0] === "maintenance" && req.method === "POST") {
    requireStaffRole(staff, ["owner", "admin"]);
    const startedAt = new Date().toISOString();
    try {
      const result = await runSubmissionMaintenance();
      await recordJobRun({
        jobName: "submission_maintenance",
        status: result.backupSkipped ? "skipped" : "succeeded",
        triggeredBy: "staff",
        staff,
        startedAt,
        summary: result,
      });
      await recordAuditEvent({
        req,
        staff,
        action: "submission_maintenance_ran",
        targetType: "backup",
        summary: `${staff.username} ran submission maintenance manually.`,
        metadata: result,
      });
      return sendJson(res, 200, result);
    } catch (error) {
      await recordJobRun({
        jobName: "submission_maintenance",
        status: "failed",
        triggeredBy: "staff",
        staff,
        startedAt,
        error: error.message,
      });
      await createSystemAlert({
        source: "backup",
        alertKey: "manual_maintenance_failed",
        severity: "critical",
        title: "Manual submission maintenance failed",
        body: error.message,
      });
      throw error;
    }
  }
  return sendMethodNotAllowed(res, ["GET", "POST"]);
}

async function handleStaffSubmissions(req, res, staff, parts) {
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, await listStaffSubmissions(parseQuery(req)));
  }
  if (parts.length === 1 && parts[0] === "bulk-delete" && req.method === "POST") {
    requireStaffRole(staff, ["owner", "admin"]);
    const result = await deleteStaffSubmissions(staff, (await readJson(req))?.ids);
    await recordAuditEvent({
      req,
      staff,
      action: "submissions_deleted",
      targetType: "submission",
      summary: `${staff.username} deleted ${result.deleted} form submission${result.deleted === 1 ? "" : "s"}.`,
      metadata: {
        requested: result.requested,
        deleted: result.deleted,
        failed: result.failed,
        ids: result.results.map((row) => row.id),
      },
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 1 && req.method === "GET") {
    const submission = await getSubmissionById(parts[0], { includeDeleted: true });
    const actionItems = ["owner", "admin"].includes(staff.role)
      ? await getActionItemsForSubmission(parts[0])
      : [];
    return sendJson(res, 200, { submission: { ...submission, action_items: actionItems } });
  }
  if (parts.length === 1 && req.method === "PATCH") {
    const submission = await updateStaffSubmission(staff, parts[0], await readJson(req));
    await recordAuditEvent({
      req,
      staff,
      action: "submission_edited",
      targetType: "submission",
      targetId: submission.id,
      summary: `${staff.username} edited a submitted form.`,
      metadata: {
        formType: submission.form_type,
        submissionMode: submission.submission_mode,
      },
    });
    return sendJson(res, 200, { submission });
  }
  if (parts.length === 2 && parts[1] === "pdf" && req.method === "GET") {
    const result = await createStaffSubmissionPdf(parts[0]);
    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-length", String(result.buffer.length));
    res.setHeader("content-disposition", `attachment; filename="${result.fileName}"`);
    res.end(result.buffer);
    return;
  }
  if (parts.length === 4 && parts[1] === "files" && parts[3] === "url" && req.method === "GET") {
    const access = await createStaffSubmissionFileAccess(parts[0], parts[2]);
    return sendJson(res, 200, access);
  }
  if (parts.length === 2 && parts[1] === "signoffs" && req.method === "POST") {
    const submission = await appendStaffSubmissionSignoff(staff, parts[0], await readJson(req));
    await recordAuditEvent({
      req,
      staff,
      action: "submission_staff_signed",
      targetType: "submission",
      targetId: submission.id,
      summary: `${staff.username} signed a submitted form.`,
      metadata: {
        formType: submission.form_type,
        signoffCount: Array.isArray(submission.staff_signoffs) ? submission.staff_signoffs.length : 0,
      },
    });
    return sendJson(res, 200, { submission });
  }
  if (parts.length === 2 && parts[1] === "email" && req.method === "POST") {
    const result = await emailStaffSubmissionPdf(staff, parts[0], await readJson(req));
    await recordAuditEvent({
      req,
      staff,
      action: "submission_pdf_emailed",
      targetType: "submission",
      targetId: parts[0],
      summary: `${staff.username} emailed a submitted form PDF.`,
      metadata: {
        fileName: result.fileName,
        recipientEmail: result.recipientEmail,
        sizeBytes: result.sizeBytes,
      },
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 1 && req.method === "DELETE") {
    requireStaffRole(staff, ["owner", "admin"]);
    const result = await deleteStaffSubmission(staff, parts[0]);
    await recordAuditEvent({
      req,
      staff,
      action: "submission_deleted",
      targetType: "submission",
      targetId: result.id,
      summary: `${staff.username} deleted a form submission.`,
      metadata: { purged: result.purged },
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 2 && parts[1] === "backup-retry" && req.method === "POST") {
    requireStaffRole(staff, ["owner", "admin"]);
    const startedAt = new Date().toISOString();
    let submission;
    try {
      submission = await retrySubmissionBackup(parts[0]);
      await recordJobRun({
        jobName: "backup_retry_one",
        status: "succeeded",
        triggeredBy: "staff",
        staff,
        startedAt,
        summary: { submissionId: parts[0], status: submission.one_drive_backup_status },
      });
    } catch (error) {
      await recordJobRun({
        jobName: "backup_retry_one",
        status: "failed",
        triggeredBy: "staff",
        staff,
        startedAt,
        summary: { submissionId: parts[0] },
        error: error.message,
      });
      await createSystemAlert({
        source: "backup",
        alertKey: `backup_retry_failed_${parts[0]}`,
        severity: "warning",
        title: "Form backup retry failed",
        body: error.message,
        metadata: { submissionId: parts[0] },
      });
      throw error;
    }
    await recordAuditEvent({
      req,
      staff,
      action: "backup_retry_one",
      targetType: "submission",
      targetId: submission.id,
      summary: `${staff.username} retried a form backup.`,
      metadata: { backupStatus: submission.one_drive_backup_status },
    });
    return sendJson(res, 200, { submission });
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "DELETE"]);
}

async function handleStaffActionItems(req, res, staff, parts) {
  requireStaffRole(staff, ["owner", "admin"]);
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, await listActionItems(parseQuery(req)));
  }
  if (!parts.length && req.method === "POST") {
    const item = await createActionItem(await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_item_created",
      targetType: "action_item",
      targetId: item.id,
      summary: `${staff.username} created action item ${item.title}.`,
      metadata: { status: item.status, priority: item.priority },
    });
    return sendJson(res, 201, { item });
  }
  if (parts.length === 1 && parts[0] === "bulk" && req.method === "POST") {
    const result = await bulkUpdateActionItems(await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_items_bulk_updated",
      targetType: "action_item",
      summary: `${staff.username} bulk-updated ${result.succeeded} action item${result.succeeded === 1 ? "" : "s"}.`,
      metadata: result,
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 1 && req.method === "GET") {
    return sendJson(res, 200, { item: await getActionItemById(parts[0]) });
  }
  if (parts.length === 1 && req.method === "PATCH") {
    const item = await updateActionItem(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_item_updated",
      targetType: "action_item",
      targetId: item.id,
      summary: `${staff.username} updated action item ${item.title}.`,
      metadata: { status: item.status, priority: item.priority },
    });
    return sendJson(res, 200, { item });
  }
  if (parts.length === 1 && req.method === "DELETE") {
    const result = await deleteActionItem(parts[0], staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_item_deleted",
      targetType: "action_item",
      targetId: result.id,
      summary: `${staff.username} deleted an action item.`,
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 2 && parts[1] === "comments" && req.method === "POST") {
    const item = await addActionItemComment(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_item_comment_added",
      targetType: "action_item",
      targetId: item.id,
      summary: `${staff.username} commented on action item ${item.title}.`,
    });
    return sendJson(res, 201, { item });
  }
  if (parts.length === 3 && parts[1] === "files" && parts[2] === "upload-url" && req.method === "POST") {
    const upload = await createActionItemFileUploadTarget(parts[0], await readJson(req), staff);
    return sendJson(res, 200, { upload });
  }
  if (parts.length === 2 && parts[1] === "files" && req.method === "POST") {
    const item = await attachActionItemFile(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "action_item_file_added",
      targetType: "action_item",
      targetId: item.id,
      summary: `${staff.username} added evidence to action item ${item.title}.`,
    });
    return sendJson(res, 201, { item });
  }
  if (parts.length === 4 && parts[1] === "files" && parts[3] === "url" && req.method === "GET") {
    const access = await createActionItemFileAccess(parts[0], parts[2]);
    return sendJson(res, 200, access);
  }
  return sendMethodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
}

async function handleStaffFormTemplates(req, res, staff, parts) {
  if (!parts.length && req.method === "GET") {
    return sendJson(res, 200, { rows: await listFormTemplates() });
  }
  if (!parts.length && req.method === "POST") {
    const template = await createFormTemplate(await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_created",
      targetType: "form_template",
      targetId: template.form_type,
      summary: `${staff.username} created a form template.`,
      metadata: { formType: template.form_type, label: template.label },
    });
    return sendJson(res, 201, { template });
  }
  if (parts.length === 1 && parts[0] === "archived" && req.method === "DELETE") {
    const result = await deleteArchivedFormTemplates(staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_templates_archived_deleted",
      targetType: "form_template",
      summary: `${staff.username} deleted ${result.deleted} archived form template${result.deleted === 1 ? "" : "s"}.`,
      metadata: {
        deleted: result.deleted,
        templates: result.rows,
      },
    });
    return sendJson(res, 200, result);
  }
  if (parts.length === 1 && req.method === "GET") {
    return sendJson(res, 200, { template: await getFormTemplate(parts[0]) });
  }
  if (parts.length === 1 && req.method === "PATCH") {
    const template = await updateFormTemplate(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_updated",
      targetType: "form_template",
      targetId: parts[0],
      summary: `${staff.username} updated a form template.`,
      metadata: {
        formType: parts[0],
        workerVisible: template.worker_visible,
        active: template.active,
      },
    });
    return sendJson(res, 200, { template });
  }
  if (parts.length === 2 && parts[1] === "draft" && req.method === "PATCH") {
    const draft = await saveFormTemplateDraft(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_draft_saved",
      targetType: "form_template",
      targetId: parts[0],
      summary: `${staff.username} saved a form template draft.`,
      metadata: { formType: parts[0], versionNumber: draft.version_number },
    });
    return sendJson(res, 200, { draft });
  }
  if (parts.length === 2 && parts[1] === "duplicate" && req.method === "POST") {
    const template = await duplicateFormTemplate(parts[0], staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_duplicated",
      targetType: "form_template",
      targetId: template.form_type,
      summary: `${staff.username} duplicated a form template.`,
      metadata: { sourceFormType: parts[0], formType: template.form_type, label: template.label },
    });
    return sendJson(res, 201, { template });
  }
  if (parts.length === 2 && parts[1] === "lock" && req.method === "POST") {
    const template = await lockFormTemplate(parts[0], staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_locked",
      targetType: "form_template",
      targetId: template.form_type,
      summary: `${staff.username} locked a form template.`,
      metadata: { formType: template.form_type, label: template.label },
    });
    return sendJson(res, 200, { template });
  }
  if (parts.length === 2 && parts[1] === "unlock" && req.method === "POST") {
    const body = await readJson(req);
    try {
      const template = await unlockFormTemplate(parts[0], body, staff);
      await recordAuditEvent({
        req,
        staff,
        action: "form_template_unlocked",
        targetType: "form_template",
        targetId: template.form_type,
        summary: `${staff.username} unlocked a form template.`,
        metadata: { formType: template.form_type, label: template.label },
      });
      return sendJson(res, 200, { template });
    } catch (error) {
      if (error.statusCode === 401) {
        await recordAuditEvent({
          req,
          staff,
          action: "form_template_unlock_failed",
          targetType: "form_template",
          targetId: parts[0],
          summary: `${staff.username} failed to unlock a form template.`,
          metadata: { formType: parts[0], reason: "invalid_password" },
        });
      }
      throw error;
    }
  }
  if (parts.length === 2 && parts[1] === "publish" && req.method === "POST") {
    const published = await publishFormTemplateDraft(parts[0], staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_published",
      targetType: "form_template",
      targetId: parts[0],
      summary: `${staff.username} published a form template.`,
      metadata: { formType: parts[0], versionNumber: published.version_number },
    });
    return sendJson(res, 200, { published });
  }
  if (parts.length === 2 && parts[1] === "restore" && req.method === "POST") {
    const draft = await restoreFormTemplateVersion(parts[0], await readJson(req), staff);
    await recordAuditEvent({
      req,
      staff,
      action: "form_template_restored",
      targetType: "form_template",
      targetId: parts[0],
      summary: `${staff.username} restored a form template draft.`,
      metadata: { formType: parts[0], versionNumber: draft.version_number },
    });
    return sendJson(res, 200, { draft });
  }
  return sendMethodNotAllowed(res, ["GET", "PATCH", "POST"]);
}

async function handleWorker(req, res, parts) {
  const worker = await requireWorker(req);
  if (parts[0] === "form-templates" && parts.length === 1 && req.method === "GET") {
    return sendJson(res, 200, { rows: await listWorkerVisibleFormTemplates() });
  }
  if (parts[0] === "form-templates" && parts.length === 3 && parts[2] === "published" && req.method === "GET") {
    return sendJson(res, 200, { template: await getPublishedWorkerFormTemplate(parts[1]) });
  }
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
  const { signIn, created } = await createWorkerSignIn(await readJson(req));
  setWorkerSignInCookie(res, signIn.id);
  return sendJson(res, created ? 201 : 200, { signIn, created });
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
