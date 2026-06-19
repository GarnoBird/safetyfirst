import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const SETTINGS_ID = "default";
const MAX_TEXT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 320;
const SETTINGS_SELECT =
  "id, site_name, site_location, timezone, signout_cutoff_time, signout_reminders_enabled, signout_reminder_message, updated_at, updated_by_staff_id";

const DEFAULT_SETTINGS = {
  site_name: "Safety First",
  site_location: "Vancouver condo tower site",
  timezone: "America/Vancouver",
  signout_cutoff_time: "16:30",
  signout_reminders_enabled: false,
  signout_reminder_message:
    "Hello {{name}}, APPIA records show you are still signed in on site today. If you have left site, please sign out here: {{signout_link}}. If you are still on site, no action is needed.",
};

export async function getSiteSettings() {
  const row = await loadSettingsRow();
  if (row) return normalizeSettings(row);

  const inserted = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("site_settings")
      .insert({ id: SETTINGS_ID })
      .select(SETTINGS_SELECT)
      .single(),
    "Site settings could not be created.",
  );
  return normalizeSettings(inserted);
}

export async function updateSiteSettings(body, staffId) {
  const updates = validateSettingsInput(body);
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("site_settings")
      .upsert({
        id: SETTINGS_ID,
        ...updates,
        signout_reminders_enabled: false,
        updated_at: new Date().toISOString(),
        updated_by_staff_id: staffId,
      })
      .select(SETTINGS_SELECT)
      .single(),
    "Site settings could not be saved.",
  );
  return normalizeSettings(row);
}

export function getSettingsSystemStatus() {
  return {
    database: "connected",
    email:
      process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL
        ? "configured"
        : "not configured",
    sms: "not connected",
  };
}

async function loadSettingsRow() {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("site_settings")
      .select(SETTINGS_SELECT)
      .eq("id", SETTINGS_ID)
      .maybeSingle(),
    "Site settings could not be loaded.",
  );
}

function validateSettingsInput(body) {
  const input = body && typeof body === "object" ? body : {};
  return {
    site_name: cleanText(input.site_name, "Site name", MAX_TEXT_LENGTH),
    site_location: cleanText(input.site_location, "Site location", MAX_TEXT_LENGTH),
    timezone: cleanTimezone(input.timezone),
    signout_cutoff_time: cleanCutoffTime(input.signout_cutoff_time),
    signout_reminder_message: cleanReminderMessage(input.signout_reminder_message),
  };
}

function normalizeSettings(row) {
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    signout_cutoff_time: String(
      row?.signout_cutoff_time || DEFAULT_SETTINGS.signout_cutoff_time,
    ).slice(0, 5),
    signout_reminders_enabled: false,
  };
}

function cleanText(value, label, maxLength) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return fail(`${label} is required.`);
  if (cleaned.length > maxLength) {
    return fail(`${label} must be ${maxLength} characters or less.`);
  }
  return cleaned;
}

function cleanTimezone(value) {
  const timezone = cleanText(value, "Timezone", 80);
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    return fail("Timezone must be a valid IANA timezone.");
  }
  return timezone;
}

function cleanCutoffTime(value) {
  const time = String(value || "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return fail("Sign-out cutoff time must use HH:MM 24-hour format.");
  }
  return time;
}

function cleanReminderMessage(value) {
  const message = cleanText(value, "Reminder message", MAX_MESSAGE_LENGTH);
  if (!message.includes("{{signout_link}}")) {
    return fail("Reminder message must include {{signout_link}}.");
  }
  return message;
}

function fail(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}
