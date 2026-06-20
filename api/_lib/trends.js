import { assertDateString, getVancouverDate } from "./date.js";
import { getSupabaseServiceClient, throwIfSupabaseError } from "./supabase.js";

export const TRADE_CATEGORIES = [
  "Unmapped",
  "General contractor",
  "Concrete",
  "Electrical",
  "Mechanical",
  "Plumbing",
  "Glazing",
  "Drywall",
  "Flooring",
  "Painting",
  "Elevator",
  "Scaffold",
  "Waterproofing",
  "Roofing",
  "Windows",
  "Masonry",
  "Traffic control",
  "Cleaning",
  "Utilities",
  "Other",
];

const DEFAULT_RANGE_DAYS = 90;
const MAX_RANGE_DAYS = 730;
const TREND_SIGNINS_PAGE_SIZE = 1000;
const UNMAPPED = "Unmapped";
const SIGNIN_TREND_SELECT =
  "company, trade, signed_in_at, signed_out_at, sign_in_date_vancouver, sign_out_date_vancouver";

export async function buildStaffTrends(query) {
  const range = await resolveRange(query);
  const comparisonFrom = addDaysToISODate(range.from, -range.dayCount);
  const rows = await loadTrendSignIns(comparisonFrom, range.to);
  const profiles = await loadCompanyProfiles();
  const profileMap = new Map(profiles.map((profile) => [profile.company_name, profile]));
  const currentRows = rows.filter((row) => row.sign_in_date_vancouver >= range.from);
  const previousRows = rows.filter((row) => row.sign_in_date_vancouver < range.from);
  const daily = buildDailySeries(range.from, range.to, currentRows);
  const companyActivity = buildCompanyActivity(currentRows, range, profileMap);
  const unmappedCompanies = companyActivity
    .filter((company) => company.tradeCategory === UNMAPPED)
    .map((company) => company.company);

  return {
    range,
    tradeCategories: TRADE_CATEGORIES,
    metrics: buildMetrics({ daily, currentRows, previousRows, range }),
    workforce: { daily },
    companies: companyActivity,
    tradeMix: buildTradeMix(currentRows, range, profileMap),
    dataQuality: buildDataQuality(currentRows, unmappedCompanies),
  };
}

export async function updateCompanyMappings(mappings, staffId) {
  const cleaned = cleanMappings(mappings);
  if (!cleaned.length) return [];

  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .upsert(
        cleaned.map((mapping) => ({
          ...mapping,
          active: true,
          updated_at: new Date().toISOString(),
          updated_by_staff_id: staffId,
        })),
        { onConflict: "company_name" },
      )
      .select("company_name, trade_category, active, updated_at"),
    "Company trade mapping could not be saved.",
  );
}

async function resolveRange(query) {
  const today = getVancouverDate();
  const to = assertDateString(query.get("to") || today);
  const from =
    query.get("range") === "project"
      ? await loadProjectStartDate(to)
      : assertDateString(query.get("from") || addDaysToISODate(to, -(DEFAULT_RANGE_DAYS - 1)));
  const dayCount = daysBetweenInclusive(from, to);

  if (dayCount < 1) {
    const error = new Error("From date must be on or before to date.");
    error.statusCode = 400;
    throw error;
  }

  if (dayCount > MAX_RANGE_DAYS) {
    const error = new Error(`Trends range must be ${MAX_RANGE_DAYS} days or less.`);
    error.statusCode = 400;
    throw error;
  }

  return { from, to, dayCount };
}

async function loadProjectStartDate(fallbackDate) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("worker_signins")
      .select("sign_in_date_vancouver")
      .order("sign_in_date_vancouver", { ascending: true })
      .limit(1),
    "Project start date could not be loaded.",
  );
  return rows[0]?.sign_in_date_vancouver || fallbackDate;
}

async function loadTrendSignIns(from, to) {
  const supabase = getSupabaseServiceClient();
  const rows = [];
  let fromIndex = 0;

  while (true) {
    const page = throwIfSupabaseError(
      await supabase
        .from("worker_signins")
        .select(SIGNIN_TREND_SELECT)
        .gte("sign_in_date_vancouver", from)
        .lte("sign_in_date_vancouver", to)
        .order("sign_in_date_vancouver", { ascending: true })
        .range(fromIndex, fromIndex + TREND_SIGNINS_PAGE_SIZE - 1),
      "Trend sign-ins could not be loaded.",
    );
    rows.push(...page);
    if (page.length < TREND_SIGNINS_PAGE_SIZE) return rows;
    fromIndex += TREND_SIGNINS_PAGE_SIZE;
  }
}

