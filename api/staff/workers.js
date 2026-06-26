import { requireStaff } from "../_lib/auth.js";
import {
  createWorkerProfile,
  listWorkerProfiles,
  updateWorkerProfile,
} from "../_lib/worker-auth.js";
import {
  handleApiError,
  parseQuery,
  readJson,
  sendJson,
  sendMethodNotAllowed,
} from "../_lib/http.js";

export default async function handler(req, res) {
  try {
    const staff = await requireStaff(req);

    if (req.method === "GET") {
      const query = parseQuery(req);
      const rows = await listWorkerProfiles({
        search: query.get("search") || "",
        company: query.get("company") || "",
        active: query.get("active") || "all",
      });
      return sendJson(res, 200, { rows });
    }

    if (req.method === "POST") {
      const worker = await createWorkerProfile(await readJson(req), staff.id);
      return sendJson(res, 201, { worker });
    }

    if (req.method === "PATCH") {
      const worker = await updateWorkerProfile(await readJson(req), staff.id);
      return sendJson(res, 200, { worker });
    }

    return sendMethodNotAllowed(res, ["GET", "POST", "PATCH"]);
  } catch (error) {
    return handleApiError(res, error);
  }
}
