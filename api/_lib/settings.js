import { getFallbackRecord, upsertFallbackRecord } from "./fallback-store.js";
import { hasOneDriveConfig } from "./onedrive.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

const SETTINGS_ID = "default";
const ONE_DRIVE_BACKUP_SETTING_ID = "one_drive_backup";
const MAX_TEXT_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 320;
const MAX_REPORT_RECIPIENTS = 10;
const MAX_REPORT_RECIPIENTS_LENGTH = 600;
const SITE_SETTINGS_SELECT =
  "id, site_name, site_location, timezone, signout_cutoff_time, signout_reminders_enabled, signout_reminder_message, report_recipient_email, report_auto_enabled, report_auto_time, report_format, updated_at, updated_by_staff_id";
const STAFF_REPORT_SETTINGS_SELECT =
  "id, staff_id, recipient_emails, auto_enabled, auto_time, timezone, report_format, created_at, updated_at, updated_by_staff_id";
const REPORT_FORMATS = ["csv", "xml", "both"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SETTINGS = {
  site_name: "Safety First",
  site_location: "Vancouver condo tower site",
  timezone: "America/Vancouver",
  signout_cutoff_time: "16:30",
  signout_reminders_enabled: false,
  signout_reminder_message:
    "Hello {{name}}, APPIA records show you are still signed in on site today. If you have left site, please sign out here: {{signout_link}}. If you are still on site, no action is needed.",
  report_recipient_email: "garnobird@gmail.com",
  report_auto_enabled: true,
  report_auto_time: "08:00",
  report_format: "both",
  one_drive_backup_enabled: false,
};

export async function getSiteSettings() {
  const row = await loadSettingsRow();
  if (row) return normalizeSiteSettings(row);

  const inserted = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("site_settings")
      .insert({ id: SETTINGS_ID })
      .select(SITE_SETTINGS_SELECT)
      .single(),
    "Site settings could not be created.",
  );
  return normalizeSiteSettings(inserted);
}

export async function getStaffSettings(staffId) {
  const [siteSettings, reportSettings, oneDriveSettings] = await Promise.all([
    getSiteSettings(),
    getStaffReportSettings(staffId),
    getOneDriveBackupSettings(),
  ]);
  return mergeStaffSettings(siteSettings, reportSettings, oneDriveSettings);
}

export async function updateSiteSettings(body, staffId) {
  const updates = validateSiteSettingsInput(body);
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
      .select(SITE_SETTINGS_SELECT)
      .single(),
    "Site settings could not be saved.",
  );
  return normalizeSiteSettings(row);
}

export async function updateStaffSettings(body, staffId) {
  const input = body && typeof body === "object" ? body : {};
  const siteUpdates = validateSiteSettingsInput(input);
  const reportUpdates = validateReportSettingsInput(input);
  const oneDriveUpdates = validateOneDriveBackupSettingsInput(input);
  const now = new Date().toISOString();
  const supabase = getSupabaseServiceClient();

  const siteRow = throwIfSupabaseError(
    await supabase
      .from("site_settings")
      .upsert({
        id: SETTINGS_ID,
        ...siteUpdates,
        signout_reminders_enabled: false,
        updated_at: now,
        updated_by_staff_id: staffId,
      })
      .select(SITE_SETTINGS_SELECT)
      .single(),
    "Site settings could not be saved.",
  );

  const reportRow = throwIfSupabaseError(
    await supabase
      .from("staff_report_settings")
      .upsert(
        {
          staff_id: staffId,
          ...reportUpdates,
          updated_at: now,
          updated_by_staff_id: staffId,
        },
        { onConflict: "staff_id" },
      )
      .select(STAFF_REPORT_SETTINGS_SELECT)
      .single(),
    "Report settings could not be saved.",
  );
  const oneDriveSettings = await updateOneDriveBackupSettings(
    oneDriveUpdates,
    staffId,
    now,
  );

  return mergeStaffSettings(
    normalizeSiteSettings(siteRow),
    normalizeStaffReportSettings(reportRow),
    oneDriveSettings,
  );
}

export async function getStaffReportSettings(staffId) {
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_report_settings")
      .select(STAFF_REPORT_SETTINGS_SELECT)
      .eq("staff_id", staffId)
      .maybeSingle(),
    "Report settings could not be loaded.",
  );

  if (row) return normalizeStaffReportSettings(row);
  return createStaffReportSettingsFromSite(staffId);
}

