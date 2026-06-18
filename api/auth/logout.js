import { clearStaffSessionCookie } from "../_lib/auth.js";
import { sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);
  clearStaffSessionCookie(res);
  return sendJson(res, 200, { ok: true });
}
