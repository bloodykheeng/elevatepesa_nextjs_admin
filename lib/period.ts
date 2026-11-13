import { DateTime } from "luxon";
import { businessNow } from "@/lib/format";

/**
 * The periods a dashboard is read for (docs/dashboards.md): whole Kampala days. The switch is "so far" for the
 * current day, week, month, quarter and year (the prototype's); the Period dialog takes one day or any range
 * from a first to a last day, with the finished windows a manager compares with one tap away.
 */
export const PERIOD_PRESETS = [
  { value: "today", label: "Today", longest: 1 },
  { value: "week", label: "Week", longest: 7 },
  { value: "month", label: "Month", longest: 31 },
  { value: "quarter", label: "Quarter", longest: 92 },
  { value: "year", label: "Year", longest: 366 },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["value"];

/** The switch's presets that can never be longer than a page allows (the Field map: 31 days). */
export function presetsWithin(maxDays?: number) {
  return PERIOD_PRESETS.filter((p) => !maxDays || p.longest <= maxDays);
}

const iso = (dt: DateTime) => dt.toISODate() ?? "";
const today = () => businessNow().startOf("day");

/** A preset's first and last day ("2026-10-01", "2026-10-28"): from its start to today. */
export function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const t = today();
  return { from: iso(preset === "today" ? t : t.startOf(preset)), to: iso(t) };
}

/** Finished windows, the ones the "so far" switch cannot give: one tap in the Period dialog. */
export const QUICK_RANGES: { label: string; range: () => { from: string; to: string } }[] = [
  { label: "Yesterday", range: () => ({ from: iso(today().minus({ days: 1 })), to: iso(today().minus({ days: 1 })) }) },
  { label: "Last 7 days", range: () => ({ from: iso(today().minus({ days: 6 })), to: iso(today()) }) },
  { label: "Last 30 days", range: () => ({ from: iso(today().minus({ days: 29 })), to: iso(today()) }) },
  { label: "Last week", range: () => ({ from: iso(today().minus({ weeks: 1 }).startOf("week")), to: iso(today().minus({ weeks: 1 }).endOf("week")) }) },
  { label: "Last month", range: () => ({ from: iso(today().minus({ months: 1 }).startOf("month")), to: iso(today().minus({ months: 1 }).endOf("month")) }) },
  { label: "Last quarter", range: () => ({ from: iso(today().minus({ quarters: 1 }).startOf("quarter")), to: iso(today().minus({ quarters: 1 }).endOf("quarter")) }) },
];

/** How many days a range covers, both ends counted ("2026-10-01" to "2026-10-07": 7). */
export function daysIn(from: string, to: string): number {
  const a = DateTime.fromISO(from);
  const b = DateTime.fromISO(to);
  return a.isValid && b.isValid ? Math.round(b.diff(a, "days").days) + 1 : 0;
}

/** The day `days - 1` after `from`: the last day a range starting then may reach. */
export function lastDayAllowed(from: string, days: number): string {
  return iso(DateTime.fromISO(from).plus({ days: days - 1 }));
}

/** "1 Oct to 28 Oct 2026", "28 Oct 2026": a period in words. */
export function periodLabel(from: string, to: string): string {
  const a = DateTime.fromISO(from);
  const b = DateTime.fromISO(to);
  if (!a.isValid || !b.isValid) return "";
  if (a.hasSame(b, "day")) return b.toFormat("d LLL yyyy");
  return a.hasSame(b, "year") ? `${a.toFormat("d LLL")} to ${b.toFormat("d LLL yyyy")}` : `${a.toFormat("d LLL yyyy")} to ${b.toFormat("d LLL yyyy")}`;
}
