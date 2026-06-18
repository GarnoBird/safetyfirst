import { requireStaff } from "../../_lib/auth.js";
import { assertDateString, getVancouverDate } from "../../_lib/date.js";
import {
  handleApiError,
  parseQuery,
  sendJson,
  sendMethodNotAllowed,
} from "../../_lib/http.js";
import { GROUP_FIELDS, groupSignIns, listSignIns } from "../../_lib/signins.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendMethodNotAllowed(res, ["GET"]);

  try {
    await requireStaff(req);
    const query = parseQuery(req);
    const date = assertDateString(query.get("date") || getVancouverDate());
    const sort = query.get("sort") || "signed_in_at";
    const dir = query.get("dir") === "desc" ? "desc" : "asc";
    const group = GROUP_FIELDS.includes(query.get("group"))
      ? query.get("group")
      : "none";

    const rows = await listSignIns({ date, sort, dir });
    return sendJson(res, 200, {
      date,
      sort,
      dir,
      group,
      rows,
      groups: groupSignIns(rows, group),
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
