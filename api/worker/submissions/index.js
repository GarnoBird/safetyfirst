import {
  createWorkerSubmission,
  listWorkerSubmissions,
} from "../../_lib/form-submissions.js";
import { requireWorker } from "../../_lib/worker-auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";

export default async function handler(req, res) {
  try {
    const worker = await requireWorker(req);

    if (req.method === "GET") {
      const rows = await listWorkerSubmissions(worker);
      return sendJson(res, 200, { rows });
    }

    if (req.method === "POST") {
      const submission = await createWorkerSubmission(worker, await readJson(req));
      return sendJson(res, 201, { submission });
    }

    return sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    return handleApiError(res, error);
  }
}
