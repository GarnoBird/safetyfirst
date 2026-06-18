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
    const error = new Error(message);
    error.cause = result.error;
    error.statusCode = 500;
    throw error;
  }
  return result.data;
}