export async function listActiveStaffReportSettings() {
  const supabase = getSupabaseServiceClient();
  const rows = throwIfSupabaseError(
    await supabase
      .from("staff_report_settings")
      .select(STAFF_REPORT_SETTINGS_SELECT)
      .eq("auto_enabled", true),
    "Report settings could not be loaded.",
  );
  if (!rows.length) return [];

  const staffIds = [...new Set(rows.map((row) => row.staff_id).filter(Boolean))];
  const staffRows = throwIfSupabaseError(
    await supabase
      .from("staff_profiles")
      .select("id, username, email, role, active")
      .in("id", staffIds)
      .eq("active", true),
    "Staff profiles could not be loaded.",
  );
  const activeStaff = new Map(staffRows.map((staff) => [staff.id, staff]));

  return rows
    .filter((row) => activeStaff.has(row.staff_id))
    .map((row) => ({
      ...normalizeStaffReportSettings(row),
      staff: activeStaff.get(row.staff_id),
    }));
}

export function getSettingsSystemStatus() {
  return {
    database: "connected",
    email:
      process.env.RESEND_API_KEY && process.env.REPORT_FROM_EMAIL
        ? "configured"
        : "not configured",
    sms: "not connected",
    oneDrive: hasOneDriveConfig() ? "configured" : "not configured",
  };
}

export async function isOneDriveBackupEnabled() {
  const settings = await getOneDriveBackupSettings();
  return Boolean(settings.one_drive_backup_enabled);
}

async function loadSettingsRow() {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("site_settings")
      .select(SITE_SETTINGS_SELECT)
      .eq("id", SETTINGS_ID)
      .maybeSingle(),
    "Site settings could not be loaded.",
  );
}

async function createStaffReportSettingsFromSite(staffId) {
  const siteSettings = await getSiteSettings();
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_report_settings")
      .upsert(
        {
          staff_id: staffId,
          recipient_emails: siteSettings.report_recipient_email,
          auto_enabled: siteSettings.report_auto_enabled,
          auto_time: siteSettings.report_auto_time,
          timezone: siteSettings.timezone,
          report_format: siteSettings.report_format,
          updated_by_staff_id: staffId,
        },
        { onConflict: "staff_id" },
      )
      .select(STAFF_REPORT_SETTINGS_SELECT)
      .single(),
    "Report settings could not be created.",
  );
  return normalizeStaffReportSettings(row, siteSettings);
}

function validateSiteSettingsInput(body) {
  const input = body && typeof body === "object" ? body : {};
  return {
    site_name: cleanText(input.site_name, "Site name", MAX_TEXT_LENGTH),
    site_location: cleanText(input.site_location, "Site location", MAX_TEXT_LENGTH),
    timezone: cleanTimezone(input.timezone),
    signout_cutoff_time: cleanCutoffTime(input.signout_cutoff_time),
    signout_reminder_message: cleanReminderMessage(input.signout_reminder_message),
  };
}

function validateReportSettingsInput(body) {
  const input = body && typeof body === "object" ? body : {};
  return {
    recipient_emails: cleanReportRecipientEmails(
      input.recipient_emails ?? input.report_recipient_email,
    ),
    auto_enabled: cleanBoolean(input.auto_enabled ?? input.report_auto_enabled),
    auto_time: cleanTime(input.auto_time ?? input.report_auto_time, "Auto-report time"),
    timezone: cleanTimezone(input.report_timezone ?? input.timezone),
    report_format: cleanReportFormat(input.report_format),
  };
}

function validateOneDriveBackupSettingsInput(body) {
  const input = body && typeof body === "object" ? body : {};
  return {
    one_drive_backup_enabled: cleanBoolean(input.one_drive_backup_enabled),
  };
}

function normalizeSiteSettings(row) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...row,
    timezone: safeTimezone(row?.timezone),
    signout_cutoff_time: String(
      row?.signout_cutoff_time || DEFAULT_SETTINGS.signout_cutoff_time,
    ).slice(0, 5),
    report_auto_time: String(
      row?.report_auto_time || DEFAULT_SETTINGS.report_auto_time,
    ).slice(0, 5),
    report_format: REPORT_FORMATS.includes(row?.report_format)
      ? row.report_format
      : DEFAULT_SETTINGS.report_format,
    signout_reminders_enabled: false,
  };

  settings.report_recipient_email = safeReportRecipientEmails(
    settings.report_recipient_email,
  );

  return settings;
}

