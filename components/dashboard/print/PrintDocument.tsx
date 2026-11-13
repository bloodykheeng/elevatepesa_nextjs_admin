"use client";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ExportColumn } from "@/lib/exportRows";
import { dateTime } from "@/lib/format";
import { chartBoxHeight, type PrintChart } from "./chartSvg";
import { printHtml } from "./printStyles";

/**
 * Every printed document's layout (SDS's printDocument, the letterhead): content in, a document out, printed
 * from its own iframe so it never exists on screen and printing it cannot print the page. "Save as PDF" in the
 * browser's print dialog is the PDF: every browser the office uses offers it, and a PDF engine in the bundle
 * would only make the file that dialog already makes (SDS's decision record).
 */
export function printDocument({
  title,
  subtitle,
  orientation = "portrait",
  fileName,
  children,
}: {
  /** What the document is, on every sheet. */
  title: string;
  /** What it is of: the period, the place, the filters. */
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  /** What the saved PDF is called; the title when unset. */
  fileName?: string;
  children: React.ReactNode;
}): void {
  const printed = dateTime(new Date().toISOString());
  const markup = renderToStaticMarkup(
    <>
      <table className="print-doc">
        <thead>
          <tr>
            <td>
              {/* A non-breaking space: an empty block can collapse, and then the thead reserves no room. */}
              <div className="print-head-space">&nbsp;</div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{children}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div className="print-foot-space">&nbsp;</div>
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="print-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${window.location.origin}/icon.svg`} alt="" className="print-head-logo" />
        <div>
          <div className="print-head-org">Elevate Pesa</div>
          <div className="print-head-unit">Field Sales</div>
        </div>
        <div className="print-head-doc">
          <div className="print-head-title">{title}</div>
          {subtitle && <div className="print-head-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="print-foot">
        <span>Elevate Pesa Admin</span>
        <span>Printed {printed}</span>
      </div>
    </>,
  );
  printHtml(markup, title, orientation, fileName ?? title);
}

/** Rows as a printed table, from the same columns the spreadsheet is written from, so the two cannot disagree. */
export function PrintTable<T>({ rows, columns }: { rows: T[]; columns: ExportColumn<T>[] }) {
  if (rows.length === 0) return <p className="print-empty">Nothing to show.</p>;
  const shown = (v: unknown) => (v instanceof Date ? dateTime(v.toISOString()) : typeof v === "number" ? v.toLocaleString("en-UG") : String(v ?? ""));
  // A column of numbers is right-aligned, its heading with it: a heading over the other edge reads as a separate column.
  const numeric = columns.map((c) => rows.some((r) => typeof c.value(r) === "number") && rows.every((r) => ["number", "undefined"].includes(typeof c.value(r)) || c.value(r) === null || c.value(r) === ""));
  return (
    <table className={`print-table${columns.length > 8 ? " print-table--wide" : ""}`}>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={c.header} className={numeric[i] ? "num" : undefined}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => {
              const v = c.value(row);
              return (
                <td key={c.header} className={typeof v === "number" ? "num" : undefined}>
                  {shown(v)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One part of a report: a heading, the chart as drawn (when it has one), and its figures as a table. */
export interface PrintSection {
  title: string;
  meta?: string;
  chart?: PrintChart | null;
  // Each section carries its own row type; the table only reads them through its columns.
  columns: ExportColumn<any>[];
  rows: unknown[];
}

/** A report of several parts (the Overview, Why & why not, the Field map's records), each chart then its table. */
export function printReport({ title, subtitle, sections, orientation = "portrait", fileName }: { title: string; subtitle: string; sections: PrintSection[]; orientation?: "portrait" | "landscape"; fileName?: string }) {
  const landscape = orientation === "landscape";
  printDocument({
    title,
    subtitle,
    orientation,
    fileName,
    children: (
      <>
        <h1 className="print-title">{title}</h1>
        <p className="print-lede">{subtitle}</p>
        {sections.map((s) => (
          <section key={s.title} className="print-section">
            <h2 className="print-h2">{s.title}</h2>
            {s.meta && <p className="print-meta">{s.meta}</p>}
            {s.chart && <div className="print-chart" style={{ height: chartBoxHeight(s.chart, landscape) }} dangerouslySetInnerHTML={{ __html: s.chart.markup }} />}
            <PrintTable rows={s.rows} columns={s.columns} />
          </section>
        ))}
      </>
    ),
  });
}
