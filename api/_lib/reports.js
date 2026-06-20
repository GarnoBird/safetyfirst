import { Resend } from "resend";
import { getVancouverDate } from "./date.js";
import { getRequiredEnv } from "./http.js";
import { normalizeReportRecipientEmails } from "./settings.js";
import { listSignIns } from "./signins.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const REPORT_HEADERS = ["Signed In At", "Name", "Phone", "Trade", "Company"];
const COMPANY_REPORT_HEADERS = ["Company", "Number of workers for that company"];

export async function buildSignInReport(date = getVancouverDate()) {
  const rows = await listSignIns({ date, sort: "signed_in_at", dir: "asc" });
  return {
    date,
    rows,
    csv: rowsToCsv(rows),
    xml: rowsToXml(date, rows),
  };
}

export async function buildCompanySummaryReport(date = getVancouverDate()) {
  const signIns = await listSignIns({ date, sort: "company", dir: "asc" });
  const companies = summarizeCompanies(signIns);
  return {
    date,
    signIns,
    companies,
    totalCompanies: companies.length,
    totalWorkers: signIns.length,
    csv: companySummaryToCsv({ companies, date, totalWorkers: signIns.length }),
    xml: companySummaryToXml({
      companies,
      date,
      totalCompanies: companies.length,
      totalWorkers: signIns.length,
    }),
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

export function companySummaryToCsv({ companies, date, totalWorkers }) {
  return [
    ["Metric", "Value"].map(escapeCsv).join(","),
    ["Date", date].map(escapeCsv).join(","),
    ["Total Companies on site", companies.length].map(escapeCsv).join(","),
    ["Total Workers on site", totalWorkers].map(escapeCsv).join(","),
    "",
    COMPANY_REPORT_HEADERS.map(escapeCsv).join(","),
    ...companies.map((row) =>
      [row.company, row.workerCount].map(escapeCsv).join(","),
    ),
  ].join("\n");
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

export function companySummaryToXml({
  companies,
  date,
  totalCompanies,
  totalWorkers,
}) {
  const body = companies
    .map(
      (row) => `  <company>
    <name>${escapeXml(row.company)}</name>
    <workerCount>${escapeXml(row.workerCount)}</workerCount>
  </company>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<companySummary date="${escapeXml(date)}" totalCompanies="${escapeXml(totalCompanies)}" totalWorkers="${escapeXml(totalWorkers)}">
${body}
</companySummary>`;
}

export async function sendSignInReportEmail({
  date,
  recipientEmail,
  kind,
  staffId,
  format = "both",
  reportType = "people",
  recordRun = true,
}) {
  if (reportType === "company") {
    return sendCompanySummaryReportEmail({
      date,
      kind,
      recipientEmail,
      staffId,
      recordRun,
    });
  }

  const report = await buildSignInReport(date);
  if (!report.rows.length) return { skipped: true, rowCount: 0 };
  assertEmailConfig();

  const recipientEmails = normalizeReportRecipientEmails(recipientEmail);
  const recipientEmailText = recipientEmails.join(", ");
  const reportFormat = normalizeReportFormat(format);
  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const from = getRequiredEnv("REPORT_FROM_EMAIL");
  const subject = `Worker sign-ins - ${date}`;
  const appUrl = process.env.APP_PUBLIC_URL;
  const dashboardLink = appUrl
    ? `<p><a href="${escapeHtml(new URL("/staff/sign-ins", appUrl).href)}">Open staff sign-ins</a></p>`
    : "";

  const { data, error } = await resend.emails.send({
    from,
    to: recipientEmails,
    subject,
    html: `<p>Attached are the worker sign-ins for ${escapeHtml(date)}.</p><p>Rows: ${report.rows.length}</p>${dashboardLink}`,
    attachments: reportAttachments(report, reportFormat),
  });

  if (error) {
    if (recordRun) {
      await recordReportRun({
        date,
        kind,
        recipientEmail: recipientEmailText,
        rowCount: report.rows.length,
        status: "failed",
        staffId,
      });
    }
    const sendError = new Error("Report email could not be sent.");
    sendError.statusCode = 502;
    sendError.cause = error;
    throw sendError;
  }

  if (recordRun) {
    await recordReportRun({
      date,
      kind,
      recipientEmail: recipientEmailText,
      rowCount: report.rows.length,
      status: "sent",
      staffId,
    });
  }

  return {
    skipped: false,
    rowCount: report.rows.length,
    emailId: data?.id,
    recipientEmail: recipientEmailText,
    recipientEmails,
    format: reportFormat,
  };
}

async function sendCompanySummaryReportEmail({
  date,
  recipientEmail,
  kind,
  staffId,
  recordRun = true,
}) {
  const report = await buildCompanySummaryReport(date);
  if (!report.totalWorkers) return { skipped: true, rowCount: 0 };

  assertEmailConfig();

  const recipientEmails = normalizeReportRecipientEmails(recipientEmail);
  const recipientEmailText = recipientEmails.join(", ");
  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const from = getRequiredEnv("REPORT_FROM_EMAIL");
  const subject = `Company summary - ${date}`;
  const appUrl = process.env.APP_PUBLIC_URL;
  const dashboardLink = appUrl
    ? `<p><a href="${escapeHtml(new URL("/staff/sign-ins/company", appUrl).href)}">Open company summary</a></p>`
    : "";

  const { data, error } = await resend.emails.send({
    from,
    to: recipientEmails,
    subject,
    html: companySummaryEmailHtml(report, dashboardLink),
    attachments: reportAttachments(
      {
        date: report.date,
        csv: report.csv,
        xml: report.xml,
        filenamePrefix: "worker-company-summary",
      },
      "both",
    ),
  });

  if (error) {
    if (recordRun) {
      await recordReportRun({
        date,
        kind,
        recipientEmail: recipientEmailText,
        rowCount: report.totalWorkers,
        status: "failed",
        staffId,
      });
    }
    const sendError = new Error("Report email could not be sent.");
    sendError.statusCode = 502;
    sendError.cause = error;
    throw sendError;
  }

  if (recordRun) {
    await recordReportRun({
      date,
      kind,
      recipientEmail: recipientEmailText,
      rowCount: report.totalWorkers,
      status: "sent",
      staffId,
    });
  }

  return {
    skipped: false,
    rowCount: report.totalWorkers,
    companyCount: report.totalCompanies,
    emailId: data?.id,
    recipientEmail: recipientEmailText,
    recipientEmails,
    format: "both",
    reportType: "company",
  };
}

function assertEmailConfig() {
  const missing = ["RESEND_API_KEY", "REPORT_FROM_EMAIL"].filter(
    (name) => !process.env[name],
  );
  if (!missing.length) return;

  const error = new Error(
    `Email reports are not configured yet. Missing: ${missing.join(", ")}.`,
  );
  error.statusCode = 503;
  error.exposeMessage = true;
  throw error;
}

function encodeAttachment(content) {
  return Buffer.from(content, "utf8").toString("base64");
}

function normalizeReportFormat(format) {
  return ["csv", "xml", "both"].includes(format) ? format : "both";
}

function reportAttachments(report, format) {
  const attachments = [];
  const filenamePrefix = report.filenamePrefix || "worker-sign-ins";

  if (format === "csv" || format === "both") {
    attachments.push({
      filename: `${filenamePrefix}-${report.date}.csv`,
      content: encodeAttachment(report.csv),
      contentType: "text/csv; charset=utf-8",
    });
  }

  if (format === "xml" || format === "both") {
    attachments.push({
      filename: `${filenamePrefix}-${report.date}.xml`,
      content: encodeAttachment(report.xml),
      contentType: "application/xml; charset=utf-8",
    });
  }

  return attachments;
}

function summarizeCompanies(rows) {
  const companies = new Map();
  rows.forEach((row) => {
    const company = String(row.company || row.trade || "Unassigned").trim() || "Unassigned";
    companies.set(company, (companies.get(company) || 0) + 1);
  });

  return [...companies.entries()]
    .map(([company, workerCount]) => ({ company, workerCount }))
    .sort((a, b) => b.workerCount - a.workerCount || a.company.localeCompare(b.company));
}

function companySummaryEmailHtml(report, dashboardLink) {
  const companyRows = report.companies
    .map(
      (row) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e3ebe7;">${escapeHtml(row.company)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e3ebe7;text-align:right;font-weight:700;">${escapeHtml(row.workerCount)}</td>
      </tr>`,
    )
    .join("");

  return `<div style="font-family:Inter,Arial,sans-serif;color:#17211f;line-height:1.45;">
    <h1 style="margin:0 0 12px;font-size:22px;">Company summary - ${escapeHtml(report.date)}</h1>
    <div style="display:inline-block;margin:0 10px 14px 0;padding:10px 14px;border:1px solid #d9e3de;border-radius:8px;background:#f7faf9;">
      <div style="font-size:12px;color:#5e6d69;font-weight:700;text-transform:uppercase;">Total Companies on site</div>
      <div style="font-size:26px;font-weight:800;">${escapeHtml(report.totalCompanies)}</div>
    </div>
    <div style="display:inline-block;margin:0 0 14px;padding:10px 14px;border:1px solid #d9e3de;border-radius:8px;background:#f7faf9;">
      <div style="font-size:12px;color:#5e6d69;font-weight:700;text-transform:uppercase;">Total Workers on site</div>
      <div style="font-size:26px;font-weight:800;">${escapeHtml(report.totalWorkers)}</div>
    </div>
    <table style="width:100%;max-width:560px;border-collapse:collapse;border:1px solid #d9e3de;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#eef3f1;">
          <th style="padding:9px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#43514e;">Company</th>
          <th style="padding:9px 10px;text-align:right;font-size:12px;text-transform:uppercase;color:#43514e;">Workers</th>
        </tr>
      </thead>
      <tbody>${companyRows}</tbody>
    </table>
    <p style="margin-top:14px;color:#5e6d69;">CSV and XML versions are attached.</p>
    ${dashboardLink}
  </div>`;
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

export async function getAutoReportRunForStaff(date, staffId) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("report_runs")
      .select("id, report_date, kind, status, row_count, sent_at, triggered_by_staff_id")
      .eq("report_date", date)
      .eq("kind", "auto")
      .eq("triggered_by_staff_id", staffId)
      .order("sent_at", { ascending: false })
      .limit(1),
    "Report run status could not be checked.",
  );
  return rows[0] || null;
}

export async function recordReportRun({
  date,
  kind,
  recipientEmail,
  rowCount,
  status,
  staffId = null,
}) {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("report_runs")
      .insert({
        report_date: date,
        kind,
        recipient_email: recipientEmail,
        row_count: rowCount,
        status,
        triggered_by_staff_id: staffId,
        sent_at: new Date().toISOString(),
      })
      .select("id, report_date, kind, status, row_count, sent_at, triggered_by_staff_id")
      .single(),
    "Report run could not be recorded.",
  );
}

export async function updateReportRunStatus(runId, { status, rowCount }) {
  const updates = {
    status,
    sent_at: new Date().toISOString(),
  };
  if (rowCount !== undefined) updates.row_count = rowCount;

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("report_runs")
      .update(updates)
      .eq("id", runId)
      .select("id, report_date, kind, status, row_count, sent_at, triggered_by_staff_id")
      .single(),
    "Report run could not be updated.",
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
