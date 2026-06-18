import { getStaffFromRequest } from "../_lib/auth.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    const staff = await getStaffFromRequest(req);
    if (!staff) return sendJson(res, 401, { staff: null });
    return sendJson(res, 200, {
      staff: {
        username: staff.username,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
