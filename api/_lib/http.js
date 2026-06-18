export function sendJson(res, statusCode, payload, headers = {}) {
  res.statusCode = statusCode;
  Object.entries({
    "content-type": "application/json; charset=utf-8",
    ...headers,
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

export function sendMethodNotAllowed(res, methods) {
  res.setHeader("allow", methods.join(", "));
  sendJson(res, 405, { error: "Method not allowed" });
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return parseJson(req.body || "{}");

  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  return body ? parseJson(body) : {};
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

export function parseQuery(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  return url.searchParams;
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

export function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) segments.push(`Max-Age=${options.maxAge}`);
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
}

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing environment variable: ${name}`);
    error.statusCode = 503;
    throw error;
  }
  return value;
}

export function handleApiError(res, error) {
  const statusCode = error.statusCode || 500;
  const message =
    statusCode >= 500 && !error.exposeMessage
      ? "The server could not complete the request."
      : error.message;
  sendJson(res, statusCode, { error: message });
}
