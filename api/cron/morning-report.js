import { getVancouverDate, getVancouverHour } from "../_lib/date.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";
import {
  buildSignInReport,
  hasSentAutoReport,
  sendSignInReportEmail,
} from "../_lib/reports.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    assertCronAuthorized(req);

    const localHour = getVancouverHour();
    const date = getVancouverDate();
    if (localHour !== 8) {
      return sendJson(res, 200, { skipped: true, reason: "outside_8am_hour", date });
    }

    if (await hasSentAutoReport(date)) {
      return sendJson(res, 200, { skipped: true, reason: "already_sent", date });
    }

    const report = await buildSignInReport(date);
    if (!report.rows.length) {
      return sendJson(res, 200, { skipped: true, reason: "no_signins", date });
    }

    const staffRows = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .select("id, email")
        .eq("username", "lbird")
        .eq("active", true)
        .limit(1),
      "Report recipient could not be loaded.",
    );

    const recipient = staffRows[0];
    if (!recipient?.email) {
      const error = new Error("No active report recipient is configured.");
      error.statusCode = 503;
      throw error;
    }

    const result = await sendSignInReportEmail({
      date,
      recipientEmail: recipient.email,
      kind: "auto",
      staffId: recipient.id,
    });

    return sendJson(res, 200, { ...result, date });
  } catch (error) {
    return handleApiError(res, error);
  }
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
