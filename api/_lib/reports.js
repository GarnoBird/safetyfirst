import { Resend } from "resend";
import { getVancouverDate } from "./date.js";
import { getRequiredEnv } from "./http.js";
import { listSignIns } from "./signins.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const REPORT_HEADERS = ["Signed In At", "Name", "Phone", "Trade", "Company"];

export async function buildSignInReport(date = getVancouverDate()) {
  const rows = await listSignIns({ date, sort: "signed_in_at", dir: "asc" });
  return {
    date,
    rows,
    csv: rowsToCsv(rows),
    xml: rowsToXml(date, rows),
  };
}

export function rowsToCsv(rows) {
  const body = rows.map((row) =>
    [
      row.signed_in_at,
      row.name,
      row.phone,
      row.trade,
      row.company,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [REPORT_HEADERS.join(","), ...body].join("\n");
}

export function rowsToXml(date, rows) {
  const body = rows
    .map(
      (row) => `  <signIn id="${escapeXml(row.id)}">
    <signedInAt>${escapeXml(row.signed_in_at)}</signedInAt>
    <name>${escapeXml(row.name)}</name>
    <phone>${escapeXml(row.phone)}</phone>
    <trade>${escapeXml(row.trade)}</trade>
    <company>${escapeXml(row.company)}</company>
  </signIn>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<signIns date="${escapeXml(date)}">
${body}
</signIns>`;
}

export async function sendSignInReportEmail({ date, recipientEmail, kind, staffId }) {
  const report = await buildSignInReport(date);
  if (!report.rows.length) return { skipped: true, rowCount: 0 };

  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const from = getRequiredEnv("REPORT_FROM_EMAIL");
  const subject = `Worker sign-ins - ${date}`;
  const appUrl = process.env.APP_PUBLIC_URL;
  const dashboardLink = appUrl
    ? `<p><a href="${escapeHtml(new URL("/staff/sign-ins", appUrl).href)}">Open staff sign-ins</a></p>`
    : "";

  const { data, error } = await resend.emails.send({
    from,
    to: [recipientEmail],
    subject,
    html: `<p>Attached are the worker sign-ins for ${escapeHtml(date)}.</p><p>Rows: ${report.rows.length}</p>${dashboardLink}`,
    attachments: [
      {
        filename: `worker-sign-ins-${date}.csv`,
        content: report.csv,
      },
      {
        filename: `worker-sign-ins-${date}.xml`,
        content: report.xml,
      },
    ],
  });

  if (error) {
    await recordReportRun({
      date,
      kind,
      recipientEmail,
      rowCount: report.rows.length,
      status: "failed",
      staffId,
    });
    const sendError = new Error("Report email could not be sent.");
    sendError.statusCode = 502;
    sendError.cause = error;
    throw sendError;
  }

  await recordReportRun({
    date,
    kind,
    recipientEmail,
    rowCount: report.rows.length,
    status: "sent",
    staffId,
  });

  return { skipped: false, rowCount: report.rows.length, emailId: data?.id };
}

export async function hasSentAutoReport(date) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("report_runs")
      .select("id")
      .eq("report_date", date)
      .eq("kind", "auto")
      .eq("status", "sent")
      .limit(1),
    "Report run status could not be checked.",
  );
  return rows.length > 0;
}

async function recordReportRun({
  date,
  kind,
  recipientEmail,
  rowCount,
  status,
  staffId = null,
}) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient().from("report_runs").insert({
      report_date: date,
      kind,
      recipient_email: recipientEmail,
      row_count: rowCount,
      status,
      triggered_by_staff_id: staffId,
      sent_at: new Date().toISOString(),
    }),
    "Report run could not be recorded.",
  );
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
