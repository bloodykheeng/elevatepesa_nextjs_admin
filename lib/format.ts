import { DateTime } from "luxon";

/**
 * How the dashboard writes money, dates and names on screen.
 *
 * Money is whole Ugandan shillings: never decimals. Dates are stored and sent in UTC and shown on the
 * business clock (Africa/Kampala), whatever the viewer's computer is set to, through Luxon (the maintained
 * successor Moment's own team points to; the user, 28 Oct 2026). Times are 12-hour with am / pm.
 */

const ugxFormatter = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** `250000` to `UGX 250,000`. */
export function ugx(amount: number | null | undefined): string {
  return `UGX ${ugxFormatter.format(Math.round(amount ?? 0))}`;
}

/** `250000` to `250,000`, for inputs and tight table cells. */
export function num(amount: number | null | undefined): string {
  return ugxFormatter.format(Math.round(amount ?? 0));
}

/** `1250000` to `UGX 1.25M`, for chart axes and stat tiles. */
export function ugxShort(amount: number | null | undefined): string {
  const n = amount ?? 0;
  if (n >= 1_000_000_000) return `UGX ${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (n >= 10_000) return `UGX ${Math.round(n / 1000)}K`;
  return ugx(n);
}

/** The business clock: what "a day" means (BUSINESS_TIMEZONE on the API). */
export const BUSINESS_TIMEZONE = "Africa/Kampala";

/** An instant from the API (or a Date) on the business clock, or null. */
export function onBusinessClock(value: string | Date | null | undefined, zone: string = BUSINESS_TIMEZONE): DateTime | null {
  if (!value) return null;
  // MySQL text with no zone ("2025-12-14 20:08:50") is UTC: every column is cast now, this is a safety net.
  const sql = typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value);
  const dt = value instanceof Date
    ? DateTime.fromJSDate(value)
    : sql
      ? DateTime.fromSQL(value, { zone: "utc" })
      : DateTime.fromISO(value, { setZone: false });
  return dt.isValid ? dt.setZone(zone) : null;
}

/** Now, on the business clock. */
export const businessNow = () => DateTime.now().setZone(BUSINESS_TIMEZONE);

/** "2:05 pm": 12-hour with a lowercase am / pm, the clock people here read (the user, 25 Oct 2026). */
const clock = (dt: DateTime) => `${dt.toFormat("h:mm")} ${dt.hour < 12 ? "am" : "pm"}`;

/** Saturday, 12 December 2026. On the business clock, or in `timeZone` when given (link previews, metadata). */
export function longDate(iso: string | null | undefined, timeZone?: string): string {
  return onBusinessClock(iso, timeZone)?.toFormat("cccc, d LLLL yyyy") ?? "";
}

/** 12 Dec 2026 */
export function shortDate(iso: string | null | undefined): string {
  return onBusinessClock(iso)?.toFormat("d LLL yyyy") ?? "-";
}

/** 12 Dec 2026, 2:05 pm */
export function dateTime(iso: string | null | undefined): string {
  const dt = onBusinessClock(iso);
  return dt ? `${dt.toFormat("d LLL yyyy")}, ${clock(dt)}` : "-";
}

/** "2026-11-01": the business day (Kampala) an instant falls on, as the API takes a day. */
export function businessDay(iso: string | Date): string {
  return onBusinessClock(iso)?.toISODate() ?? "";
}

/**
 * A day picked on a PrimeReact Calendar (the browser's midnight of that date) as the API's day, "2026-11-01":
 * the calendar's own date, whatever the browser's zone.
 */
export function calendarDay(d: Date): string {
  return DateTime.fromJSDate(d).toISODate() ?? "";
}

/** A Kampala day (a "2026-11-01", or an instant from the API) as the Date a Calendar shows: that date's local midnight. */
export function calendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : businessDay(value);
  const dt = DateTime.fromISO(day);
  return dt.isValid ? dt.toJSDate() : null;
}

/**
 * An instant from the API as the Date a time-picking Calendar shows: its Kampala wall-clock as the browser's local
 * time, so a laptop set to another zone still shows the Kampala time.
 */
export function calendarMoment(value: string | null | undefined): Date | null {
  const dt = onBusinessClock(value);
  if (!dt) return null;
  return DateTime.fromObject({ year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, second: dt.second }).toJSDate();
}

/**
 * What a time-picking Calendar's change means, as an instant to send ("...Z"): the picked wall-clock read on the
 * Kampala clock. Picking a new DAY snaps to its start (a "from") or its end (a "to"), so "to 5 Nov" never drops the
 * 5th; changing only the time keeps the time, so 1 pm to 3 pm stays 1 pm to 3 pm (docs/timezones.md, NICE's rule).
 */
export function pickedMoment(picked: Date, previous: string | null | undefined, edge: "start" | "end"): string {
  const local = DateTime.fromJSDate(picked);
  let dt = DateTime.fromObject(
    { year: local.year, month: local.month, day: local.day, hour: local.hour, minute: local.minute, second: local.second },
    { zone: BUSINESS_TIMEZONE },
  );
  const before = onBusinessClock(previous);
  if (!before || !before.hasSame(dt, "day")) dt = edge === "start" ? dt.startOf("day") : dt.endOf("day");
  return dt.toUTC().toISO() ?? "";
}

/** Today on the business clock, n years back, as a Calendar's Date (a date of birth's limits). */
export function yearsAgo(n: number): Date {
  return DateTime.fromISO(businessNow().minus({ years: n }).toISODate() ?? "").toJSDate();
}

/** 2:00 pm */
export function timeOfDay(iso: string | null | undefined): string {
  const dt = onBusinessClock(iso);
  return dt ? clock(dt) : "";
}

/** "3 minutes ago", "yesterday", "12 Dec 2026". */
export function timeAgo(iso: string | null | undefined): string {
  const dt = onBusinessClock(iso);
  if (!dt) return "";
  const seconds = Math.round(businessNow().diff(dt, "seconds").seconds);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(businessNow().startOf("day").diff(dt.startOf("day"), "days").days);
  if (days <= 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return shortDate(iso);
}

/** Business days until a date; negative once it has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  const dt = onBusinessClock(iso);
  if (!dt) return null;
  return Math.round(dt.startOf("day").diff(businessNow().startOf("day"), "days").days);
}

/** "Aisha Namutebi" to "AN". */
export function initials(name: string | null | undefined): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Percentage of a target reached, 0 to 100, one decimal. */
export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.min(100, Math.round((part / whole) * 1000) / 10);
}
