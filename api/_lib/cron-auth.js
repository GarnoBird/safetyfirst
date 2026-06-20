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
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const querySecret = url.searchParams.get("secret");
  const bearerSecret = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!acceptedSecrets.includes(bearerSecret) && !acceptedSecrets.includes(querySecret)) {
    const error = new Error("Cron request is not authorized.");
    error.statusCode = 401;
    throw error;
  }
}
