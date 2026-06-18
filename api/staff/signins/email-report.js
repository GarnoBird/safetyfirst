import { requireStaff } from "../../_lib/auth.js";
import { assertDateString, getVancouverDate } from "../../_lib/date.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";
import { sendSignInReportEmail } from "../../_lib/reports.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const staff = await requireStaff(req);
    const body = await readJson(req);
    const date = assertDateString(body.date || getVancouverDate());
    const result = await sendSignInReportEmail({
      date,
      recipientEmail: staff.email,
      kind: "manual",
      staffId: staff.id,
    });

    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
