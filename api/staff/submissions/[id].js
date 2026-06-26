import { requireStaff } from "../../_lib/auth.js";
import { getSubmissionById } from "../../_lib/form-submissions.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    await requireStaff(req);
    const submission = await getSubmissionById(req.query?.id, { includeDeleted: true });
    return sendJson(res, 200, { submission });
  } catch (error) {
    return handleApiError(res, error);
  }
}
