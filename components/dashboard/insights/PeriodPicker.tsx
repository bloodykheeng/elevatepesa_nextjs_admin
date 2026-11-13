"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dialog } from "@/components/common/Dialog";
import { SelectButton } from "primereact/selectbutton";
import { calendarDate, calendarDay } from "@/lib/format";
import { QUICK_RANGES, daysIn, lastDayAllowed, periodLabel } from "@/lib/period";

type Mode = "day" | "range";

/**
 * "Pick days" (docs/dashboards.md): one day, or a first and a last day, NICE's Single date / Date range. Two
 * calendars, each picking one day, never one calendar picking two (it lost the first click whenever it was
 * redrawn). Changing the first day keeps the last when it still fits; the last day can never fall before the
 * first, after today, or past the page's longest period, so an impossible range cannot be picked. Nothing
 * changes on the page until Apply: the switch's presets are the one-tap way.
 */
export default function PeriodPicker({
  from,
  to,
  custom,
  maxDays,
  onApply,
}: {
  from: string;
  to: string;
  /** Whether the page's period was picked here (not a preset): the button then says which days. */
  custom: boolean;
  maxDays?: number;
  onApply: (range: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("range");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const today = calendarDay(new Date());

  const start = () => {
    setMode(from && from === to ? "day" : "range");
    setFirst(from);
    setLast(to);
    setOpen(true);
  };
  const pickFirst = (day: string) => {
    setFirst(day);
    // Non-destructive: the last day stays while it still fits after the new first one.
    if (last && (last < day || (maxDays && daysIn(day, last) > maxDays))) setLast("");
  };

  const range = mode === "day" ? { from: first, to: first } : { from: first, to: last };
  const days = range.from && range.to ? daysIn(range.from, range.to) : 0;
  const valid = days > 0 && (!maxDays || days <= maxDays);
  const lastMax = first && maxDays ? [lastDayAllowed(first, maxDays), today].sort()[0] : today;
  const quick = QUICK_RANGES.map((q) => ({ ...q, value: q.range() })).filter((q) => !maxDays || daysIn(q.value.from, q.value.to) <= maxDays);

  const apply = (r: { from: string; to: string }) => {
    onApply(r);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        icon="pi pi-calendar"
        label={custom ? periodLabel(from, to) : "Pick days"}
        outlined={!custom}
        onClick={start}
        aria-label={custom ? `Days: ${periodLabel(from, to)}. Pick other days` : "Pick days"}
        className="insights-days"
      />
      <Dialog header="Pick days" visible={open} onHide={() => setOpen(false)} style={{ width: "min(34rem, 95vw)" }} modal draggable={false}>
        <div className="space-y-4">
          <SelectButton
            value={mode}
            options={[
              { label: "One day", value: "day" },
              { label: "From and to", value: "range" },
            ]}
            onChange={(e) => e.value && setMode(e.value)}
            allowEmpty={false}
            aria-label="One day or a range"
          />

          <div>
            <p className="m-0 mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">Quick picks</p>
            <div className="flex flex-wrap gap-1.5">
              {quick.map((q) => (
                // The pick whose days are the ones chosen shows as chosen: the address keeps only the days, so a pick
                // reopened is found again by its days (the user, 10 Nov 2026).
                <Button key={q.label} type="button" size="small" outlined={!(q.value.from === range.from && q.value.to === range.to)} aria-pressed={q.value.from === range.from && q.value.to === range.to}
                  label={q.label} onClick={() => apply(q.value)} />
              ))}
            </div>
          </div>

          {mode === "day" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-(--text-primary)">Day</span>
              <Calendar
                value={calendarDate(first)}
                onChange={(e) => setFirst(e.value instanceof Date ? calendarDay(e.value) : "")}
                maxDate={calendarDate(today) ?? undefined}
                dateFormat="d M yy"
                showIcon
                showButtonBar
                readOnlyInput
                placeholder="Pick a day"
                inputId="period-day"
                className="w-full"
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-(--text-primary)">First day</span>
                <Calendar
                  value={calendarDate(first)}
                  onChange={(e) => pickFirst(e.value instanceof Date ? calendarDay(e.value) : "")}
                  maxDate={calendarDate(today) ?? undefined}
                  dateFormat="d M yy"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  placeholder="Pick the first day"
                  inputId="period-from"
                  className="w-full"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-(--text-primary)">Last day</span>
                <Calendar
                  value={calendarDate(last)}
                  onChange={(e) => setLast(e.value instanceof Date ? calendarDay(e.value) : "")}
                  minDate={calendarDate(first) ?? undefined}
                  maxDate={calendarDate(lastMax) ?? undefined}
                  disabled={!first}
                  dateFormat="d M yy"
                  showIcon
                  showButtonBar
                  readOnlyInput
                  placeholder={first ? "Pick the last day" : "Pick the first day first"}
                  inputId="period-to"
                  className="w-full"
                />
              </label>
            </div>
          )}

          <p className="m-0 text-sm text-(--text-secondary)" aria-live="polite">
            {valid ? `${periodLabel(range.from, range.to)} · ${days} day${days === 1 ? "" : "s"}` : mode === "day" ? "Pick a day." : !first ? "Pick the first day." : "Pick the last day."}
            {maxDays ? <span className="text-(--text-muted)"> · at most {maxDays} days here</span> : null}
          </p>

          <div className="flex justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Cancel" onClick={() => setOpen(false)} />
            <Button type="button" icon="pi pi-check" label="Apply" disabled={!valid} onClick={() => apply(range)} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
