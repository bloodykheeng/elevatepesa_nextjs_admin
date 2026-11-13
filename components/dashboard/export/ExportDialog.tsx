"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "@/components/common/Dialog";
import { ProgressBar } from "primereact/progressbar";
import { collectAll, writeRows, type ExportColumn } from "@/lib/exportRows";
import { PrintTable, printDocument } from "@/components/dashboard/print/PrintDocument";

export type ExportPageFetcher<T> = (page: number, perPage: number) => Promise<{ data: T[]; meta: { last_page: number; total?: number } }>;

/**
 * The one way out of a list (Alpha's ExportButton): opening it walks every page
 * matching the list's current filters, 100 rows at a time, while it counts what
 * has arrived; then Excel, CSV and PDF are written from those same rows, so the
 * files can never disagree and nothing is fetched twice. PDF is a printed document
 * (components/dashboard/print): "Save as PDF" in the print dialog makes the file.
 * Closing it stops the walk and drops the rows.
 */
export default function ExportDialog<T>({
  visible,
  onHide,
  fileName,
  fetchPage,
  columns,
  filtersSummary,
}: {
  visible: boolean;
  onHide: () => void;
  fileName: string;
  fetchPage: ExportPageFetcher<T>;
  columns: ExportColumn<T>[];
  /** What the export covers, in words: "Status: Paid · Search: Aisha". */
  filtersSummary?: string;
}) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [progress, setProgress] = useState<{ page: number; lastPage: number }>({ page: 0, lastPage: 1 });
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!visible) {
      run.current += 1;
      setRows(null);
      setError(null);
      setProgress({ page: 0, lastPage: 1 });
      return;
    }
    const mine = ++run.current;
    collectAll(fetchPage, (page, lastPage) => mine === run.current && setProgress({ page, lastPage }))
      .then((all) => mine === run.current && setRows(all))
      .catch(() => mine === run.current && setError("The export could not be fetched. Check your connection and try again."));
    // Re-run only when the dialog opens; the fetcher carries the filters of that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const percent = Math.round((progress.page / Math.max(1, progress.lastPage)) * 100);

  return (
    <Dialog header="Export" visible={visible} onHide={onHide} style={{ width: "min(32rem, 95vw)" }} modal>
      <div className="space-y-4 text-sm">
        <p className="text-(--text-secondary)">
          Every record matching the list as it is filtered now{filtersSummary ? `: ${filtersSummary}` : ", across all pages"}.
        </p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>
        ) : rows === null ? (
          <div className="space-y-2">
            <ProgressBar value={percent} showValue={false} style={{ height: "0.5rem" }} />
            <p className="text-xs text-(--text-muted)">
              Fetching page {Math.max(1, progress.page)} of {progress.lastPage}…
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-(--text-primary)">{rows.length.toLocaleString("en-US")} records ready.</p>
            <p className="mt-1 text-xs text-(--text-muted)">PDF opens the print dialog: choose Save as PDF there.</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-(--border-color) pt-4">
          <Button type="button" text label="Close" onClick={onHide} />
          <Button type="button" outlined icon="pi pi-file" label="CSV" disabled={!rows?.length} onClick={() => rows && writeRows(rows, columns, fileName, "csv")} />
          <Button
            type="button"
            outlined
            icon="pi pi-file-pdf"
            label="PDF"
            disabled={!rows?.length}
            onClick={() =>
              rows &&
              printDocument({
                title: fileName,
                subtitle: `${rows.length.toLocaleString("en-US")} records${filtersSummary ? ` · ${filtersSummary}` : ""}`,
                orientation: columns.length > 6 ? "landscape" : "portrait",
                children: <PrintTable rows={rows} columns={columns} />,
              })
            }
          />
          <Button type="button" icon="pi pi-file-excel" label="Excel" disabled={!rows?.length} onClick={() => rows && writeRows(rows, columns, fileName, "xlsx")} />
        </div>
      </div>
    </Dialog>
  );
}

/** A standalone Export button for screens that are not a table (cards, grids). */
export function ExportButton<T>(props: Omit<React.ComponentProps<typeof ExportDialog<T>>, "visible" | "onHide"> & { label?: string }) {
  const [open, setOpen] = useState(false);
  const { label = "Export", ...dialog } = props;
  return (
    <>
      <Button type="button" size="small" outlined icon="pi pi-download" label={label} onClick={() => setOpen(true)} />
      <ExportDialog {...dialog} visible={open} onHide={() => setOpen(false)} />
    </>
  );
}
