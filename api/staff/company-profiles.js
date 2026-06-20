import { requireStaff } from "../_lib/auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../_lib/http.js";
import { updateCompanyMappings } from "../_lib/trends.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return sendMethodNotAllowed(res, ["PATCH"]);

  try {
    const staff = await requireStaff(req);
    const body = await readJson(req);
    const mappings = await updateCompanyMappings(body.mappings, staff.id);
    return sendJson(res, 200, { mappings });
  } catch (error) {
    return handleApiError(res, error);
  }
}
