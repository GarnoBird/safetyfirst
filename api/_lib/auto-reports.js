import {
  buildSignInReport,
  getAutoReportRunForStaff,
  recordReportRun,
  sendSignInReportEmail,
  updateReportRunStatus,
} from "./reports.js";
import { listActiveStaffReportSettings } from "./settings.js";

export async function processStaffAutoReports({ now = new Date() } = {}) {
  const settings = await listActiveStaffReportSettings();
  const summary = {
    checked: settings.length,
    pending: 0,
    alreadyRun: 0,
    skipped: 0,
    sent: 0,
    failed: 0,
    results: [],
  };

  for (const setting of settings) {
    const result = await processStaffAutoReport(setting, now).catch((error) => ({
      staffId: setting.staff_id,
      username: setting.staff?.username || null,
      status: "failed",
      reason: error.exposeMessage ? error.message : "auto_report_failed",
    }));
    summary.results.push(result);

    if (result.status === "pending") summary.pending += 1;
    if (result.status === "already_run") summary.alreadyRun += 1;
    if (result.status === "skipped") summary.skipped += 1;
    if (result.status === "sent") summary.sent += 1;
    if (result.status === "failed") summary.failed += 1;
  }

  return summary;
}

async function processStaffAutoReport(setting, now) {
  const localNow = getLocalNow(now, setting.timezone);
  const staffId = setting.staff_id;
  const baseResult = {
    staffId,
    username: setting.staff?.username || null,
    date: localNow.date,
    scheduledTime: setting.auto_time,
    timezone: setting.timezone,
  };

  if (localNow.minutes < timeToMinutes(setting.auto_time)) {
    return {
      ...baseResult,
      status: "pending",
      reason: "before_selected_time",
    };
  }

  const previousRun = await getAutoReportRunForStaff(localNow.date, staffId);
  if (previousRun) {
    return {
      ...baseResult,
      status: "already_run",
      previousStatus: previousRun.status,
      rowCount: previousRun.row_count,
    };
  }

  const report = await buildSignInReport(localNow.date);
  if (!report.rows.length) {
    const skippedRun = await recordSkippedAutoReport({
      date: localNow.date,
      staffId,
      recipientEmail: setting.recipient_emails,
    });
    if (skippedRun.alreadyRun) {
      return {
        ...baseResult,
        status: "already_run",
        previousStatus: skippedRun.alreadyRun.status,
        rowCount: skippedRun.alreadyRun.row_count,
      };
    }

    return {
      ...baseResult,
      status: "skipped",
      reason: "no_signins",
      rowCount: 0,
    };
  }

  const claimedRun = await claimAutoReportRun({
    date: localNow.date,
    staffId,
    recipientEmail: setting.recipient_emails,
    rowCount: report.rows.length,
  });
  if (claimedRun.alreadyRun) {
    return {
      ...baseResult,
      status: "already_run",
      previousStatus: claimedRun.alreadyRun.status,
      rowCount: claimedRun.alreadyRun.row_count,
    };
  }

  try {
    const sent = await sendSignInReportEmail({
      date: localNow.date,
      recipientEmail: setting.recipient_emails,
      format: setting.report_format,
      kind: "auto",
      staffId,
      recordRun: false,
    });

    if (sent.skipped) {
      await updateReportRunStatus(claimedRun.id, {
        status: "skipped",
        rowCount: 0,
      });

      return {
        ...baseResult,
        status: "skipped",
        reason: "no_signins",
        rowCount: 0,
      };
    }

    await updateReportRunStatus(claimedRun.id, {
      status: "sent",
      rowCount: sent.rowCount,
    });

    return {
      ...baseResult,
      status: "sent",
      rowCount: sent.rowCount,
      format: sent.format,
    };
  } catch (error) {
    const recordedRun = await getAutoReportRunForStaff(localNow.date, staffId).catch(
      () => null,
    );
    if (!recordedRun) {
      await recordReportRun({
        date: localNow.date,
        kind: "auto",
        recipientEmail: setting.recipient_emails,
        rowCount: report.rows.length,
        status: "failed",
        staffId,
      }).catch(() => null);
    }

    return {
      ...baseResult,
      status: "failed",
      rowCount: report.rows.length,
      reason: error.exposeMessage ? error.message : "email_send_failed",
    };
  }
}

async function recordSkippedAutoReport({ date, staffId, recipientEmail }) {
  try {
    return await recordReportRun({
      date,
      kind: "auto",
      recipientEmail,
      rowCount: 0,
      status: "skipped",
      staffId,
    });
  } catch (error) {
    const alreadyRun = await getAutoReportRunForStaff(date, staffId).catch(() => null);
    if (alreadyRun) return { alreadyRun };
    throw error;
  }
}

async function claimAutoReportRun({ date, staffId, recipientEmail, rowCount }) {
  try {
    return await recordReportRun({
      date,
      kind: "auto",
      recipientEmail,
      rowCount,
      status: "failed",
      staffId,
    });
  } catch (error) {
    const alreadyRun = await getAutoReportRunForStaff(date, staffId).catch(() => null);
    if (alreadyRun) return { alreadyRun };
    throw error;
  }
}

function getLocalNow(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "00:00").slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}
