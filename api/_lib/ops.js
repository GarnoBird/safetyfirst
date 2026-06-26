import { Resend } from "resend";
import { hasOneDriveConfig } from "./onedrive.js";
import { getRequiredEnv, parseQuery } from "./http.js";
import {
  getSettingsSystemStatus,
  isOneDriveBackupEnabled,
  listStaffReportRecipientEmails,
} from "./settings.js";
import {
  getSupabaseServiceClient,
  isSupabaseMissingRelationError,
  throwIfSupabaseError,
} from "./supabase.js";

const SUBMISSION_BUCKET = "safety-form-submissions";
const ALERT_SELECT =
  "id, source, alert_key, severity, status, title, body, metadata, occurrence_count, first_seen_at, last_seen_at, acknowledged_at, resolved_at, last_notified_at";
const JOB_RUN_SELECT =
  "id, job_name, status, triggered_by, triggered_by_staff_id, started_at, finished_at, summary, error";
const BACKUP_ROW_SELECT =
  "id, worker_name, worker_phone, worker_username, company, form_type, submission_mode, submitted_at, submitted_date_vancouver, deleted_by_worker_at, app_purged_at, one_drive_backup_status, backup_attempted_at, backup_error";

export async function createSystemAlert({
  source,
  alertKey,
  severity = "warning",
  title,
  body = "",
  metadata = {},
  notifyCritical = true,
}) {
  const cleaned = {
    source: cleanText(source || "system", 80),
    alert_key: cleanText(alertKey || title || "alert", 160),
    severity: cleanSeverity(severity),
    title: cleanText(title || "System alert", 160),
    body: String(body || "").slice(0, 2000),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };

  try {
    const existing = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("system_alerts")
        .select(ALERT_SELECT)
        .eq("source", cleaned.source)
        .eq("alert_key", cleaned.alert_key)
        .in("status", ["open", "acknowledged"])
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      "System alert could not be loaded.",
    );

    const now = new Date().toISOString();
    const row = existing
      ? throwIfSupabaseError(
          await getSupabaseServiceClient()
            .from("system_alerts")
            .update({
              severity: cleaned.severity,
              title: cleaned.title,
              body: cleaned.body,
              metadata: cleaned.metadata,
              occurrence_count: Number(existing.occurrence_count || 1) + 1,
              last_seen_at: now,
              status: existing.status || "open",
            })
            .eq("id", existing.id)
            .select(ALERT_SELECT)
            .single(),
          "System alert could not be updated.",
        )
      : throwIfSupabaseError(
          await getSupabaseServiceClient()
            .from("system_alerts")
            .insert(cleaned)
            .select(ALERT_SELECT)
            .single(),
          "System alert could not be created.",
        );

    if (
      notifyCritical &&
      row.severity === "critical" &&
      shouldNotifyCriticalAlert(existing)
    ) {
      try {
        await notifyCriticalAlert(row);
      } catch (notifyError) {
        console.warn("Critical alert email failed", notifyError.message);
      }
    }

    return row;
  } catch (error) {
    if (!isSupabaseMissingRelationError(error)) {
      console.warn("System alert failed", error.message);
    }
    return null;
  }
}

export async function listSystemAlerts(req) {
  const query = parseQuery(req);
  const status = String(query.get("status") || "").trim();
  const severity = String(query.get("severity") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(query.get("limit") || 100) || 100));
  let dbQuery = getSupabaseServiceClient()
    .from("system_alerts")
    .select(ALERT_SELECT)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (["open", "acknowledged", "resolved"].includes(status)) {
    dbQuery = dbQuery.eq("status", status);
  }
  if (["info", "warning", "critical"].includes(severity)) {
    dbQuery = dbQuery.eq("severity", severity);
  }
  return { rows: throwIfSupabaseError(await dbQuery, "System alerts could not be loaded.") };
}

