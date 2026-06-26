import { requireStaff } from "../../_lib/auth.js";
import { listStaffSubmissions } from "../../_lib/form-submissions.js";
import { handleApiError, parseQuery, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    await requireStaff(req);
    const payload = await listStaffSubmissions(parseQuery(req));
    return sendJson(res, 200, payload);
  } catch (error) {
    return handleApiError(res, error);
  }
}
