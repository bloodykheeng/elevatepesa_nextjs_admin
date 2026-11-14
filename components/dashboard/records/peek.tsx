"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Opening a related record where you are: the customer on an order, the order a payment paid, an order in a
 * customer's latest orders. It opens as a dialog over the one you are reading, and closing it brings you
 * back, so reading never loses your place (NICE's context chips with their eye, the user, 14 Nov 2026:
 * "a link to the order, not automatically going to orders").
 *
 * The open ones are a stack: an order over a payment over a customer. Leaving the page closes them all.
 * The dialogs are drawn by RecordPeekHost (in the dashboard layout); anything inside it opens one with
 * `usePeek().open("order", 12)` or a <PeekLink>.
 */
export type PeekType = "order" | "package" | "user" | "payment" | "package-payment";

type Peeked = { type: PeekType; id: number; uid: number };

type PeekApi = {
  stack: Peeked[];
  open: (type: PeekType, id: number | string) => void;
  close: (uid: number) => void;
  closeAll: () => void;
};

const PeekContext = createContext<PeekApi | null>(null);

let next = 1;

export function RecordPeekProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Peeked[]>([]);
  const pathname = usePathname();

  // A link out of a peeked dialog (its History, "Open in Orders") leaves the page: nothing stays open over the next
  // one. Reset while rendering, React's pattern for state that follows a prop.
  const [at, setAt] = useState(pathname);
  if (at !== pathname) {
    setAt(pathname);
    setStack([]);
  }

  const open = useCallback((type: PeekType, id: number | string) => {
    const n = Number(id);
    if (!n) return;
    setStack((s) => {
      // Already the top one: a second click does nothing.
      const top = s[s.length - 1];
      if (top && top.type === type && top.id === n) return s;
      return [...s, { type, id: n, uid: next++ }];
    });
  }, []);
  const close = useCallback((uid: number) => setStack((s) => s.filter((p) => p.uid !== uid)), []);
  const closeAll = useCallback(() => setStack([]), []);

  const api = useMemo(() => ({ stack, open, close, closeAll }), [stack, open, close, closeAll]);
  return <PeekContext.Provider value={api}>{children}</PeekContext.Provider>;
}

export function usePeek(): PeekApi {
  const api = useContext(PeekContext);
  // Outside the dashboard (a test, a story) a link still renders; it just does nothing.
  return api ?? { stack: [], open: () => {}, close: () => {}, closeAll: () => {} };
}

/** A related record's name that opens it over the current dialog. */
export function PeekLink({ type, id, children, className = "", title }: {
  type: PeekType;
  id: number | string | null | undefined;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { open } = usePeek();
  if (!id) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); open(type, id); }}
      title={title ?? "Open its details"}
      className={`inline cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-(--brand-ink) hover:underline ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * The record a narrowed list is about, as a chip: what it is, its name, and an eye for its full details
 * (NICE's ContextChip).
 */
export function ContextChip({ kind, name, details, type, id }: {
  kind: string;
  name: React.ReactNode;
  details?: React.ReactNode;
  type: PeekType;
  id: number | string;
}) {
  const { open } = usePeek();
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-(--border-color) bg-(--bg-page) py-1 pr-1 pl-3 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">{kind}</span>
      {/* The name keeps its room; the details give way first. */}
      <span className="max-w-64 shrink-0 truncate font-semibold text-(--text-primary)">{name}</span>
      {details && <span className="hidden min-w-0 truncate text-xs text-(--text-muted) sm:inline">{details}</span>}
      <button type="button" onClick={() => open(type, id)} aria-label={`View this ${kind.toLowerCase()}'s details`} title="View details"
        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-(--brand-ink) hover:bg-(--brand-light)">
        <i className="pi pi-eye text-sm" aria-hidden />
      </button>
    </span>
  );
}
