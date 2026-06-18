import { handleApiError, sendJson, sendMethodNotAllowed } from "./_lib/http.js";
import {
  clearWorkerSignInCookie,
  getCurrentWorkerSignIn,
  signOutCurrentWorker,
} from "./_lib/signins.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "POST"]);
  }

  try {
    if (req.method === "GET") {
      const signIn = await getCurrentWorkerSignIn(req);
      return sendJson(res, 200, { signIn });
    }

    const signIn = await signOutCurrentWorker(req);
    clearWorkerSignInCookie(res);
    return sendJson(res, 200, { signIn });
  } catch (error) {
    return handleApiError(res, error);
  }
}
