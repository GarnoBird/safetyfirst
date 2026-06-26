import { deleteWorkerSubmission } from "../../_lib/form-submissions.js";
import { requireWorker } from "../../_lib/worker-auth.js";
import { handleApiError, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return sendMethodNotAllowed(res, ["DELETE"]);

  try {
    const worker = await requireWorker(req);
    const result = await deleteWorkerSubmission(worker, req.query?.id);
    return sendJson(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}
