import {
  loginWorker,
  setWorkerSessionCookie,
} from "../_lib/worker-auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const body = await readJson(req);
    const result = await loginWorker(body.identifier, body.password, body.rememberMe);
    setWorkerSessionCookie(res, result.sessionToken, body.rememberMe);
    return sendJson(res, 200, { worker: result.worker });
  } catch (error) {
    return handleApiError(res, error);
  }
}
