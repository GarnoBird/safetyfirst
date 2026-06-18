import { loginStaff, setStaffSessionCookie } from "../_lib/auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const body = await readJson(req);
    const staff = await loginStaff(body.username, body.password);
    setStaffSessionCookie(res, staff);
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