export async function updateSystemAlert(alertId, body, staff) {
  const id = cleanUuid(alertId, "Alert id is not valid.");
  const status = String(body?.status || "").trim();
  if (!["open", "acknowledged", "resolved"].includes(status)) {
    const error = new Error("Alert status is not valid.");
    error.statusCode = 400;
    throw error;
  }
  const now = new Date().toISOString();
  const updates = { status };
  if (status === "acknowledged") {
    updates.acknowledged_at = now;
    updates.acknowledged_by_staff_id = staff.id;
  }
  if (status === "resolved") {
    updates.resolved_at = now;
    updates.resolved_by_staff_id = staff.id;
  }
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("system_alerts")
      .update(updates)
      .eq("id", id)
      .select(ALERT_SELECT)
      .single(),
    "System alert could not be updated.",
  );
}

export async function recordJobRun({
  jobName,
  status,
  triggeredBy = "system",
  staff = null,
  startedAt = new Date().toISOString(),
  finishedAt = new Date().toISOString(),
  summary = {},
  error = "",
}) {
  try {
    return throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("job_runs")
        .insert({
          job_name: cleanText(jobName, 120),
          status: cleanJobStatus(status),
          triggered_by: cleanText(triggeredBy, 80),
          triggered_by_staff_id: staff?.id || null,
          started_at: startedAt,
          finished_at: finishedAt,
          summary: summary && typeof summary === "object" ? summary : {},
          error: error ? String(error).slice(0, 2000) : null,
        })
        .select(JOB_RUN_SELECT)
        .single(),
      "Job run could not be recorded.",
    );
  } catch (jobError) {
    if (!isSupabaseMissingRelationError(jobError)) {
      console.warn("Job run log failed", jobError.message);
    }
    return null;
  }
}

export async function getSystemHealth() {
  const [settingsStatus, oneDriveEnabled, bucketStatus, backupHealth, jobRuns, alerts] =
    await Promise.all([
      Promise.resolve(getSettingsSystemStatus()),
      isOneDriveBackupEnabled().catch(() => false),
      getStorageBucketStatus(),
      getBackupHealth(),
      getRecentJobRuns(),
      getAlertHealth(),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    services: {
      ...settingsStatus,
      storage: bucketStatus.status,
      storageMessage: bucketStatus.message,
      oneDriveEnabled,
      oneDriveReady: oneDriveEnabled && hasOneDriveConfig(),
    },
    backups: backupHealth,
    jobs: jobRuns,
    alerts,
  };
}

export async function getBackupQueue() {
  const rows = await loadBackupRows(1000);
  const cutoff = retentionCutoff();
  const summary = summarizeBackupRows(rows, cutoff);
  const queueRows = rows
    .filter((row) => row.one_drive_backup_status !== "backed_up" || isRetentionBlocked(row, cutoff))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
    .slice(0, 200);
  return { summary, rows: queueRows };
}

async function getBackupHealth() {
  try {
    const rows = await loadBackupRows(1000);
    return summarizeBackupRows(rows, retentionCutoff());
  } catch (error) {
    return {
      total: 0,
      pending: 0,
      failed: 0,
      backedUp: 0,
      retentionBlocked: 0,
      error: error.message,
    };
  }
}

async function loadBackupRows(limit) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("form_submissions")
      .select(BACKUP_ROW_SELECT)
      .is("app_purged_at", null)
      .order("submitted_at", { ascending: false })
      .limit(limit),
    "Backup queue could not be loaded.",
  );
}

