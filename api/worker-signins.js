import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "./_lib/http.js";
import { createWorkerSignIn } from "./_lib/signins.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return sendMethodNotAllowed(res, ["POST"]);

  try {
    const signIn = await createWorkerSignIn(await readJson(req));
    return sendJson(res, 201, { signIn });
  } catch (error) {
    return handleApiError(res, error);
  }
}
