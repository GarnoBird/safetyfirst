import { assertCronAuthorized } from "../_lib/cron-auth.js";
import { runSubmissionMaintenance } from "../_lib/form-submissions.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    assertCronAuthorized(req);
    const result = await runSubmissionMaintenance();
    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
