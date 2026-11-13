"use client";

import React, { useState, type MouseEvent } from "react";

/**
 * A short list in a table cell: the first `show` items, then "+2 more", expanded in place
 * on click (InlineExpandableText's sibling, for lists rather than prose). Keeps a column at
 * its natural width however many territories someone covers, so the table does not scroll.
 */
export default function ExpandableList({ items, show = 1, empty = "-" }: { items: string[]; show?: number; empty?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return <span className="text-(--text-muted)">{empty}</span>;

  const hidden = items.length - show;
  const toggle = (e: MouseEvent) => {
    // A cell click may open the row; this one only expands.
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <span className="text-sm">
      {(expanded ? items : items.slice(0, show)).join(", ")}
      {hidden > 0 && (
        <button type="button" onClick={toggle} className="ml-1.5 whitespace-nowrap text-xs font-medium text-(--brand-ink) hover:underline" aria-expanded={expanded}>
          {expanded ? "less" : `+${hidden} more`}
        </button>
      )}
    </span>
  );
}