function summarizeBackupRows(rows, cutoff) {
  const summary = {
    total: rows.length,
    pending: 0,
    failed: 0,
    backedUp: 0,
    retentionBlocked: 0,
    deletedWaiting: 0,
    oldestPendingAt: null,
  };

  rows.forEach((row) => {
    if (row.one_drive_backup_status === "pending") summary.pending += 1;
    if (row.one_drive_backup_status === "failed") summary.failed += 1;
    if (row.one_drive_backup_status === "backed_up") summary.backedUp += 1;
    if (isRetentionBlocked(row, cutoff)) summary.retentionBlocked += 1;
    if (row.deleted_by_worker_at && row.one_drive_backup_status !== "backed_up") {
      summary.deletedWaiting += 1;
    }
    if (
      row.one_drive_backup_status !== "backed_up" &&
      (!summary.oldestPendingAt || row.submitted_at < summary.oldestPendingAt)
    ) {
      summary.oldestPendingAt = row.submitted_at;
    }
  });

  return summary;
}

function isRetentionBlocked(row, cutoff) {
  return (
    row.one_drive_backup_status !== "backed_up" &&
    (row.deleted_by_worker_at || row.submitted_at < cutoff)
  );
}

function retentionCutoff() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

async function getStorageBucketStatus() {
  try {
    const result = await getSupabaseServiceClient().storage.getBucket(SUBMISSION_BUCKET);
    if (result.error) {
      return { status: "not configured", message: result.error.message || "Bucket missing" };
    }
    return { status: "configured", message: result.data?.name || SUBMISSION_BUCKET };
  } catch (error) {
    return { status: "not configured", message: error.message };
  }
}

async function getRecentJobRuns() {
  try {
    return throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("job_runs")
        .select(JOB_RUN_SELECT)
        .order("started_at", { ascending: false })
        .limit(20),
      "Job runs could not be loaded.",
    );
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return [];
    throw error;
  }
}

async function getAlertHealth() {
  try {
    const rows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("system_alerts")
        .select(ALERT_SELECT)
        .in("status", ["open", "acknowledged"])
        .order("last_seen_at", { ascending: false })
        .limit(20),
      "System alerts could not be loaded.",
    );
    return {
      open: rows.filter((row) => row.status === "open").length,
      acknowledged: rows.filter((row) => row.status === "acknowledged").length,
      critical: rows.filter((row) => row.severity === "critical").length,
      rows,
    };
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) {
      return { open: 0, acknowledged: 0, critical: 0, rows: [] };
    }
    throw error;
  }
}

function shouldNotifyCriticalAlert(existing) {
  if (!existing) return true;
  if (!existing.last_notified_at) return true;
  const last = new Date(existing.last_notified_at).getTime();
  return Number.isFinite(last) && Date.now() - last > 60 * 60 * 1000;
}

async function notifyCriticalAlert(alert) {
  if (!process.env.RESEND_API_KEY || !process.env.REPORT_FROM_EMAIL) return;
  let recipients = [];
  try {
    recipients = await listStaffReportRecipientEmails();
  } catch {
    recipients = [];
  }
  if (!recipients.length) return;

  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const appUrl = process.env.APP_PUBLIC_URL;
  const healthLink = appUrl
    ? `<p><a href="${escapeHtml(new URL("/staff/health", appUrl).href)}">Open staff health</a></p>`
    : "";
  const { error } = await resend.emails.send({
    from: getRequiredEnv("REPORT_FROM_EMAIL"),
    to: recipients,
    subject: `Safety First critical alert - ${alert.title}`,
    html: `<p><strong>${escapeHtml(alert.title)}</strong></p><p>${escapeHtml(alert.body || "A critical system alert was recorded.")}</p>${healthLink}`,
  });
  if (error) throw new Error(error.message || "Critical alert email failed.");

  await getSupabaseServiceClient()
    .from("system_alerts")
    .update({ last_notified_at: new Date().toISOString() })
    .eq("id", alert.id);
}

function cleanSeverity(value) {
  const severity = String(value || "").trim().toLowerCase();
  return ["info", "warning", "critical"].includes(severity) ? severity : "warning";
}

function cleanJobStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["running", "succeeded", "failed", "skipped"].includes(status)
    ? status
    : "failed";
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanUuid(value, message) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return id;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
