import { requireStaff } from "../_lib/auth.js";
import { handleApiError, readJson, sendJson, sendMethodNotAllowed } from "../_lib/http.js";
import {
  getSettingsSystemStatus,
  getStaffSettings,
  updateStaffSettings,
} from "../_lib/settings.js";

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) {
    return sendMethodNotAllowed(res, ["GET", "PATCH"]);
  }

  try {
    const staff = await requireStaff(req);
    const settings =
      req.method === "PATCH"
        ? await updateStaffSettings(await readJson(req), staff.id)
        : await getStaffSettings(staff.id);

    return sendJson(res, 200, {
      settings,
      system: getSettingsSystemStatus(),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
