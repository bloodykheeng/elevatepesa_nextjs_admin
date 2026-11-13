"use client";

import type { AuditField, AuditValueType } from "@/services/types/pesa";
import { dateTime, longDate, ugx } from "@/lib/format";
import { Thumb } from "./parts";

/**
 * Shows a value the audit trail froze when the entry was written (App\Support\Audit\Snapshot):
 * a relation as its name then, an enum as its label, money in UGX, a photo as a thumbnail that opens
 * full screen. Nothing is looked up now: the entry says what was true at the time.
 */
export function AuditValue({ type, value, columns }: { type: AuditValueType; value: unknown; columns?: AuditField["columns"] }) {
  if (type === "secret") return <span className="italic text-(--text-secondary)">Changed (never shown)</span>;
  if (value === null || value === undefined || value === "") return <span className="text-(--text-muted)">Empty</span>;

  switch (type) {
    case "relation":
    case "enum": {
      const v = value as { label?: string; value?: string; id?: number };
      return <>{v.label ?? v.value ?? String(v.id ?? "")}</>;
    }
    case "money":
      return <>{ugx(Number(value))}</>;
    case "number":
      return <>{Number(value).toLocaleString("en-UG")}</>;
    case "boolean":
      return <>{value ? "Yes" : "No"}</>;
    case "date":
      return <>{longDate(String(value))}</>;
    case "datetime":
      return <>{dateTime(String(value))}</>;
    case "file":
      return <Thumb src={String(value)} name="Photo" size="h-16 w-16" />;
    case "text":
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
    case "list": {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      if (!rows.length) return <span className="text-(--text-muted)">None</span>;
      const cols = columns ?? Object.keys(rows[0]).map((key) => ({ key, label: key, type: "string" as AuditValueType }));
      return (
        <div className="overflow-x-auto rounded-lg border border-(--border-color)">
          <table className="w-full text-xs">
            <thead className="bg-(--bg-page) text-left text-(--text-muted)">
              <tr>{cols.map((c) => <th key={c.key} className="px-2 py-1.5 font-medium">{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-(--border-color)">
                  {cols.map((c) => <td key={c.key} className="px-2 py-1.5"><AuditValue type={c.type ?? "string"} value={r[c.key]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return <>{typeof value === "object" ? JSON.stringify(value) : String(value)}</>;
  }
}

/** A create or delete: every field as it was. */
export function SnapshotTable({ fields }: { fields: AuditField[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.field} className={`min-w-0 ${f.type === "list" || f.type === "text" ? "sm:col-span-2" : ""}`}>
          <dt className="mb-0.5 text-xs text-(--text-muted)">{f.label}</dt>
          <dd className="wrap-break-word text-(--text-primary)"><AuditValue type={f.type} value={f.value} columns={f.columns} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** An edit: each changed field, before and after. On a phone each change is its own small card. */
export function ChangesTable({ fields }: { fields: AuditField[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-(--border-color) sm:block">
        <table className="w-full text-sm">
          <thead className="bg-(--bg-page) text-left text-xs text-(--text-muted)">
            <tr><th className="px-3 py-2 font-medium">Field</th><th className="px-3 py-2 font-medium">Before</th><th className="px-3 py-2 font-medium">After</th></tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.field} className="border-t border-(--border-color) align-top">
                <td className="px-3 py-2 font-medium text-(--text-secondary)">{f.label}</td>
                <td className="px-3 py-2 text-red-700 dark:text-red-300"><AuditValue type={f.type} value={f.old} columns={f.columns} /></td>
                <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300"><AuditValue type={f.type} value={f.new} columns={f.columns} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 list-none space-y-2 p-0 sm:hidden">
        {fields.map((f) => (
          <li key={f.field} className="rounded-xl border border-(--border-color) p-3 text-sm">
            <p className="m-0 mb-1.5 text-xs font-semibold text-(--text-secondary)">{f.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="block text-xs text-(--text-muted)">Before</span><span className="text-red-700 dark:text-red-300"><AuditValue type={f.type} value={f.old} columns={f.columns} /></span></div>
              <div><span className="block text-xs text-(--text-muted)">After</span><span className="text-emerald-700 dark:text-emerald-300"><AuditValue type={f.type} value={f.new} columns={f.columns} /></span></div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
