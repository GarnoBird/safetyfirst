import { createFileUploadTarget } from "../../_lib/form-submissions.js";
import { requireWorker } from "../../_lib/worker-auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const worker = await requireWorker(req);
    const upload = await createFileUploadTarget(worker, await readJson(req));
    return sendJson(res, 200, { upload });
  } catch (error) {
    return handleApiError(res, error);
  }
}
