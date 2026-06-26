import {
  clearWorkerSessionCookie,
  logoutWorker,
} from "../_lib/worker-auth.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    await logoutWorker(req);
    clearWorkerSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    clearWorkerSessionCookie(res);
    return handleApiError(res, error);
  }
}
