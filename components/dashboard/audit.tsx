"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog } from "@/components/common/Dialog";
import { Button } from "primereact/button";
import { dateTime } from "@/lib/format";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import type { Audited, UserReference } from "@/services/types/pesa";

export type { Audited, UserReference };

/**
 * Who made a record and who last changed it, the way Alpha and SDS show it:
 * four columns every list carries, hidden until switched on from the column
 * menu, and the same four at the foot of every details dialog.
 */


/** The same four facts as typed spreadsheet cells, for an `exportAll` column list. */
export function auditExportColumns<T extends Audited>({ people = true }: { people?: boolean } = {}): ExportColumn<T>[] {
  return [
    { header: "Created", value: (row) => asDate(row.created_at) },
    ...(people ? [{ header: "Created by", value: (row: T) => row.created_by?.name }] : []),
    { header: "Updated", value: (row) => asDate(row.updated_at) },
    ...(people ? [{ header: "Updated by", value: (row: T) => row.updated_by?.name }] : []),
  ];
}

/** A person in a table cell: name, and the email under it. */
export function UserReferenceCell({ user }: { user?: UserReference | null }) {
  if (!user) return <span className="text-(--text-muted)">N/A</span>;
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-(--text-primary)">{user.name}</p>
      {user.email && <p className="truncate text-xs text-(--text-muted)">{user.email}</p>}
    </div>
  );
}

/**
 * The four audit columns, hidden by default. A record written by no signed-in person
 * (a system job) has no `created_by`: pass `people: false`.
 */
export function auditColumns<T extends Audited>({ people = true, updated = true, created = true }: {
  people?: boolean;
  updated?: boolean;
  /** False when the list already shows `created_at` under its own name ("Placed", "Booked"): two columns on one
   * field crash the table (React's duplicate key, the user, 14 Nov 2026). */
  created?: boolean;
} = {}) {
  return [
    ...(created ? [{
      field: "created_at", mobile: false,
      header: "Created",
      type: "date",
      sortable: true,
      visible: false,
      body: (row: T) => <span className="text-sm text-(--text-muted)">{dateTime(row.created_at)}</span>,
      exportValue: (row: T) => row.created_at ?? "",
    }] : []),
    ...(updated
      ? [
          {
            field: "updated_at", mobile: false,
            header: "Updated",
            type: "date",
            visible: false,
            body: (row: T) => <span className="text-sm text-(--text-muted)">{dateTime(row.updated_at)}</span>,
            exportValue: (row: T) => row.updated_at ?? "",
          },
        ]
      : []),
    ...(people
      ? [
          {
            field: "created_by.name",
            header: "Created by",
            visible: false,
            body: (row: T) => <UserReferenceCell user={row.created_by} />,
            exportValue: (row: T) => row.created_by?.name ?? "",
          },
          ...(updated
            ? [
                {
                  field: "updated_by.name",
                  header: "Updated by",
                  visible: false,
                  body: (row: T) => <UserReferenceCell user={row.updated_by} />,
                  exportValue: (row: T) => row.updated_by?.name ?? "",
                },
              ]
            : []),
        ]
      : []),
  ];
}

// A record whose relation was not loaded carries the bare id (a number): that is no person to show.
const person = (user?: UserReference | null) => (user && typeof user === "object" && user.name ? `${user.name}${user.email ? ` · ${user.email}` : ""}` : "N/A");

/** Who made a record, in the record's own words where "Created by" would mislead: an order's `created_by` is the
 * customer, so its dialog says "Placed by: Jane, in the app" or "Placed by: Sam (staff), from the dashboard". */
export interface AuditCreator {
  label: string;
  value: string;
}

/** The audit block at the foot of a details dialog: who first (created by, updated by), the dates under. */
export function AuditDetails({ record, people = true, creator }: { record: Audited; people?: boolean; creator?: AuditCreator }) {
  const cells: [string, string][] = [
    ...(people
      ? ([
          creator ? [creator.label, creator.value] : ["Created by", person(record.created_by)],
          ["Updated by", person(record.updated_by)],
        ] as [string, string][])
      : []),
    ["Created", dateTime(record.created_at) || "N/A"],
    ["Last updated", dateTime(record.updated_at) || "N/A"],
  ];

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-(--border-color) pt-4 text-sm sm:grid-cols-2">
      {cells.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="mb-0.5 text-xs text-(--text-muted)">{label}</p>
          <p className="wrap-break-word text-(--text-secondary)">{value}</p>
        </div>
      ))}
    </div>
  );
}

