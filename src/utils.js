import { CSV_FIELDS } from "./data.js";

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function daysBetween(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  return Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 86400000),
  );
}

export function daysUntil(date) {
  if (!date) return null;
  return daysBetween(todayISO(), date);
}

export function isOpenDeficiency(item) {
  return item.status !== "Closed";
}

export function isOverdue(item) {
  return isOpenDeficiency(item) && item.dueDate && item.dueDate < todayISO();
}

export function getDashboardMetrics(deficiencies) {
  const open = deficiencies.filter(isOpenDeficiency);
  const closedDurations = deficiencies
    .filter((item) => item.status === "Closed")
    .map((item) => daysBetween(item.createdAt, item.closedAt))
    .filter((value) => typeof value === "number");

  return {
    openCount: open.length,
    overdueCount: deficiencies.filter(isOverdue).length,
    highRiskCount: open.filter((item) =>
      ["High", "Critical"].includes(item.riskLevel),
    ).length,
    repeatTrades: topCounts(open, "tradeCompany"),
    repeatHazards: topCounts(open, "hazardCategory"),
    averageCloseoutDays: closedDurations.length
      ? Math.round(
          closedDurations.reduce((total, value) => total + value, 0) /
            closedDurations.length,
        )
      : 0,
  };
}

export function topCounts(rows, field) {
  const counts = new Map();
  rows.forEach((row) => {
    const key = row[field] || "Unassigned";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);
}

export function toCsv(rows, fields) {
  const header = fields.join(",");
  const body = rows.map((row) =>
    fields.map((field) => escapeCsv(row[field] ?? "")).join(","),
  );
  return [header, ...body].join("\n");
}

function escapeCsv(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);

  const [headers = [], ...records] = rows;
  return records.map((record) =>
    headers.reduce((item, header, index) => {
      item[header.trim()] = record[index] ?? "";
      return item;
    }, {}),
  );
}

export function downloadCsv(filename, rows, fields) {
  downloadText(filename, toCsv(rows, fields), "text/csv;charset=utf-8");
}

export function downloadText(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function normalizeImportedRows(type, rows) {
  const fields = CSV_FIELDS[type];
  return rows.map((row) => {
    const normalized = { id: crypto.randomUUID() };
    fields.forEach((field) => {
      if (field === "id") return;
      normalized[field] = normalizeValue(row[field]);
    });
    return normalized;
  });
}

function normalizeValue(value) {
  const text = String(value ?? "").trim();
  if (["true", "yes", "y", "1"].includes(text.toLowerCase())) return true;
  if (["false", "no", "n", "0"].includes(text.toLowerCase())) return false;
  return text;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function openPrintableDocument(title, bodyHtml) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #16211f; margin: 32px; }
      h1 { font-size: 24px; margin: 0 0 12px; }
      h2 { font-size: 16px; margin: 22px 0 8px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #cfd8d5; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #edf2f0; }
      .meta { color: #53635f; margin-bottom: 20px; }
      .notice { border: 1px solid #d8c58a; background: #fff8df; padding: 10px; margin: 14px 0; }
      pre { white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.5; }
      @media print { button { display: none; } body { margin: 18mm; } }
    </style>
  </head>
  <body>
    <button onclick="window.print()">Print or Save PDF</button>
    ${bodyHtml}
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
}

export function csvFieldsFor(type) {
  return CSV_FIELDS[type];
}
