#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const SALUS_API_BASE = "https://api.prd.salussafety.io";
const SALUS_GUARDIAN_BASE = "https://guardian.salussafety.io";
const SALUS_PORTAL_BASE = "https://portal.salussafety.io";
const SALUS_CLIENT_ID = "3a5d2313fc617f75";
const SALUS_API_KEY = "HbmM0pkhSO8TQx6XfI3QV4MBOlGBvt9Y94E8tCoR";
const CERTIFICATE_BUCKET = "safety-form-submissions";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);
const MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
  [".pdf", "application/pdf"],
]);
const EXTENSION_BY_MIME = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/heic", ".heic"],
  ["image/heif", ".heif"],
  ["application/pdf", ".pdf"],
]);

const CERTIFICATE_SELECT =
  "id, worker_name, certificate_type_name, certificate_provider_name, issue_date, expiry_date, source, source_external_id, imported_at";
const FILE_SELECT =
  "id, certificate_id, bucket, storage_path, original_filename, mime_type, size_bytes, app_deleted_at, source, source_external_id";

main().catch((error) => {
  console.error(`Salus certificate import failed: ${redactError(error)}`);
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const commit = Boolean(args.commit);
  if (commit && args.dryRun) {
    throw new Error("Use either --dry-run or --commit, not both.");
  }

  const supabase = createSupabaseClient(args);
  const auth = await resolveSalusAuth(args);
  const companyId = await resolveCompanyId(auth, args);
  auth.companyId = companyId;
  if (!auth.permissionToken && !args.skipPermissionToken) {
    auth.permissionToken = await loadSalusPermissionToken(auth, args).catch((error) => {
      console.warn(`Could not load Salus permission token; continuing without it: ${error.message}`);
      return "";
    });
  }

  const report = createReport({ commit, companyId });
  const optionCache = await loadOptionCache(supabase);
  const summaries = await listSalusCertificates(auth, args);
  report.salusTotal = summaries.total;
  report.salusFetched = summaries.rows.length;

  for (const [index, summary] of summaries.rows.entries()) {
    await processSalusCertificate({
      args,
      auth,
      commit,
      index,
      optionCache,
      report,
      summary,
      supabase,
    });
  }

  printReport(report);
  if (!commit) {
    console.log("\nDry run only. Re-run with --commit to copy media and write rows.");
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--commit") {
      args.commit = true;
    } else if (token === "--auth-from-chrome") {
      args.authFromChrome = true;
    } else if (token === "--skip-media-download") {
      args.skipMediaDownload = true;
    } else if (token === "--skip-permission-token") {
      args.skipPermissionToken = true;
    } else if (token.startsWith("--")) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${token}`);
      }
      args[key] = next;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }
  args.dryRun = !args.commit;
  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/import-salus-certificates.js --dry-run [auth options]
  node scripts/import-salus-certificates.js --commit [auth options]

Required Safety First env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Salus auth options:
  --salus-access-token <token>       Existing Salus API access token.
  --salus-refresh-token <token>      Salus OAuth refresh token; script refreshes access token.
  --auth-from-chrome                 Read salus_refresh_token from active Chrome tab via Apple Events.
  --salus-company-id <id>            Optional override when token does not include company.
  --salus-permission-token <token>   Optional x-api-permission value.

Other options:
  --skip-media-download              Dry-run without downloading media bytes.
  --skip-permission-token            Do not request x-api-permission.
`);
}

