"use client";

import React, { useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dialog } from "@/components/common/Dialog";
import { Dropdown } from "primereact/dropdown";
import FilterSection from "@/components/dashboard/forms/FilterSection";
import InfiniteSelect, { type Option } from "@/components/dashboard/forms/InfiniteSelect";
import { shortDate } from "@/lib/format";

/** Values as the URL holds them: one string per key, "" when unset. */
export type FilterValues = Record<string, string>;

export type FilterField =
  /** One choice from a short fixed list. */
  | { type: "select"; key: string; label: string; options: { label: string; value: string }[]; placeholder?: string }
  /** From and To, as two URL keys (moments: a time can be picked). */
  | { type: "dateRange"; from: string; to: string; label: string }
  /**
   * One record from a long list (an account, an event), searched page by page. The id goes in
   * `key`, its label in `labelKey`, so the chip and the reopened dialog can name it.
   */
  | {
      type: "picker";
      key: string;
      labelKey: string;
      label: string;
      queryKey: (string | number | null)[];
      queryFn: (params: { page: number; search: string }) => Promise<AxiosResponse>;
      mapOption: (raw: any) => Option;
      placeholder: string;
      searchPlaceholder?: string;
      /**
       * Narrowed by what is picked above it in the dialog, before Apply (branch › territory › route, top
       * down): the list it searches, from the draft.
       */
      cascade?: (draft: FilterValues) => { queryKey: (string | number | null)[]; queryFn: (params: { page: number; search: string }) => Promise<AxiosResponse> };
      /** Keys emptied when this one changes: a new branch empties its territory and route. */
      clears?: string[];
    };

export interface FilterGroup {
  /** What the group is about (see FilterSection), never the name of a field inside it. */
  title: string;
  fields: FilterField[];
}

/** The URL keys a field writes. */
const keysOf = (f: FilterField): string[] => (f.type === "dateRange" ? [f.from, f.to] : f.type === "picker" ? [f.key, f.labelKey] : [f.key]);

/** Every URL key the groups write: what a list reads back with `getParam`. */
export const filterKeys = (groups: FilterGroup[]) => groups.flatMap((g) => g.fields.flatMap(keysOf));

/**
 * The filters in force as one sentence ("Kampala Central › Nakasero · Kololo › Kololo offices route · Person:
 * Sarah Nakato"), for a page or card to say under its title instead of chips (the user, 28 Oct 2026: chips beside
 * the buttons pushed the header out of shape). Places read top down; the rest name their label. Empty when none.
 */
export function describeFilters(groups: FilterGroup[], values: FilterValues): string {
  const place = ["branch", "territory", "route"];
  const fields = groups.flatMap((g) => g.fields);
  const where = place
    .map((k) => fields.find((f): f is Extract<FilterField, { type: "picker" }> => f.type === "picker" && f.key === k))
    .filter((f): f is Extract<FilterField, { type: "picker" }> => !!f && !!values[f.key])
    .map((f) => values[f.labelKey] || f.label);
  const rest = chipsFor(
    [{ title: "", fields: fields.filter((f) => !(f.type === "picker" && place.includes(f.key))) }],
    values,
  ).map((c) => c.text);
  return [where.join(" › "), ...rest].filter(Boolean).join(" · ");
}

/** One removable chip per filter in force, in words. */
function chipsFor(groups: FilterGroup[], values: FilterValues) {
  return groups.flatMap((g) =>
    g.fields.flatMap((f) => {
      if (f.type === "select") {
        const v = values[f.key];
        return v ? [{ id: f.key, text: `${f.label}: ${f.options.find((o) => o.value === v)?.label ?? v}`, clear: [f.key] }] : [];
      }
      if (f.type === "picker") {
        return values[f.key] ? [{ id: f.key, text: `${f.label}: ${values[f.labelKey] || "chosen"}`, clear: [f.key, f.labelKey] }] : [];
      }
      const from = values[f.from];
      const to = values[f.to];
      if (!from && !to) return [];
      const text = from && to ? `${shortDate(from)} to ${shortDate(to)}` : from ? `from ${shortDate(from)}` : `until ${shortDate(to)}`;
      return [{ id: f.from, text: `${f.label}: ${text}`, clear: [f.from, f.to] }];
    }),
  );
}

/**
 * The one Filters button a list carries next to its search (Alpha's and SDS's funnel):
 * everything but the search lives in its dialog, so the toolbar stays one line. The
 * filters in force show as chips beside it, each removable; the count rides on the button.
 * The dialog edits a draft and changes the list only on Apply.
 *
 *   <FiltersButton groups={groups} values={values} onApply={(v) => setFilters(v)} />
 */
