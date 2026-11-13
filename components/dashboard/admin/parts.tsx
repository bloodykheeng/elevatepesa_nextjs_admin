"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { photoUrl } from "@/services/admin";
import { initials } from "@/lib/format";

/** The list's search box: submits on Enter or the button, never on every key. */
export function ListSearch({ value, onSearch, placeholder }: { value: string; onSearch: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(text.trim()); }} className="flex">
      <InputText value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Search" className="w-60 rounded-r-none! text-sm" />
      <Button type="submit" icon="pi pi-search" severity="secondary" outlined className="rounded-l-none!" aria-label="Search" />
    </form>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300",
  grey: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
};

const TONE_OF: Record<string, keyof typeof TONES> = {
  active: "green", completed: "green", delivered: "green", received: "green", paid: "green", sent: "green",
  pending: "amber", processing: "blue", queued: "blue", sending: "blue",
  cancelled: "red", failed: "red", inactive: "grey", skipped: "grey",
};

/** A status as a coloured pill, the same colours everywhere ("Paid" and "paid" alike). */
export function Pill({ value, label }: { value: string | null | undefined; label?: string }) {
  if (!value) return <span className="text-(--text-muted)">-</span>;
  const tone = TONES[TONE_OF[value.toLowerCase()] ?? "grey"];
  const text = label ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>{text}</span>;
}

/** A stored photo as a small square, or the name's initials when there is none. */
export function Thumb({ src, name, size = "h-10 w-10", round = false }: { src: string | null | undefined; name?: string; size?: string; round?: boolean }) {
  const url = photoUrl(src);
  const shape = round ? "rounded-full" : "rounded-lg";
  // A row whose file is missing on the server shows the initials, not a broken-image icon.
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) {
    return <span className={`flex ${size} ${shape} shrink-0 items-center justify-center bg-(--brand-light) text-xs font-semibold text-(--brand-ink)`}>{initials(name ?? "")}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element -- photos live on the API host, any size
  return <img src={url} alt={name ?? ""} loading="lazy" onError={() => setFailed(true)} className={`${size} ${shape} shrink-0 border border-(--border-color) bg-white object-cover`} />;
}

/** "mtn_mobile_money" as people say it. */
export const METHOD_LABEL: Record<string, string> = {
  mtn_mobile_money: "MTN MoMo",
  airtel_mobile_money: "Airtel Money",
  cash: "Cash",
  bank: "Bank",
};
export const methodLabel = (m: string | null | undefined) => (m ? METHOD_LABEL[m] ?? m : "-");

export const MODE_LABEL: Record<string, string> = { bnpl: "Pay later", cod: "Cash on delivery" };
export const modeLabel = (m: string | null | undefined) => (m ? MODE_LABEL[m] ?? m : "-");

/** A label/value list for select filters and dropdowns. */
export const choices = (values: string[], label: (v: string) => string = (v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ")) =>
  values.map((v) => ({ label: label(v), value: v }));
