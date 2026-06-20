import {
  handleApiError,
  parseQuery,
  readJson,
  sendJson,
  sendMethodNotAllowed,
} from "./_lib/http.js";
import {
  clearWorkerSignInCookie,
  getCurrentWorkerSignIn,
  getCurrentWorkerSignInsByIds,
  signOutCurrentWorker,
  signOutWorkerSignInsByIds,
} from "./_lib/signins.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "POST"]);
  }

  try {
    if (req.method === "GET") {
      const ids = parseQuery(req).get("ids");
      if (ids) {
        const signIns = await getCurrentWorkerSignInsByIds(ids);
        return sendJson(res, 200, { signIns });
      }

      const signIn = await getCurrentWorkerSignIn(req);
      return sendJson(res, 200, { signIn });
    }

    const body = await readJson(req);
    if (Array.isArray(body.signInIds) && body.signInIds.length) {
      const signIns = await signOutWorkerSignInsByIds(body.signInIds);
      clearWorkerSignInCookie(res);
      return sendJson(res, 200, { signIns, signIn: signIns[0] || null });
    }

    const signIn = await signOutCurrentWorker(req);
    clearWorkerSignInCookie(res);
    return sendJson(res, 200, { signIn });
  } catch (error) {
    return handleApiError(res, error);
  }
}
