import { getSupabaseServiceClient } from "./supabase.js";

const GENERIC_MIME_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
]);

export async function assertStoredObjectMatches({
  bucket,
  storagePath,
  allowedPrefix,
  expectedSizeBytes,
  maxSizeBytes,
  expectedMimeType,
}) {
  const path = String(storagePath || "").trim();
  if (!path || (allowedPrefix && !path.startsWith(allowedPrefix))) {
    throwBadRequest("Uploaded file path is not valid.");
  }

  const result = await getSupabaseServiceClient()
    .storage
    .from(bucket)
    .info(path);
  if (result.error || !result.data) {
    const error = new Error("Uploaded file was not found in storage.");
    error.statusCode = 400;
    error.exposeMessage = true;
    error.cause = result.error;
    throw error;
  }

  const actualSize = Number(result.data.size || result.data.metadata?.size || 0);
  const expectedSize = Number(expectedSizeBytes || 0);
  if (!Number.isFinite(actualSize) || actualSize < 1) {
    throwBadRequest("Uploaded file size could not be verified.");
  }
  if (maxSizeBytes && actualSize > maxSizeBytes) {
    throwBadRequest("Uploaded file is larger than the allowed size.");
  }
  if (expectedSize && actualSize !== expectedSize) {
    throwBadRequest("Uploaded file size does not match the submitted metadata.");
  }

  const actualMimeType = normalizeMimeType(
    result.data.contentType ||
    result.data.content_type ||
    result.data.metadata?.mimetype ||
    result.data.metadata?.mimeType ||
    result.data.metadata?.contentType,
  );
  const expectedMime = normalizeMimeType(expectedMimeType);
  if (
    expectedMime &&
    actualMimeType &&
    actualMimeType !== expectedMime &&
    !GENERIC_MIME_TYPES.has(actualMimeType)
  ) {
    throwBadRequest("Uploaded file type does not match the submitted metadata.");
  }

  return result.data;
}

function normalizeMimeType(value) {
  return String(value || "").trim().toLowerCase().split(";")[0];
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}