function normalizeStaffReportSettings(row, fallback = DEFAULT_SETTINGS) {
  return {
    id: row?.id || null,
    staff_id: row?.staff_id || null,
    recipient_emails: safeReportRecipientEmails(
      row?.recipient_emails || fallback.report_recipient_email,
    ),
    auto_enabled:
      row?.auto_enabled === undefined
        ? Boolean(fallback.report_auto_enabled)
        : Boolean(row.auto_enabled),
    auto_time: String(
      row?.auto_time || fallback.report_auto_time || DEFAULT_SETTINGS.report_auto_time,
    ).slice(0, 5),
    timezone: safeTimezone(row?.timezone || fallback.timezone),
    report_format: REPORT_FORMATS.includes(row?.report_format)
      ? row.report_format
      : fallback.report_format || DEFAULT_SETTINGS.report_format,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
    updated_by_staff_id: row?.updated_by_staff_id || null,
  };
}

async function getOneDriveBackupSettings() {
  try {
    const record = await getFallbackRecord("setting", ONE_DRIVE_BACKUP_SETTING_ID);
    return normalizeOneDriveBackupSettings(record);
  } catch {
    return normalizeOneDriveBackupSettings(null);
  }
}

async function updateOneDriveBackupSettings(settings, staffId, now) {
  const record = await upsertFallbackRecord(
    "setting",
    ONE_DRIVE_BACKUP_SETTING_ID,
    {
      ...normalizeOneDriveBackupSettings(settings),
      updated_at: now,
      updated_by_staff_id: staffId,
    },
    staffId,
  );
  return normalizeOneDriveBackupSettings(record);
}

function normalizeOneDriveBackupSettings(row) {
  return {
    one_drive_backup_enabled:
      row?.one_drive_backup_enabled === undefined
        ? DEFAULT_SETTINGS.one_drive_backup_enabled
        : Boolean(row.one_drive_backup_enabled),
  };
}

function mergeStaffSettings(siteSettings, reportSettings, oneDriveSettings) {
  return {
    ...siteSettings,
    report_recipient_email: reportSettings.recipient_emails,
    report_auto_enabled: reportSettings.auto_enabled,
    report_auto_time: reportSettings.auto_time,
    report_timezone: reportSettings.timezone,
    report_format: reportSettings.report_format,
    one_drive_backup_enabled: Boolean(
      oneDriveSettings?.one_drive_backup_enabled,
    ),
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

function safeTimezone(value) {
  try {
    return cleanTimezone(value);
  } catch {
    return DEFAULT_SETTINGS.timezone;
  }
}

function cleanCutoffTime(value) {
  return cleanTime(value, "Sign-out cutoff time");
}

function cleanTime(value, label) {
  const time = String(value || "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return fail(`${label} must use HH:MM 24-hour format.`);
  }
  return time;
}

export function normalizeReportRecipientEmails(value) {
  const raw = String(value || "").trim();
  if (!raw) return fail("At least one report recipient email is required.");
  if (raw.length > MAX_REPORT_RECIPIENTS_LENGTH) {
    return fail(
      `Report recipient emails must be ${MAX_REPORT_RECIPIENTS_LENGTH} characters or less.`,
    );
  }

  const emails = [];
  const seen = new Set();
  raw
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => {
      if (!EMAIL_PATTERN.test(email)) {
        return fail(`Report recipient email is invalid: ${email}`);
      }
      if (!seen.has(email)) {
        seen.add(email);
        emails.push(email);
      }
    });

  if (!emails.length) return fail("At least one report recipient email is required.");
  if (emails.length > MAX_REPORT_RECIPIENTS) {
    return fail(`Use ${MAX_REPORT_RECIPIENTS} report recipient emails or fewer.`);
  }

  return emails;
}

function cleanReportRecipientEmails(value) {
  return normalizeReportRecipientEmails(value).join(", ");
}

function safeReportRecipientEmails(value) {
  try {
    return cleanReportRecipientEmails(value);
  } catch {
    return DEFAULT_SETTINGS.report_recipient_email;
  }
}

function cleanReportFormat(value) {
  const format = String(value || "").trim().toLowerCase();
  if (!REPORT_FORMATS.includes(format)) {
    return fail("Report format must be CSV, XML, or Both.");
  }
  return format;
}

function cleanBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
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
