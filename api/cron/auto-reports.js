import { processStaffAutoReports } from "../_lib/auto-reports.js";
import { assertCronAuthorized } from "../_lib/cron-auth.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    assertCronAuthorized(req);
    const result = await processStaffAutoReports();
    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
