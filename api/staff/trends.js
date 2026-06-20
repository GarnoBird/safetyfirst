import { requireStaff } from "../_lib/auth.js";
import { buildStaffTrends } from "../_lib/trends.js";
import {
  handleApiError,
  parseQuery,
  sendJson,
  sendMethodNotAllowed,
} from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    await requireStaff(req);
    const trends = await buildStaffTrends(parseQuery(req));
    return sendJson(res, 200, trends);
  } catch (error) {
    return handleApiError(res, error);
  }
}
