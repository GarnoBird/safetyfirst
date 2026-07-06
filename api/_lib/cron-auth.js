export function assertCronAuthorized(req) {
  const acceptedSecrets = [
    process.env.SUPABASE_CRON_SECRET,
    process.env.CRON_SECRET,
  ].filter(Boolean);

  if (!acceptedSecrets.length) {
    const error = new Error("Missing cron secret.");
    error.statusCode = 503;
    throw error;
  }

  const authorization = req.headers.authorization || "";
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const headerSecret =
    req.headers["x-cron-secret"] ||
    req.headers["x-supabase-cron-secret"] ||
    "";

  if (!acceptedSecrets.includes(bearerSecret) && !acceptedSecrets.includes(headerSecret)) {
    const error = new Error("Cron request is not authorized.");
    error.statusCode = 401;
    throw error;
  }
}