export interface DetailField {
  label: string;
  value: React.ReactNode;
  /** Spans both columns: long text such as a message or a description. */
  wide?: boolean;
}

/**
 * A record's details, read only: its fields in two columns, then who made and
 * changed it. One shape for every list's eye button.
 */
export function RecordDetailsDialog({
  header,
  visible,
  onHide,
  record,
  fields,
  people = true,
  creator,
  children,
  links,
  footer,
  width = "min(40rem, 95vw)",
  loading = false,
  error,
  after,
  history,
  photo,
  top,
}: {
  header: React.ReactNode;
  visible: boolean;
  onHide: () => void;
  record: Audited | null;
  fields: DetailField[];
  /** False for records written by no signed-in person, which have no creator account. */
  people?: boolean;
  /** The first person in the audit block in the record's own words (an order's "Placed by"). */
  creator?: AuditCreator;
  /** Anything below the fields and above the audit block (a list, a message). */
  children?: React.ReactNode;
  /** Links to the records this one belongs with, above the fields (a visit's client and KYC). */
  links?: React.ReactNode;
  footer?: React.ReactNode;
  /** Wider for a record whose details hold a list (an announcement's Who read it). */
  width?: string;
  /** The record is still being fetched: the same dialog shows its shape, never a second one that swaps in. */
  loading?: boolean;
  /** It could not be read: said in the same dialog. */
  error?: React.ReactNode;
  /** At the very foot, under who made and changed it: the decision, where Alpha's ApprovalActionBar sits (the user,
   * 30 Oct 2026: "your decision has to be last, not in the middle"). */
  after?: React.ReactNode;
  /** The record in the audit trail (Admin only): its model name ("Order") and id. */
  history?: { type: string; id: number | string };
  /** The record's picture, beside the fields from a tablet up (above them on a phone), never alone on a row with
   * the right half empty (the user, 14 Nov 2026). */
  photo?: React.ReactNode;
  /** A summary band above the fields (a customer's contact and totals). */
  top?: React.ReactNode;
}) {
  const { role } = useAuth();
  return (
    <Dialog
      header={header}
      visible={visible}
      onHide={onHide}
      style={{ width }}
      modal
      maximizable
      footer={footer ?? <Button label="Close" text onClick={onHide} />}
    >
      {!record && error && <p className="m-0 text-sm text-(--text-muted)">{error}</p>}
      {!record && !error && loading && (
        <div className="space-y-4" aria-label="Loading">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-(--border-color)" />
                <div className="h-4 w-44 animate-pulse rounded bg-(--border-color)" />
              </div>
            ))}
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-(--border-color)" />
          ))}
        </div>
      )}
      {record && (
        <div className="space-y-5">
          {/* Following one of its links closes the dialog: Next keeps the page left mounted, and coming
              back would find the dialog still open over it. */}
          {links && (
            <div onClickCapture={(e) => (e.target as HTMLElement).closest("a") && onHide()}>{links}</div>
          )}
          {top}
          <div className={photo ? "flex flex-col gap-5 sm:flex-row sm:items-start" : ""}>
            {photo && <div className="shrink-0 self-center sm:self-start">{photo}</div>}
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm sm:gap-x-6">
              {fields.map((f, i) => (
                // Index too: two fields may share a label, and a repeated key drops one of them.
                <div key={`${i}-${f.label}`} className={`min-w-0 ${f.wide ? "col-span-2" : ""}`}>
                  <dt className="mb-0.5 text-xs text-(--text-muted)">{f.label}</dt>
                  <dd className="wrap-break-word text-(--text-primary)">{f.value ?? "N/A"}</dd>
                </div>
              ))}
            </dl>
          </div>
          {children}
          <AuditDetails record={record} people={people} creator={creator} />
          {history && role === "Admin" && (
            <Link href={`/dashboard/audit-trail?subject_type=${history.type}&subject_id=${history.id}`} onClick={onHide}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-(--brand-ink)">
              <i className="pi pi-history text-xs" aria-hidden /> History: every change to this, who made it and when
            </Link>
          )}
          {after}
        </div>
      )}
    </Dialog>
  );
}
