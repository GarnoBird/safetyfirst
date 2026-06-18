import { requireStaff } from "../../_lib/auth.js";
import { assertDateString, getVancouverDate } from "../../_lib/date.js";
import { handleApiError, parseQuery, sendMethodNotAllowed } from "../../_lib/http.js";
import { buildSignInReport } from "../../_lib/reports.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    await requireStaff(req);
    const query = parseQuery(req);
    const date = assertDateString(query.get("date") || getVancouverDate());
    const format = query.get("format") === "xml" ? "xml" : "csv";
    const report = await buildSignInReport(date);
    const body = report[format];

    res.statusCode = 200;
    res.setHeader(
      "content-type",
      format === "xml"
        ? "application/xml; charset=utf-8"
        : "text/csv; charset=utf-8",
    );
    res.setHeader(
      "content-disposition",
      `attachment; filename="worker-sign-ins-${date}.${format}"`,
    );
    return res.end(body);
  } catch (error) {
    return handleApiError(res, error);
  }
}
