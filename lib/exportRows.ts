import * as XLSX from "xlsx";
import { fetchAllPaginated } from "./fetchAllPaginated";
import { exportStamp, safeFilename } from "./exportFilename";
import { calendarMoment } from "./format";

/**
 * Export a whole filtered list, not just the page on screen.
 *
 * Walks the API page by page (the server never holds more than one page),
 * then writes typed cells: real numbers for money, real dates for dates, so a
 * reader can sum a column in Excel without retyping it. From Alpha's
 * pagination-and-exports rule.
 */

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | Date | null | undefined;
}

/** Every row of a filtered list, walked page by page (100 at a time). */
export function collectAll<T>(
  fetchPage: (page: number, perPage: number) => Promise<{ data: T[]; meta: { last_page: number } }>,
  onProgress?: (page: number, lastPage: number) => void,
): Promise<T[]> {
  return fetchAllPaginated<T>(
    (page, perPage) => fetchPage(page, perPage),
    (response) => {
      const r = response as { data: T[]; meta: { last_page: number } };
      return { rows: r.data, lastPage: r.meta?.last_page ?? 1 };
    },
    { perPage: 100, onProgress },
  );
}

/** Write rows already in hand as typed cells (numbers stay numbers, dates stay dates). */
export function writeRows<T>(rows: T[], columns: ExportColumn<T>[], fileName: string, format: "xlsx" | "csv" = "xlsx"): void {
  const sheet = XLSX.utils.aoa_to_sheet([
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row) ?? "")),
  ]);
  sheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  XLSX.writeFile(book, `${safeFilename(fileName, exportStamp())}.${format}`, { bookType: format, cellDates: true });
}

/** One sheet of a workbook: a report's part, with its own columns. */
export interface ExportSheet {
  name: string;
  // Each sheet carries its own row type; the writer only reads them through its columns.
  columns: ExportColumn<any>[];
  rows: unknown[];
}

/** A report of several parts as one workbook, a sheet each (the Overview, Why & why not, the Field map). */
export function writeWorkbook(sheets: ExportSheet[], fileName: string): void {
  const book = XLSX.utils.book_new();
  for (const s of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet([s.columns.map((c) => c.header), ...s.rows.map((row) => s.columns.map((c) => c.value(row) ?? ""))]);
    sheet["!cols"] = s.columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));
    // Excel refuses a sheet name over 31 characters or with any of : \ / ? * [ ].
    XLSX.utils.book_append_sheet(book, sheet, s.name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31));
  }
  XLSX.writeFile(book, `${safeFilename(fileName, exportStamp())}.xlsx`, { bookType: "xlsx", cellDates: true });
}

export async function exportAll<T>({
  fetchPage,
  columns,
  fileName,
  format = "xlsx",
  onProgress,
}: {
  fetchPage: (page: number, perPage: number) => Promise<{ data: T[]; meta: { last_page: number } }>;
  columns: ExportColumn<T>[];
  fileName: string;
  format?: "xlsx" | "csv";
  onProgress?: (page: number, lastPage: number) => void;
}): Promise<number> {
  const rows = await fetchAllPaginated<T>(
    (page, perPage) => fetchPage(page, perPage),
    (response) => {
      const r = response as { data: T[]; meta: { last_page: number } };
      return { rows: r.data, lastPage: r.meta?.last_page ?? 1 };
    },
    { perPage: 100, onProgress },
  );

  const sheet = XLSX.utils.aoa_to_sheet([
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => c.value(row) ?? "")),
  ]);
  sheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  XLSX.writeFile(book, `${safeFilename(fileName, exportStamp())}.${format}`, { bookType: format, cellDates: true });

  return rows.length;
}

/** An ISO string as a real Date cell on the Kampala clock (SheetJS writes a Date's local wall-clock), or blank. */
export const asDate = (iso: string | null | undefined): Date | null => calendarMoment(iso);
