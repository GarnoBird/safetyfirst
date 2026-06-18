export const VANCOUVER_TIME_ZONE = "America/Vancouver";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VANCOUVER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: VANCOUVER_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

export function getVancouverDate(date = new Date()) {
  return dateFormatter.format(date);
}

export function getVancouverHour(date = new Date()) {
  return Number(hourFormatter.format(date));
}

export function assertDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    const error = new Error("Use a date in YYYY-MM-DD format.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}
