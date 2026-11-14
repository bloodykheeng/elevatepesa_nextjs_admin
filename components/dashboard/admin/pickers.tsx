"use client";

import { DateTime } from "luxon";
import { Calendar } from "primereact/calendar";
import axiosAPI from "@/services/axiosApi";
import { BUSINESS_TIMEZONE, businessNow, calendarMoment, onBusinessClock } from "@/lib/format";

/** Customers to pick from (GET /admin/customers: Editors too, name, phone and email only). */
export const customerPicker = {
  queryKey: ["customers", "picker"] as (string | number | null)[],
  queryFn: ({ page, search }: { page: number; search: string }) =>
    axiosAPI.get("/admin/customers", { params: { page, per_page: 20, ...(search ? { "filter[search]": search } : {}) } }),
  mapOption: (u: { id: number; name: string; phone?: string | null; email?: string | null }) => ({
    label: u.name, value: String(u.id), note: u.phone ?? u.email ?? undefined, data: u,
  }),
};

/**
 * What a "when it happened" pick means, as an instant to send ("...Z"), on the Kampala clock.
 *
 * The picker closes as soon as a day is clicked (hideOnDateTimeSelect), so the day's time cannot be set in the same
 * click: a new day keeps the time already there, or takes the current time for today and midday for another day,
 * never midnight (a payment picked for "today" read 12:00 am and fell before an order placed that evening, the user,
 * 14 Nov 2026). Reopening and changing only the time keeps the day. Then it is held between `min` (the order a payment
 * belongs to) and now.
 */
export function pickedInstant(picked: Date, previous: string | null | undefined, min?: string | null): string {
  const local = DateTime.fromJSDate(picked);
  let dt: DateTime = DateTime.fromObject({ year: local.year, month: local.month, day: local.day, hour: local.hour, minute: local.minute }, { zone: BUSINESS_TIMEZONE });
  const before = onBusinessClock(previous);
  const now = businessNow();
  if (!before || !before.hasSame(dt, "day")) {
    const time = before ?? (dt.hasSame(now, "day") ? now : dt.set({ hour: 12, minute: 0 }));
    dt = dt.set({ hour: time.hour, minute: time.minute, second: 0, millisecond: 0 });
  }
  if (dt > now) dt = now.set({ second: 0, millisecond: 0 });
  const floor = onBusinessClock(min);
  if (floor && dt < floor) dt = floor;
  return dt.toUTC().toISO() ?? "";
}

/**
 * "When it happened" (an order placed, a payment made): a time-picking Calendar on the Kampala clock, sent as an
 * instant, empty = now. Days before `min` and after today cannot be picked.
 */
export function PlacedAtField({ value, onChange, id, label = "Placed", min }: {
  value: string | null;
  onChange: (v: string | null) => void;
  id: string;
  label?: string;
  min?: string | null;
}) {
  return (
    <Calendar inputId={id} value={calendarMoment(value)} onChange={(e) => onChange(e.value ? pickedInstant(e.value as Date, value, min) : null)}
      showTime hideOnDateTimeSelect hourFormat="12" dateFormat="d M yy" showIcon showButtonBar
      minDate={min ? calendarMoment(min) ?? undefined : undefined} maxDate={new Date()} placeholder="Now" className="w-full"
      aria-label={label} />
  );
}
