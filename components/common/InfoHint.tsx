"use client";

import React, { useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";

/**
 * A small help overlay. Click the icon to pop a PrimeReact OverlayPanel that
 * explains what a card/chart/table shows and how its figure is derived. Used across
 * the dashboard and reports so help reads consistently.
 *
 * Icon convention: `?` (default) for actionable guidance, how to do something,
 * what blocks a save; `i` for reference: what a figure means or where it came
 * from. If the reader must DO something with it use `?`, if they only need to
 * KNOW it use `i`.
 *
 * Write the text to be scanned, never one long paragraph: a blank line starts a new
 * paragraph, and lines that start with "- " become bullet points.
 *
 *   "What the report lists.\n\n- First rule.\n- Second rule.\n\nWhat to do about it."
 */

/** "Term: detail" with the term in bold, when the term is short; otherwise the line as written. */
function Point({ line }: { line: string }) {
  const at = line.indexOf(": ");
  if (at < 1 || at > 32) return <>{line}</>;
  return (
    <>
      <span className="font-semibold text-(--text-primary)">{line.slice(0, at)}</span>: {line.slice(at + 2)}
    </>
  );
}

/** The help text as paragraphs and bullet lists. */
function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {lines.map((l, j) => <li key={j}><Point line={l.slice(2)} /></li>)}
            </ul>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
export default function InfoHint({ text, title, className, variant = "help", children }: {
  text: string;
  title?: string;
  className?: string;
  variant?: "help" | "info";
  /** Drawn under the text: a legend with the real colours and scales, where words alone do not show them. */
  children?: React.ReactNode;
}) {
  const op = useRef<OverlayPanel>(null);

  return (
    <>
      <button
        type="button"
        aria-label={title ?? (variant === "info" ? "About this" : "What is this?")}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); op.current?.toggle(e); }}
        className={`pi ${variant === "info" ? "pi-info-circle" : "pi-question-circle"} cursor-help border-0 bg-transparent p-0 text-sm leading-none text-(--text-muted) transition-colors hover:text-(--text-primary) ${className ?? ""}`}
      />
      <OverlayPanel ref={op} className="max-w-sm" dismissable>
        {/* A long one scrolls inside, never off a laptop's screen (1536×745). */}
        <div className="max-h-[min(34rem,75vh)] space-y-2 overflow-y-auto p-1 text-sm">
          {title && <p className="font-semibold text-(--text-primary)">{title}</p>}
          <div className="leading-relaxed text-(--text-secondary)"><Formatted text={text} /></div>
          {children && <div className="border-t border-(--border-color) pt-3">{children}</div>}
        </div>
      </OverlayPanel>
    </>
  );
}