export default function FiltersButton({
  groups,
  values,
  onApply,
  width = "34rem",
  compact = false,
  title = "Filters",
  chips: showChips = true,
}: {
  groups: FilterGroup[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  width?: string;
  /**
   * A card's own funnel (SDS's): an icon, narrowing that card only, its chips beside it so the card says what
   * it is narrowed to on its face. `title` names the dialog after the card.
   */
  compact?: boolean;
  title?: string;
  /** False where the filters are said as a sentence instead (describeFilters): the dashboards. */
  chips?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);
  useEffect(() => {
    if (open) setDraft(values);
    // Seeded as the dialog opens: the list's own values, not each re-render's copy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chips = chipsFor(groups, values);
  const set = (patch: FilterValues) => setDraft((d) => ({ ...d, ...patch }));
  const cleared = Object.fromEntries(filterKeys(groups).map((k) => [k, ""]));

  const field = (f: FilterField) => {
    if (f.type === "select") {
      return (
        <div key={f.key} className="space-y-1.5">
          <label className="block text-sm font-medium text-(--text-primary)">{f.label}</label>
          <Dropdown value={draft[f.key] || null} options={f.options} onChange={(e) => set({ [f.key]: e.value ?? "" })} placeholder={f.placeholder ?? "Any"} showClear className="w-full" />
        </div>
      );
    }
    if (f.type === "picker") {
      const value = draft[f.key] ? { value: draft[f.key], label: draft[f.labelKey] || draft[f.key] } : null;
      const list = f.cascade ? f.cascade(draft) : f;
      return (
        <div key={f.key} className="space-y-1.5 sm:col-span-2">
          <label className="block text-sm font-medium text-(--text-primary)">{f.label}</label>
          <InfiniteSelect
            queryKey={list.queryKey}
            queryFn={list.queryFn}
            mapOption={f.mapOption}
            value={value}
            onChange={(o) => {
              if ((o?.value ?? "") === (draft[f.key] ?? "")) return;
              set({ ...Object.fromEntries((f.clears ?? []).map((k) => [k, ""])), [f.key]: o?.value ?? "", [f.labelKey]: o?.label ?? "" });
            }}
            placeholder={f.placeholder}
            searchPlaceholder={f.searchPlaceholder}
          />
        </div>
      );
    }
    return (
      <React.Fragment key={f.from}>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-(--text-primary)">{f.label} from</label>
          <Calendar value={draft[f.from] ? new Date(draft[f.from]) : null} onChange={(e) => set({ [f.from]: e.value ? (e.value as Date).toISOString() : "" })} placeholder="Any time" showTime hideOnDateTimeSelect hourFormat="12" showButtonBar showIcon className="w-full" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-(--text-primary)">{f.label} to</label>
          <Calendar value={draft[f.to] ? new Date(draft[f.to]) : null} onChange={(e) => set({ [f.to]: e.value ? (e.value as Date).toISOString() : "" })} placeholder="Any time" showTime hideOnDateTimeSelect hourFormat="12" showButtonBar showIcon className="w-full" />
        </div>
      </React.Fragment>
    );
  };

  return (
    <>
      <span className="relative inline-flex">
        {compact ? (
          <Button type="button" size="small" severity="secondary" text rounded icon="pi pi-filter" onClick={() => setOpen(true)} aria-label={`${title}${chips.length ? `, ${chips.length} in use` : ""}`} tooltip={title} tooltipOptions={{ position: "top" }} />
        ) : (
          <Button type="button" size="small" severity="secondary" outlined icon="pi pi-filter" label="Filters" onClick={() => setOpen(true)} aria-label={`Filters${chips.length ? `, ${chips.length} in use` : ""}`} />
        )}
        {chips.length > 0 && (
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--brand) px-1 text-[0.65rem] font-bold text-white">{chips.length}</span>
        )}
      </span>
      {showChips && chips.map((c) => (
        <span key={c.id} className="inline-flex max-w-64 items-center gap-1 rounded-full bg-(--brand-light) py-1 pl-3 pr-1 text-xs font-medium text-(--brand-ink)">
          <span className="truncate">{c.text}</span>
          <button
            type="button"
            onClick={() => onApply({ ...values, ...Object.fromEntries(c.clear.map((k) => [k, ""])) })}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
            aria-label={`Remove ${c.text}`}
          >
            <span className="pi pi-times text-[0.6rem]" aria-hidden />
          </button>
        </span>
      ))}

      <Dialog
        header={title}
        visible={open}
        onHide={() => setOpen(false)}
        style={{ width: `min(${width}, 95vw)` }}
        modal
        maximizable
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button type="button" text severity="danger" icon="pi pi-times" label="Clear all" disabled={chips.length === 0 && Object.values(draft).every((v) => !v)} onClick={() => { onApply(cleared); setOpen(false); }} />
            <div className="flex gap-2">
              <Button type="button" text label="Cancel" onClick={() => setOpen(false)} />
              <Button type="button" icon="pi pi-check" label="Apply" onClick={() => { onApply({ ...cleared, ...draft }); setOpen(false); }} />
            </div>
          </div>
        }
      >
        <div className="space-y-6 pt-1">
          {groups.map((g) => (
            <FilterSection key={g.title} title={g.title}>
              {g.fields.map(field)}
            </FilterSection>
          ))}
        </div>
      </Dialog>
    </>
  );
}

/** The values a list's filter keys hold now, read from the URL. */
export function filterValuesFrom(groups: FilterGroup[], getParam: (key: string) => string): FilterValues {
  return Object.fromEntries(filterKeys(groups).map((k) => [k, getParam(k)]));
}
