import { getRequiredEnv } from "./http.js";

let cachedToken = null;

export function hasOneDriveConfig() {
  return Boolean(
    process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.MS_DRIVE_ID &&
      process.env.MS_FORMS_FOLDER_ID,
  );
}

export async function uploadBufferToOneDrive({ buffer, filename, mimeType }) {
  if (!hasOneDriveConfig()) {
    const error = new Error("OneDrive backup is not configured.");
    error.statusCode = 503;
    error.exposeMessage = true;
    throw error;
  }

  const driveId = getRequiredEnv("MS_DRIVE_ID");
  const folderId = getRequiredEnv("MS_FORMS_FOLDER_ID");
  const safeFilename = sanitizeOneDriveFilename(filename);
  const encodedFilename = encodeURIComponent(safeFilename).replace(/%2F/gi, "/");
  const token = await getGraphAccessToken();
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(
      driveId,
    )}/items/${encodeURIComponent(folderId)}:/${encodedFilename}:/content`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": mimeType || "application/octet-stream",
      },
      body: buffer,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || "OneDrive upload failed.");
    error.statusCode = response.status;
    error.exposeMessage = true;
    throw error;
  }

  return {
    itemId: payload.id || "",
    itemName: payload.name || safeFilename,
    webUrl: payload.webUrl || "",
    path: safeFilename,
  };
}

export function buildOneDriveFilename({ submission, file }) {
  const date = submission.submitted_date_vancouver || "undated";
  const company = slugPart(submission.company || "company");
  const worker = slugPart(submission.worker_name || submission.worker_username || "worker");
  const formType = slugPart(submission.form_type || "form");
  const idPart = String(submission.id || "").slice(0, 8) || "submission";
  const original = file?.original_filename || "submission.json";
  const extension = extensionFor(original, file?.mime_type);
  return `${date}_${company}_${formType}_${worker}_${idPart}${extension}`;
}

function sanitizeOneDriveFilename(value) {
  return String(value || "submission")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function slugPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "item";
}

function extensionFor(filename, mimeType) {
  const match = String(filename || "").match(/\.[a-z0-9]{1,12}$/i);
  if (match) return match[0].toLowerCase();
  if (mimeType === "application/json") return ".json";
  if (mimeType === "application/pdf") return ".pdf";
  if (String(mimeType || "").startsWith("image/")) {
    return `.${String(mimeType).split("/")[1].replace("jpeg", "jpg")}`;
  }
  return "";
}

async function getGraphAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const tenantId = getRequiredEnv("MS_TENANT_ID");
  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      tenantId,
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getRequiredEnv("MS_CLIENT_ID"),
        client_secret: getRequiredEnv("MS_CLIENT_SECRET"),
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error_description || "Microsoft Graph login failed.");
    error.statusCode = response.status;
    error.exposeMessage = true;
    throw error;
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  return cachedToken.accessToken;
}
