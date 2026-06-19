import { getVancouverDate } from "../_lib/date.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";
import {
  buildSignInReport,
  hasSentAutoReport,
  sendSignInReportEmail,
} from "../_lib/reports.js";
import { getSiteSettings } from "../_lib/settings.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    assertCronAuthorized(req);

    const date = getVancouverDate();
    const settings = await getSiteSettings();

    if (!settings.report_auto_enabled) {
      return sendJson(res, 200, { skipped: true, reason: "auto_disabled", date });
    }

    const currentTime = getVancouverTime();
    if (currentTime < settings.report_auto_time) {
      return sendJson(res, 200, {
        skipped: true,
        reason: "too_early",
        date,
        currentTime,
        reportTime: settings.report_auto_time,
      });
    }

    if (await hasSentAutoReport(date)) {
      return sendJson(res, 200, { skipped: true, reason: "already_sent", date });
    }

    const report = await buildSignInReport(date);
    if (!report.rows.length) {
      return sendJson(res, 200, { skipped: true, reason: "no_signins", date });
    }

    if (!settings.report_recipient_email) {
      const error = new Error("No active report recipient is configured.");
      error.statusCode = 503;
      throw error;
    }

    const result = await sendSignInReportEmail({
      date,
      recipientEmail: settings.report_recipient_email,
      format: settings.report_format,
      kind: "auto",
    });

    return sendJson(res, 200, { ...result, date });
  } catch (error) {
    return handleApiError(res, error);
  }
}

function getVancouverTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Vancouver",
  }).format(date);
}

function assertCronAuthorized(req) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    const error = new Error("Missing CRON_SECRET.");
    error.statusCode = 503;
    throw error;
  }

  const authorization = req.headers.authorization || "";
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const querySecret = url.searchParams.get("secret");
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (bearerSecret !== configuredSecret && querySecret !== configuredSecret) {
    const error = new Error("Cron request is not authorized.");
    error.statusCode = 401;
    throw error;
  }
}
