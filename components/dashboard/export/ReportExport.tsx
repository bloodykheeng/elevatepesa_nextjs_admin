"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { ProgressBar } from "primereact/progressbar";
import { writeWorkbook, type ExportSheet } from "@/lib/exportRows";
import { chartToPrintSvg } from "@/components/dashboard/print/chartSvg";
import { printReport } from "@/components/dashboard/print/PrintDocument";

/** A part of the report: its figures, and the title of the chart card on the page that draws them (lifted for the PDF). */
export interface ReportPart extends ExportSheet {
  meta?: string;
  chartCard?: string;
}

/**
 * A report page's one Export (SDS's ComparisonExportButton; docs/dashboard-patterns.md "Exports and printing"):
 * for pages that are charts and cards rather than one list. Opening it gathers every figure the page stands on
 * (`collect`, which walks the pages where the figures are paged, with its progress shown), then Excel writes
 * them as one workbook, a sheet per part, and PDF prints them as one document, each chart as it is drawn on
 * the screen followed by its figures as a table. Nothing is fetched before the dialog opens; closing drops it.
 */
export default function ReportExport({
  title,
  subtitle,
  fileName,
  collect,
  orientation = "portrait",
  disabled,
}: {
  title: string;
  /** What it covers: the period, the place, the filters. */
  subtitle: string;
  fileName: string;
  collect: (onProgress: (done: number, of: number) => void) => Promise<ReportPart[]>;
  orientation?: "portrait" | "landscape";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<ReportPart[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, of: 1 });
  const [error, setError] = useState(false);
  const [printing, setPrinting] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    if (!open) {
      run.current += 1;
      setParts(null);
      setError(false);
      setProgress({ done: 0, of: 1 });
      return;
    }
    const mine = ++run.current;
    collect((done, of) => mine === run.current && setProgress({ done, of }))
      .then((p) => mine === run.current && setParts(p))
      .catch(() => mine === run.current && setError(true));
    // Gathered once per opening, with the page's filters of that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rows = parts?.reduce((n, p) => n + p.rows.length, 0) ?? 0;

  const pdf = async () => {
    if (!parts) return;
    setPrinting(true);
    // The charts are lifted now, so the picture is the one still on the screen behind the dialog.
    const sections = await Promise.all(
      parts.map(async (p) => ({
        ...p,
        title: p.name,
        chart: p.chartCard ? await chartToPrintSvg(document.querySelector<HTMLElement>(`[data-chart-card="${CSS.escape(p.chartCard)}"]`)) : null,
      })),
    );
    printReport({ title, subtitle, sections, orientation, fileName });
    setPrinting(false);
  };

  return (
    <>
      <Button type="button" outlined icon="pi pi-download" label="Export" onClick={() => setOpen(true)} disabled={disabled} className="insights-days" />
      <Dialog header={`Export: ${title}`} visible={open} onHide={() => setOpen(false)} style={{ width: "min(30rem, 95vw)" }} modal draggable={false}>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-(--bg-page) p-3">
            <p className="m-0 font-medium text-(--text-primary)">{title}</p>
            <p className="m-0 mt-1 text-xs text-(--text-muted)">{subtitle}</p>
          </div>
          {error ? (
            <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/30 dark:text-red-300">The figures could not be fetched. Check your connection and try again.</p>
          ) : parts === null ? (
            <div className="space-y-2">
              <ProgressBar value={Math.round((progress.done / Math.max(1, progress.of)) * 100)} showValue={false} style={{ height: "0.5rem" }} />
              <p className="m-0 text-xs text-(--text-muted)">Gathering the figures{progress.of > 1 ? `: page ${Math.max(1, progress.done)} of ${progress.of}` : ""}…</p>
            </div>
          ) : (
            <p className="m-0 text-(--text-secondary)">
              {parts.length} part{parts.length === 1 ? "" : "s"}, {rows.toLocaleString("en-US")} row{rows === 1 ? "" : "s"}. Excel holds every figure, a sheet per part; PDF opens the print dialog with the charts as shown: choose Save as PDF there.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-(--border-color) pt-4">
            <Button type="button" text label="Close" onClick={() => setOpen(false)} />
            <Button type="button" outlined icon="pi pi-file-pdf" label="PDF" disabled={!parts} loading={printing} onClick={pdf} />
            <Button type="button" icon="pi pi-file-excel" label="Excel" disabled={!parts} onClick={() => parts && writeWorkbook(parts, fileName)} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