async function loadCompanyProfiles() {
  return throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("company_profiles")
      .select("company_name, trade_category, active")
      .eq("active", true),
    "Company trade mappings could not be loaded.",
  );
}

function buildDailySeries(from, to, rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const date = row.sign_in_date_vancouver;
    counts.set(date, (counts.get(date) || 0) + 1);
  });

  return dateRange(from, to).map((date, index, dates) => {
    const workerCount = counts.get(date) || 0;
    const windowDates = dates.slice(Math.max(0, index - 6), index + 1);
    const movingAverage7 =
      windowDates.reduce((sum, windowDate) => sum + (counts.get(windowDate) || 0), 0) /
      windowDates.length;

    return {
      date,
      workerCount,
      movingAverage7: roundOne(movingAverage7),
    };
  });
}

function buildMetrics({ daily, currentRows, previousRows, range }) {
  const peakDay = daily.reduce(
    (peak, day) => (day.workerCount > peak.workerCount ? day : peak),
    { date: range.from, workerCount: 0 },
  );
  const averageDay = currentRows.length / range.dayCount;
  const previousAverage = previousRows.length / range.dayCount;
  const current7DayAverage = averageForLastDays(daily, 7);
  const recentPeak = Math.max(...daily.slice(-14).map((day) => day.workerCount), 0);
  const activeCompanies7Day = new Set(
    currentRows
      .filter((row) => row.sign_in_date_vancouver >= addDaysToISODate(range.to, -6))
      .map(companyNameForRow),
  ).size;

  return {
    totalWorkerSignIns: currentRows.length,
    averageDay: roundOne(averageDay),
    currentDay: daily[daily.length - 1]?.workerCount || 0,
    current7DayAverage: roundOne(current7DayAverage),
    previousAverage: roundOne(previousAverage),
    changeFromPreviousAverage: roundOne(averageDay - previousAverage),
    changeFromPreviousPercent:
      previousAverage > 0 ? roundOne(((averageDay - previousAverage) / previousAverage) * 100) : null,
    peakDay: {
      date: peakDay.date,
      workerCount: peakDay.workerCount,
    },
    recentPeak,
    activeCompanies7Day,
  };
}

function buildCompanyActivity(rows, range, profileMap) {
  const companies = new Map();

  rows.forEach((row) => {
    const company = companyNameForRow(row);
    if (!companies.has(company)) {
      companies.set(company, {
        company,
        firstSeen: row.sign_in_date_vancouver,
        lastSeen: row.sign_in_date_vancouver,
        dailyCounts: new Map(),
      });
    }

    const record = companies.get(company);
    record.firstSeen = minDate(record.firstSeen, row.sign_in_date_vancouver);
    record.lastSeen = maxDate(record.lastSeen, row.sign_in_date_vancouver);
    record.dailyCounts.set(
      row.sign_in_date_vancouver,
      (record.dailyCounts.get(row.sign_in_date_vancouver) || 0) + 1,
    );
  });

  return [...companies.values()]
    .map((record) => {
      const profile = profileMap.get(record.company);
      const recentAverage = averageCompanyWindow(record.dailyCounts, range.to, 7);
      const previousAverage = averageCompanyWindow(
        record.dailyCounts,
        addDaysToISODate(range.to, -7),
        7,
      );
      const tradeCategory = cleanTradeCategory(profile?.trade_category || UNMAPPED);

      return {
        company: record.company,
        tradeCategory,
        mapped: tradeCategory !== UNMAPPED,
        firstSeen: record.firstSeen,
        lastSeen: record.lastSeen,
        activeDays: record.dailyCounts.size,
        peakWorkers: Math.max(...record.dailyCounts.values(), 0),
        latestCount: record.dailyCounts.get(range.to) || 0,
        recentAverage: roundOne(recentAverage),
        trend: trendDirection(recentAverage, previousAverage),
      };
    })
    .sort((a, b) => b.latestCount - a.latestCount || b.peakWorkers - a.peakWorkers || a.company.localeCompare(b.company));
}

