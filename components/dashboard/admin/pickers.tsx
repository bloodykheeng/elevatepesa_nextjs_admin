"use client";

import { Calendar } from "primereact/calendar";
import axiosAPI from "@/services/axiosApi";
import { calendarMoment, pickedMoment } from "@/lib/format";

/** Customers to pick from (GET /admin/customers: Editors too, name, phone and email only). */
export const customerPicker = {
  queryKey: ["customers", "picker"] as (string | number | null)[],
  queryFn: ({ page, search }: { page: number; search: string }) =>
    axiosAPI.get("/admin/customers", { params: { page, per_page: 20, ...(search ? { "filter[search]": search } : {}) } }),
  mapOption: (u: { id: number; name: string; phone?: string | null; email?: string | null }) => ({
    label: u.name, value: String(u.id), note: u.phone ?? u.email ?? undefined, data: u,
  }),
};

/** "When it was placed": a time-picking Calendar on the Kampala clock, sent as an instant (empty = now). */
export function PlacedAtField({ value, onChange, id, label = "Placed" }: { value: string | null; onChange: (v: string | null) => void; id: string; label?: string }) {
  return (
    <Calendar inputId={id} value={calendarMoment(value)} onChange={(e) => onChange(e.value ? pickedMoment(e.value as Date, value, "start") : null)}
      showTime hideOnDateTimeSelect hourFormat="12" dateFormat="d M yy" showIcon showButtonBar maxDate={new Date()} placeholder="Now" className="w-full"
      aria-label={label} />
  );
}