function createSupabaseClient(args) {
  const url = cleanEnv(args.supabaseUrl || process.env.SUPABASE_URL);
  const key = cleanEnv(args.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function resolveSalusAuth(args) {
  let accessToken = cleanEnv(args.salusAccessToken || process.env.SALUS_ACCESS_TOKEN);
  let refreshToken = cleanEnv(args.salusRefreshToken || process.env.SALUS_REFRESH_TOKEN);
  const permissionToken = cleanEnv(args.salusPermissionToken || process.env.SALUS_PERMISSION_TOKEN);
  const readRefreshTokenFromChrome = !accessToken && !refreshToken && args.authFromChrome;

  if (readRefreshTokenFromChrome) {
    refreshToken = readSalusRefreshTokenFromChrome();
  }
  if (!accessToken && refreshToken) {
    const refreshed = await refreshSalusAccessToken(refreshToken, args.salusCompanyId);
    accessToken = refreshed.accessToken;
    if (readRefreshTokenFromChrome && refreshed.refreshToken && refreshed.refreshToken !== refreshToken) {
      writeSalusRefreshTokenToChrome(refreshed.refreshToken);
    }
    refreshToken = refreshed.refreshToken || refreshToken;
  }
  if (!accessToken) {
    throw new Error(
      "Salus auth is required. Provide SALUS_ACCESS_TOKEN, SALUS_REFRESH_TOKEN, or use --auth-from-chrome after enabling Chrome's View > Developer > Allow JavaScript from Apple Events.",
    );
  }
  return {
    accessToken,
    refreshToken,
    permissionToken,
  };
}

function readSalusRefreshTokenFromChrome() {
  const script = `(() => {
    const raw = localStorage.getItem("salus_refresh_token");
    return JSON.stringify({
      href: location.href,
      hasRefreshToken: Boolean(raw),
      refreshToken: raw ? JSON.parse(raw) : null
    });
  })()`;
  try {
    const output = execFileSync("osascript", [
      "-e",
      chromeSalusTabScript(script),
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const parsed = JSON.parse(output || "{}");
    if (!String(parsed.href || "").includes("portal.salussafety.io")) {
      throw new Error("The active Chrome tab is not the Salus portal.");
    }
    if (!parsed.hasRefreshToken || !parsed.refreshToken) {
      throw new Error("The active Salus tab did not expose salus_refresh_token.");
    }
    return String(parsed.refreshToken);
  } catch (error) {
    const message = String(error.stderr || error.message || error);
    if (/JavaScript through AppleScript is turned off/i.test(message)) {
      throw new Error(
        "Chrome has JavaScript from Apple Events turned off. In Chrome, enable View > Developer > Allow JavaScript from Apple Events, then rerun with --auth-from-chrome.",
      );
    }
    throw new Error(`Could not read Salus auth from Chrome: ${message}`);
  }
}

function writeSalusRefreshTokenToChrome(refreshToken) {
  const storedValue = JSON.stringify(refreshToken);
  const script = `(() => {
    localStorage.setItem("salus_refresh_token", ${JSON.stringify(storedValue)});
    return JSON.stringify({ href: location.href, updated: true });
  })()`;
  try {
    const output = execFileSync("osascript", [
      "-e",
      chromeSalusTabScript(script),
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    const parsed = JSON.parse(output || "{}");
    if (!parsed.updated) throw new Error("Salus tab did not confirm refresh token update.");
  } catch (error) {
    const message = String(error.stderr || error.message || error);
    console.warn(`Could not update Salus refresh token in Chrome: ${redactSecretText(message)}`);
  }
}

function chromeSalusTabScript(script) {
  return `
    tell application "Google Chrome"
      repeat with browserWindow in windows
        repeat with browserTab in tabs of browserWindow
          if (URL of browserTab as text) contains "portal.salussafety.io" then
            tell browserTab
              set salusAuthResult to execute javascript ${JSON.stringify(script)}
            end tell
            return salusAuthResult
          end if
        end repeat
      end repeat
      return ""
    end tell
  `;
}

async function refreshSalusAccessToken(refreshToken, companyId) {
  const body = {
    client_id: SALUS_CLIENT_ID,
    grant_type: "refresh_token",
    redirect_uri: `${SALUS_PORTAL_BASE}/oauth/callback`,
    refresh_token: refreshToken,
    salus_identity: true,
    scope: "idtoken email",
  };
  if (companyId) body.refresh_company = companyId;

  const response = await fetch(`${SALUS_GUARDIAN_BASE}/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Salus token refresh failed with HTTP ${response.status}: ${await safeResponseText(response)}`);
  }
  const data = await response.json();
  if (!data.access_token) throw new Error("Salus token refresh response did not include access_token.");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
  };
}

async function resolveCompanyId(auth, args) {
  const explicit = cleanEnv(args.salusCompanyId || process.env.SALUS_COMPANY_ID);
  if (explicit) return explicit;
  const decodedCompany = decodeSalusCompanyId(auth.accessToken);
  if (decodedCompany) return decodedCompany;

  const response = await salusFetchJson("/companyUser/user/companies", auth, args);
  const companies = response?.data || response?.data?.data || response;
  const rows = Array.isArray(companies) ? companies : Array.isArray(companies?.data) ? companies.data : [];
  if (rows.length === 1) return String(rows[0]?.company?.id || rows[0]?.company || rows[0]?.id || "");
  throw new Error("Could not determine Salus company id; pass --salus-company-id.");
}

function decodeSalusCompanyId(accessToken) {
  try {
    const payload = decodeJwt(accessToken);
    return payload?.["sls:idn"]?.company ? String(payload["sls:idn"].company) : "";
  } catch {
    return "";
  }
}

async function loadSalusPermissionToken(auth, args) {
  const response = await salusFetchJson("/companyUser/permission/token", auth, args);
  return String(response?.data?.data || response?.data || "");
}

async function listSalusCertificates(auth, args) {
  const rowsPerPage = Number(args.rowsPerPage || 100);
  let page = 1;
  let total = 0;
  const rows = [];

  while (page < 50) {
    const payload = {
      certificateType: [],
      company: auth.companyId,
      conditional: null,
      descending: false,
      end: null,
      page,
      provider: [],
      rowsPerPage,
      site: null,
      sortBy: "name",
      start: null,
      status: ["certified"],
      worker: null,
    };
    const response = await salusFetchJson("/CompanyUserCertification/search", auth, args, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const body = response?.data || {};
    const certifications = body.certifications || body.data?.certifications || [];
    total = Number.parseInt(body.total || body.data?.total || total || certifications.length, 10) || certifications.length;
    rows.push(...certifications);
    if (rows.length >= total || certifications.length === 0) break;
    page += 1;
  }

  return { rows, total };
}

async function processSalusCertificate({
  args,
  auth,
  commit,
  index,
  optionCache,
  report,
  summary,
  supabase,
}) {
  const externalId = getSalusCertificateId(summary);
  if (!externalId) {
    report.blocked.push({
      row: index + 1,
      reason: "Salus row did not include a certificate id.",
      summary: summarizeForReport(summary),
    });
    return;
  }

  try {
    const detailResponse = await salusFetchJson(`/certification/${encodeURIComponent(externalId)}`, auth, args);
    const detail = detailResponse?.data?.data || detailResponse?.data || detailResponse;
    const mapped = mapSalusCertificate({ detail, externalId, summary });
    if (!mapped.workerName || !mapped.typeName) {
      report.blocked.push({
        externalId,
        reason: "Missing worker name or certificate type.",
        summary: summarizeForReport(summary),
      });
      return;
    }

    const media = args.skipMediaDownload
      ? mapExpectedMedia(detail, externalId)
      : await downloadCertificateMedia({ args, auth, detail, externalId });

    const existing = await findExistingCertificate(supabase, mapped);
    mapped.typeId = await ensureOption({
      cache: optionCache.types,
      commit,
      name: mapped.typeName,
      report,
      supabase,
      table: "certificate_types",
    });
    mapped.providerId = await ensureOption({
      cache: optionCache.providers,
      commit,
      name: mapped.providerName,
      report,
      supabase,
      table: "certificate_providers",
    });

    const plannedAction = existing?.source === "salus"
      ? "update_existing_salus"
      : existing
        ? "link_exact_local_duplicate"
        : "insert_new";

    report.importable += 1;
    report.mediaExpected += media.length;
    if (plannedAction === "update_existing_salus") report.existingSalus += 1;
    if (plannedAction === "link_exact_local_duplicate") report.linkedDuplicates += 1;
    if (plannedAction === "insert_new") report.newCertificates += 1;
    maybePushSample(report.samples, {
      action: plannedAction,
      salusId: externalId,
      workerName: mapped.workerName,
      typeName: mapped.typeName,
      providerName: mapped.providerName,
      issueDate: mapped.issueDate,
      expiryDate: mapped.expiryDate,
      files: media.map((file) => file.originalFilename),
    });

    if (!commit) return;

    const certificateId = existing?.id || crypto.randomUUID();
    const uploadedFiles = await uploadMediaCopies({
      certificateId,
      externalId,
      media,
      report,
      supabase,
    });
    const saved = await saveCertificate({
      certificateId,
      existing,
      mapped,
      supabase,
    });
    await saveCertificateFiles({
      certificateId: saved.id,
      externalId,
      files: uploadedFiles,
      supabase,
    });
    report.committed += 1;
  } catch (error) {
    report.blocked.push({
      externalId,
      reason: redactError(error),
      summary: summarizeForReport(summary),
    });
  }
}

function mapSalusCertificate({ detail, externalId, summary }) {
  const firstName = firstNonEmpty(detail.first_name, detail.firstName, summary.first_name, summary.firstName);
  const lastName = firstNonEmpty(detail.last_name, detail.lastName, summary.last_name, summary.lastName);
  const workerName = cleanSpaces(
    firstNonEmpty(
      detail.name,
      detail.worker_name,
      detail.workerName,
      detail.user?.name,
      `${firstName || ""} ${lastName || ""}`,
      summary.name,
      summary.worker_name,
      summary.workerName,
    ),
  );
  const typeName = cleanSpaces(
    firstNonEmpty(
      detail.company_certification_name,
      detail.companyCertificationName,
      detail.certification_name,
      detail.certificationName,
      detail.company_certification?.name,
      detail.companyCertification?.name,
      detail.certification?.name,
      summary.company_certification_name,
      summary.companyCertificationName,
      summary.certification_name,
      summary.certificationName,
      summary.company_certification?.name,
      summary.companyCertification?.name,
      summary.certification?.name,
    ),
  );
  const salusProviderName = cleanSpaces(
    firstNonEmpty(
      detail.provider_name,
      detail.providerName,
      detail.provider?.name,
      summary.provider_name,
      summary.providerName,
      summary.provider?.name,
    ),
  );

  return {
    externalId: String(externalId),
    workerName,
    typeName,
    providerName: salusProviderName || "Other",
    salusProviderName,
    issueDate: normalizeDate(firstNonEmpty(detail.issue_date, detail.issueDate, summary.issue_date, summary.issueDate)),
    expiryDate: normalizeDate(firstNonEmpty(detail.expiry_date, detail.expiryDate, summary.expiry_date, summary.expiryDate)),
    sourceMetadata: {
      salusId: String(externalId),
      salusProviderName,
      salusUrls: {
        front: detail.url || null,
        back: detail.url_back || detail.urlBack || null,
      },
      salusSummary: summary,
      salusDetail: detail,
      importedBy: "scripts/import-salus-certificates.js",
    },
  };
}

async function downloadCertificateMedia({ args, auth, detail, externalId }) {
  const expected = mapExpectedMedia(detail, externalId);
  const files = [];
  for (const media of expected) {
    files.push(await downloadSalusMedia({ args, auth, media }));
  }
  return files;
}

function mapExpectedMedia(detail, externalId) {
  return [
    { side: "front", url: detail.url },
    { side: "back", url: detail.url_back || detail.urlBack },
  ]
    .filter((item) => cleanString(item.url))
    .map((item) => ({
      ...item,
      externalId: `${externalId}:${item.side}`,
      originalFilename: filenameFromUrl(item.url, `${item.side}-${externalId}`),
    }));
}

async function downloadSalusMedia({ args, auth, media }) {
  const initialUrl = new URL(media.url, SALUS_API_BASE);
  let downloadUrl = initialUrl;
  let authenticatedDownload = initialUrl.origin === SALUS_API_BASE;
  const initialExtension = fileExtension(initialUrl.pathname);
  let originalFilename = media.originalFilename;

  if (IMAGE_EXTENSIONS.has(initialExtension)) {
    downloadUrl.searchParams.set("download", "true");
  } else {
    const signedUrl = new URL(media.url, SALUS_API_BASE);
    signedUrl.searchParams.set("signed", "true");
    signedUrl.searchParams.set("filename", originalFilename);
    signedUrl.searchParams.set("disposition", "attachment");
    const signed = await salusFetchJson(signedUrl.pathname + signedUrl.search, auth, args);
    const signedData = signed?.data?.data || signed?.data || signed;
    downloadUrl = buildSignedDownloadUrl(signedData);
    authenticatedDownload = false;
  }

  const response = await fetch(downloadUrl, {
    headers: authenticatedDownload ? salusHeaders(auth, args) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${media.side} media download failed with HTTP ${response.status}: ${await safeResponseText(response)}`);
  }

  const sizeFromHeader = Number(response.headers.get("content-length") || 0);
  if (sizeFromHeader > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${media.side} media is larger than 50 MiB.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${media.side} media is larger than 50 MiB.`);
  }

  const contentType = cleanMimeType(response.headers.get("content-type"));
  originalFilename = filenameFromDisposition(response.headers.get("content-disposition")) || originalFilename;
  originalFilename = ensureAllowedFilename(originalFilename, contentType, media.side);
  const extension = fileExtension(originalFilename);
  const mimeType = MIME_BY_EXTENSION.get(extension) || contentType || "application/octet-stream";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`${media.side} media type is not allowed: ${originalFilename || contentType || "unknown"}.`);
  }

  return {
    ...media,
    buffer,
    mimeType,
    originalFilename,
    sizeBytes: buffer.byteLength,
    sourceMetadata: {
      salusUrl: media.url,
      salusSide: media.side,
      copiedFrom: downloadUrl.origin === SALUS_API_BASE ? `${downloadUrl.pathname}${downloadUrl.search}` : downloadUrl.origin,
      contentType,
    },
  };
}

function buildSignedDownloadUrl(signedData) {
  if (typeof signedData === "string") return new URL(signedData);
  if (!signedData?.url) throw new Error("Salus signed media response did not include a URL.");
  const url = new URL(signedData.url);
  if (typeof signedData.params === "string" && signedData.params) {
    const query = signedData.params.startsWith("?") ? signedData.params.slice(1) : signedData.params;
    for (const [key, value] of new URLSearchParams(query)) url.searchParams.set(key, value);
  } else if (signedData.params && typeof signedData.params === "object") {
    for (const [key, value] of Object.entries(signedData.params)) url.searchParams.set(key, value);
  }
  return url;
}

async function uploadMediaCopies({ certificateId, externalId, media, report, supabase }) {
  const uploaded = [];
  for (const file of media) {
    const sourceExternalId = `${externalId}:${file.side}`;
    const existing = await findExistingFile(supabase, sourceExternalId);
    if (existing && !existing.app_deleted_at) {
      report.mediaAlreadyCopied += 1;
      uploaded.push({
        ...file,
        id: existing.id,
        storagePath: existing.storage_path,
        sourceExternalId,
      });
      continue;
    }

    const storagePath = `certificates/${certificateId}/salus/${file.side}-${sanitizeStoragePathSegment(externalId)}-${sanitizeStorageFilename(file.originalFilename)}`;
    const result = await supabase.storage.from(CERTIFICATE_BUCKET).upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: true,
    });
    throwIfSupabaseError(result, `Could not upload ${file.side} media.`);
    report.mediaCopied += 1;
    uploaded.push({
      ...file,
      storagePath,
      sourceExternalId,
    });
  }
  return uploaded;
}

async function saveCertificate({ certificateId, existing, mapped, supabase }) {
  const now = new Date().toISOString();
  const payload = {
    worker_name: mapped.workerName,
    certificate_type_id: mapped.typeId,
    certificate_type_name: mapped.typeName,
    certificate_provider_id: mapped.providerId,
    certificate_provider_name: mapped.providerName,
    issue_date: mapped.issueDate,
    expiry_date: mapped.expiryDate,
    status: "approved",
    source: "salus",
    source_external_id: mapped.externalId,
    source_metadata: mapped.sourceMetadata,
    imported_at: now,
    updated_at: now,
  };

  if (existing) {
    return throwIfSupabaseError(
      await supabase
        .from("certificates")
        .update(payload)
        .eq("id", existing.id)
        .select(CERTIFICATE_SELECT)
        .single(),
      "Could not update certificate.",
    );
  }

  return throwIfSupabaseError(
    await supabase
      .from("certificates")
      .insert({
        id: certificateId,
        ...payload,
        created_at: now,
      })
      .select(CERTIFICATE_SELECT)
      .single(),
    "Could not insert certificate.",
  );
}

async function saveCertificateFiles({ certificateId, externalId, files, supabase }) {
  for (const file of files) {
    const now = new Date().toISOString();
    const payload = {
      certificate_id: certificateId,
      bucket: CERTIFICATE_BUCKET,
      storage_path: file.storagePath,
      original_filename: file.originalFilename,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      source: "salus",
      source_external_id: file.sourceExternalId || `${externalId}:${file.side}`,
      source_metadata: file.sourceMetadata || {},
      imported_at: now,
    };
    const existing = await findExistingFile(supabase, payload.source_external_id);
    if (existing) {
      throwIfSupabaseError(
        await supabase
          .from("certificate_files")
          .update(payload)
          .eq("id", existing.id)
          .select(FILE_SELECT)
          .single(),
        "Could not update certificate file.",
      );
    } else {
      throwIfSupabaseError(
        await supabase
          .from("certificate_files")
          .insert(payload)
          .select(FILE_SELECT)
          .single(),
        "Could not insert certificate file.",
      );
    }
  }
}

async function findExistingCertificate(supabase, mapped) {
  const existingSalus = throwIfSupabaseError(
    await supabase
      .from("certificates")
      .select(CERTIFICATE_SELECT)
      .eq("source", "salus")
      .eq("source_external_id", mapped.externalId)
      .maybeSingle(),
    "Could not check existing Salus certificate.",
  );
  if (existingSalus) return existingSalus;

  let query = supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .eq("worker_name", mapped.workerName)
    .eq("certificate_type_name", mapped.typeName)
    .eq("certificate_provider_name", mapped.providerName)
    .eq("status", "approved")
    .is("source_external_id", null);

  query = mapped.issueDate ? query.eq("issue_date", mapped.issueDate) : query.is("issue_date", null);
  query = mapped.expiryDate ? query.eq("expiry_date", mapped.expiryDate) : query.is("expiry_date", null);

  return throwIfSupabaseError(
    await query.limit(1).maybeSingle(),
    "Could not check local duplicate certificate.",
  );
}

async function findExistingFile(supabase, sourceExternalId) {
  return throwIfSupabaseError(
    await supabase
      .from("certificate_files")
      .select(FILE_SELECT)
      .eq("source", "salus")
      .eq("source_external_id", sourceExternalId)
      .maybeSingle(),
    "Could not check existing certificate file.",
  );
}

async function loadOptionCache(supabase) {
  const [types, providers] = await Promise.all([
    loadOptions(supabase, "certificate_types"),
    loadOptions(supabase, "certificate_providers"),
  ]);
  return { types, providers };
}

async function loadOptions(supabase, table) {
  const rows = throwIfSupabaseError(
    await supabase.from(table).select("id, slug, name, archived_at").order("name", { ascending: true }),
    `Could not load ${table}.`,
  );
  const byName = new Map();
  const bySlug = new Map();
  for (const row of rows) {
    byName.set(canonicalOptionName(row.name), row);
    bySlug.set(row.slug, row);
  }
  return { byName, bySlug };
}

async function ensureOption({ cache, commit, name, report, supabase, table }) {
  const cleanedName = cleanSpaces(name) || "Other";
  const canonical = canonicalOptionName(cleanedName);
  const existing = cache.byName.get(canonical);
  if (existing) return existing.id;

  report.missingOptions.add(`${table}:${cleanedName}`);
  if (!commit) return null;

  const baseSlug = slugify(cleanedName);
  let slug = baseSlug;
  let suffix = 2;
  while (cache.bySlug.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const payload = {
    slug,
    name: cleanedName,
    source: "salus_import",
    source_metadata: {
      source: "Salus approved certificate import",
      imported_at: new Date().toISOString(),
    },
    archived_at: null,
  };
  const row = throwIfSupabaseError(
    await supabase.from(table).insert(payload).select("id, slug, name, archived_at").single(),
    `Could not create ${table} option ${cleanedName}.`,
  );
  cache.byName.set(canonical, row);
  cache.bySlug.set(slug, row);
  return row.id;
}

async function salusFetchJson(path, auth, args, options = {}) {
  const url = path.startsWith("http") ? path : `${SALUS_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...salusHeaders(auth, args),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Salus API ${path} failed with HTTP ${response.status}: ${await safeResponseText(response)}`);
  }
  return response.json();
}