function buildTradeMix(rows, range, profileMap) {
  const weekly = new Map();
  const totals = new Map();

  rows.forEach((row) => {
    const company = companyNameForRow(row);
    const category = cleanTradeCategory(profileMap.get(company)?.trade_category || UNMAPPED);
    const weekStart = mondayForISODate(row.sign_in_date_vancouver);
    if (!weekly.has(weekStart)) weekly.set(weekStart, new Map());
    const week = weekly.get(weekStart);
    week.set(category, (week.get(category) || 0) + 1);
    totals.set(category, (totals.get(category) || 0) + 1);
  });

  return {
    totals: [...totals.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    weekly: [...weekly.entries()]
      .map(([weekStart, categoryMap]) => ({
        weekStart,
        total: [...categoryMap.values()].reduce((sum, count) => sum + count, 0),
        categories: [...categoryMap.entries()]
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
      }))
      .filter((week) => week.weekStart >= mondayForISODate(range.from))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  };
}

function buildDataQuality(rows, unmappedCompanies) {
  const signedOut = rows.filter((row) => row.signed_out_at);
  const durations = signedOut
    .map((row) => (new Date(row.signed_out_at).getTime() - new Date(row.signed_in_at).getTime()) / 60000)
    .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);

  return {
    signOutCompletionRate: rows.length ? roundOne((signedOut.length / rows.length) * 100) : 0,
    openSignIns: rows.length - signedOut.length,
    averageSignedInHours: durations.length
      ? roundOne(durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length / 60)
      : null,
    unmappedCompanies,
  };
}

function cleanMappings(value) {
  const mappings = Array.isArray(value) ? value : [];
  const seen = new Set();
  return mappings.map((mapping) => {
    const companyName = cleanRequiredText(mapping?.companyName, "Company name", 140);
    const tradeCategory = cleanTradeCategory(mapping?.tradeCategory);
    if (seen.has(companyName.toLowerCase())) {
      const error = new Error(`Duplicate company mapping: ${companyName}`);
      error.statusCode = 400;
      throw error;
    }
    seen.add(companyName.toLowerCase());
    return {
      company_name: companyName,
      trade_category: tradeCategory,
    };
  });
}

function cleanRequiredText(value, label, maxLength) {
  const cleaned = String(value || "").trim();
  if (!cleaned) {
    const error = new Error(`${label} is required.`);
    error.statusCode = 400;
    throw error;
  }
  if (cleaned.length > maxLength) {
    const error = new Error(`${label} must be ${maxLength} characters or less.`);
    error.statusCode = 400;
    throw error;
  }
  return cleaned;
}

function cleanTradeCategory(value) {
  const category = String(value || "").trim();
  if (TRADE_CATEGORIES.includes(category)) return category;
  const error = new Error("Trade category is not supported.");
  error.statusCode = 400;
  throw error;
}

function companyNameForRow(row) {
  return String(row.company || row.trade || "Unassigned").trim() || "Unassigned";
}

function averageForLastDays(daily, days) {
  const slice = daily.slice(-days);
  if (!slice.length) return 0;
  return slice.reduce((sum, day) => sum + day.workerCount, 0) / slice.length;
}

function averageCompanyWindow(dailyCounts, endDate, days) {
  const dates = dateRange(addDaysToISODate(endDate, -(days - 1)), endDate);
  return dates.reduce((sum, date) => sum + (dailyCounts.get(date) || 0), 0) / dates.length;
}

function trendDirection(currentAverage, previousAverage) {
  if (currentAverage > previousAverage + 0.25) return "up";
  if (currentAverage < previousAverage - 0.25) return "down";
  return "flat";
}

function dateRange(from, to) {
  const dates = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDaysToISODate(current, 1);
  }
  return dates;
}

function addDaysToISODate(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetweenInclusive(from, to) {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toTime - fromTime) / 86400000) + 1;
}

function mondayForISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (dayOfWeek - 1));
  return date.toISOString().slice(0, 10);
}

function minDate(a, b) {
  return a <= b ? a : b;
}

function maxDate(a, b) {
  return a >= b ? a : b;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}
