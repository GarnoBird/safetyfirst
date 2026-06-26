import { getWorkerFromRequest } from "../_lib/worker-auth.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    const worker = await getWorkerFromRequest(req);
    if (!worker) return sendJson(res, 401, { worker: null });
    return sendJson(res, 200, { worker });
  } catch (error) {
    return handleApiError(res, error);
  }
}
