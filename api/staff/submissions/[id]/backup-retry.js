import { requireStaff } from "../../../_lib/auth.js";
import { retrySubmissionBackup } from "../../../_lib/form-submissions.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    await requireStaff(req);
    const submission = await retrySubmissionBackup(req.query?.id);
    return sendJson(res, 200, { submission });
  } catch (error) {
    return handleApiError(res, error);
  }
}
