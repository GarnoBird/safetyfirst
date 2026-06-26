import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./http.js";

let serviceClient;
let authClient;

export function getSupabaseServiceClient() {
  if (!serviceClient) {
    serviceClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return serviceClient;
}

export function getSupabaseAuthClient() {
  if (!authClient) {
    authClient = createClient(
      getRequiredEnv("SUPABASE_URL"),
      process.env.SUPABASE_ANON_KEY || getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return authClient;
}

export function throwIfSupabaseError(result, message = "Database request failed.") {
  if (result.error) {
    const missingRelation = isSupabaseMissingRelationError(result.error);
    const error = new Error(
      missingRelation
        ? `${message} Run the latest Supabase migration before using this feature.`
        : message,
    );
    error.cause = result.error;
    error.statusCode = missingRelation ? 503 : 500;
    error.exposeMessage = missingRelation;
    throw error;
  }
  return result.data;
}

export function isSupabaseMissingRelationError(error) {
  const source = error?.cause || error;
  const code = source?.code;
  const message = String(source?.message || source?.details || "");
  return (
    ["42P01", "PGRST204", "PGRST205"].includes(code) ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message)
  );
}