function salusHeaders(auth, args) {
  return {
    Accept: "application/json",
    "Accept-Language": "en-US",
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.accessToken}`,
    "x-api-key": cleanEnv(args.salusApiKey || process.env.SALUS_API_KEY) || SALUS_API_KEY,
    ...(auth.permissionToken ? { "x-api-permission": auth.permissionToken } : {}),
  };
}

function createReport({ commit, companyId }) {
  return {
    commit,
    companyId,
    salusTotal: 0,
    salusFetched: 0,
    importable: 0,
    existingSalus: 0,
    linkedDuplicates: 0,
    newCertificates: 0,
    committed: 0,
    mediaExpected: 0,
    mediaCopied: 0,
    mediaAlreadyCopied: 0,
    missingOptions: new Set(),
    blocked: [],
    samples: [],
  };
}

function printReport(report) {
  const output = {
    mode: report.commit ? "commit" : "dry-run",
    salusCompanyId: report.companyId,
    salusTotal: report.salusTotal,
    salusFetched: report.salusFetched,
    importable: report.importable,
    existingSalusUpserts: report.existingSalus,
    exactLocalDuplicatesToLink: report.linkedDuplicates,
    newCertificates: report.newCertificates,
    committed: report.committed,
    mediaExpected: report.mediaExpected,
    mediaCopied: report.mediaCopied,
    mediaAlreadyCopied: report.mediaAlreadyCopied,
    missingOptions: Array.from(report.missingOptions).sort(),
    blockedCount: report.blocked.length,
    blocked: report.blocked,
    samples: report.samples,
  };
  console.log(JSON.stringify(output, null, 2));
}

function maybePushSample(samples, sample) {
  if (samples.length < 8) samples.push(sample);
}

function getSalusCertificateId(row) {
  return cleanString(
    firstNonEmpty(
      row.id,
      row.certification_id,
      row.certificationId,
      row.company_user_certification_id,
      row.companyUserCertificationId,
      row.certification?.id,
    ),
  );
}

function summarizeForReport(row) {
  return {
    id: getSalusCertificateId(row) || null,
    name: cleanSpaces(firstNonEmpty(row.name, `${row.first_name || ""} ${row.last_name || ""}`)),
    type: cleanSpaces(firstNonEmpty(row.company_certification_name, row.certification_name, row.company_certification?.name)),
    provider: cleanSpaces(firstNonEmpty(row.provider_name, row.provider?.name)),
    issueDate: normalizeDate(firstNonEmpty(row.issue_date, row.issueDate)),
    expiryDate: normalizeDate(firstNonEmpty(row.expiry_date, row.expiryDate)),
  };
}

function throwIfSupabaseError(result, message) {
  if (result.error) {
    const error = new Error(`${message} ${result.error.message || ""}`.trim());
    error.cause = result.error;
    throw error;
  }
  return result.data;
}

async function safeResponseText(response) {
  try {
    return redactSecretText((await response.text()).slice(0, 500));
  } catch {
    return "";
  }
}

function redactError(error) {
  return redactSecretText(String(error?.message || error));
}

function redactSecretText(value) {
  return String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer <redacted>")
    .replace(/(access_token|refresh_token|token|Authorization)(['"=: ]+)[A-Za-z0-9._-]{20,}/gi, "$1$2<redacted>")
    .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "<jwt:redacted>");
}

function decodeJwt(token) {
  const payload = String(token).split(".")[1];
  if (!payload) return {};
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

function firstNonEmpty(...values) {
  return values.find((value) => cleanString(value)) || "";
}

function cleanEnv(value) {
  const cleaned = cleanString(value);
  if (!cleaned || cleaned === "\"\"" || cleaned === "''") return "";
  return cleaned.replace(/^['"]|['"]$/g, "");
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function cleanSpaces(value) {
  return cleanString(value).replace(/\s+/g, " ");
}

function canonicalOptionName(value) {
  return cleanSpaces(value).toLowerCase();
}

function normalizeDate(value) {
  const date = cleanString(value);
  if (!date) return null;
  const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function slugify(value) {
  return cleanSpaces(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-") || crypto.randomBytes(8).toString("hex");
}

function fileExtension(value) {
  const pathname = cleanString(value).toLowerCase().split("?")[0].split("#")[0];
  const index = pathname.lastIndexOf(".");
  if (index <= 0 || index === pathname.length - 1) return "";
  return pathname.slice(index);
}

function cleanMimeType(value) {
  return cleanString(value).toLowerCase().split(";")[0];
}

function filenameFromUrl(value, fallback) {
  try {
    const url = new URL(value, SALUS_API_BASE);
    const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    return sanitizeStorageFilename(last || `${fallback}.pdf`);
  } catch {
    return sanitizeStorageFilename(`${fallback}.pdf`);
  }
}

function filenameFromDisposition(value) {
  const disposition = cleanString(value);
  if (!disposition) return "";
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch) return sanitizeStorageFilename(decodeURIComponent(utfMatch[1]));
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? sanitizeStorageFilename(match[1]) : "";
}

function ensureAllowedFilename(filename, contentType, side) {
  let name = sanitizeStorageFilename(filename || `${side}-certificate`);
  let extension = fileExtension(name);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    const mimeExtension = EXTENSION_BY_MIME.get(contentType);
    if (mimeExtension) {
      name = `${name.replace(/\.[^.]+$/, "")}${mimeExtension}`;
      extension = mimeExtension;
    }
  }
  return name;
}

function sanitizeStorageFilename(value) {
  return cleanString(value || "certificate")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function sanitizeStoragePathSegment(value) {
  return cleanString(value || "salus")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || crypto.randomBytes(8).toString("hex");
}
