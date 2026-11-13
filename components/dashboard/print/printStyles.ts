/**
 * The printed document's whole stylesheet, and the iframe it prints from (SDS's print, rebranded:
 * docs/dashboard-patterns.md "Exports and printing").
 *
 * A string, not globals.css: the document prints from an iframe of its own, which carries only what is put in
 * it. Printing by hiding the page around a report printed the page instead in SDS, twice; the frame removes the
 * question, needs no dependency, and no class renamed in the app can change what comes out of a printer.
 *
 * Elevate Pesa green #047857 and amber #F59E0B are repeated here, not imported, because
 * this must stand alone inside the frame.
 */
export const PRINT_STYLES = `
  @page { size: A4; margin: 14mm 12mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 10px; color: #1e1d55; background: #fff; }

  /* The running letterhead and footer: browsers have no page header, so the content sits in the wrapper
     table's tbody while its thead and tfoot reserve the room the fixed pair covers on every sheet. */
  .print-doc { width: 100%; border-collapse: collapse; }
  .print-head-space { height: 20mm; }
  .print-foot-space { height: 10mm; }
  .print-head {
    position: fixed; top: 0; left: 0; right: 0; display: flex; align-items: center; gap: 3mm;
    padding-bottom: 2.5mm; border-bottom: 1.2mm solid #F59E0B; background: #fff; z-index: 10;
  }
  .print-head-logo { height: 10mm; width: auto; }
  .print-head-org { font-size: 12px; font-weight: 700; color: #047857; }
  .print-head-unit { font-size: 8px; color: #64748b; }
  .print-head-doc { margin-left: auto; text-align: right; }
  .print-head-title { font-size: 12px; font-weight: 700; color: #047857; }
  .print-head-sub { font-size: 8px; color: #64748b; }
  .print-foot {
    position: fixed; bottom: 0; left: 0; right: 0; padding-top: 1.5mm; border-top: .5pt solid #e2e8f0;
    font-size: 7.5px; color: #64748b; display: flex; justify-content: space-between; background: #fff; z-index: 10;
  }

  .print-title { font-size: 17px; font-weight: 700; margin: 0; }
  .print-lede { font-size: 9px; color: #475569; margin: 1mm 0 0; line-height: 1.45; }
  .print-section { margin-top: 6mm; break-inside: auto; }
  .print-h2 { font-size: 12px; font-weight: 700; color: #047857; margin: 0 0 1mm; }
  .print-meta { font-size: 8.5px; color: #64748b; margin: 0 0 1.5mm; }

  /* A chart in a box its own shape, capped at the page, kept whole: half a chart across a break is no chart.
     The SVG is lifted from the screen in whatever theme the reader had, so its text is forced dark. */
  .print-chart { margin: 3mm 0 0; background: #fff; height: 120mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
  .print-chart svg { display: block; max-width: 100%; width: 100% !important; height: 100% !important; }
  .print-chart text { fill: #1e1d55 !important; }
  .print-chart .highcharts-background { fill: #fff !important; }

  .print-table { width: 100%; border-collapse: collapse; margin-top: 1.5mm; }
  .print-table th {
    background: #eef0fb; color: #334155; text-align: left; padding: 1.6mm 2mm; font-size: 7px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .06em; border-bottom: .6mm solid #047857;
  }
  .print-table td { padding: 1.3mm 2mm; border-bottom: .2mm solid #e2e8f0; font-size: 8px; vertical-align: top; }
  .print-table tr { break-inside: avoid; page-break-inside: avoid; }
  .print-table .num { text-align: right; white-space: nowrap; }
  /* Many columns: automatic layout will not shrink a column below its longest word and the browser clips the
     right of every page, so fixed layout shares the width out and wraps. */
  .print-table--wide { table-layout: fixed; }
  .print-table--wide th, .print-table--wide td { overflow-wrap: anywhere; font-size: 7px; padding: 1mm 1.2mm; }
  /* Matched at the num rule's weight, or its nowrap runs headings into their neighbours. */
  .print-table--wide th.num, .print-table--wide td.num { white-space: normal; }
  .print-empty { color: #64748b; font-style: italic; }
`;

/** What the saved PDF is called: everything Windows refuses taken out. */
function asFileName(text: string): string {
  return text.replace(/[/:*?"<>|\\]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Print one document from an off-screen iframe, then remove it. The tab is renamed for the length of the dialog:
 * the browser names a saved PDF after the page that called print(), not the frame's title.
 */
export function printHtml(html: string, title: string, orientation: "portrait" | "landscape" = "portrait", fileName?: string): void {
  const pageTitle = document.title;
  if (fileName) document.title = asFileName(fileName);
  const restore = () => {
    document.title = pageTitle;
  };

  const frame = document.createElement("iframe");
  // Off screen, not display:none: a hidden frame does not lay out, so its fixed letterhead lands on the content.
  frame.setAttribute(
    "style",
    `position:fixed;right:0;bottom:0;width:${orientation === "landscape" ? "297mm" : "210mm"};height:${orientation === "landscape" ? "210mm" : "297mm"};border:0;opacity:0;pointer-events:none;`,
  );
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    restore();
    return;
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>${PRINT_STYLES}` +
      (orientation === "landscape" ? "@page { size: A4 landscape; }" : "") +
      `</style></head><body>${html}</body></html>`,
  );
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // print() is not synchronous in Safari: tear down on a timer, never mid-dialog.
    window.setTimeout(() => {
      frame.remove();
      restore();
    }, 1000);
  };
  // The logo must be decoded first, or the letterhead prints blank on the first page.
  const image = doc.querySelector("img");
  if (image && !image.complete) {
    image.addEventListener("load", run, { once: true });
    image.addEventListener("error", run, { once: true });
    return;
  }
  run();
}
