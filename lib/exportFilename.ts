import { businessNow } from "@/lib/format";

/**
 * What a downloaded file is called.
 *
 * ## Why a timestamp is part of the name
 *
 * Two exports of the same report ten minutes apart are two different answers,
 * and a browser silently renames the second `(1)`, which says nothing about
 * which is which. Local time, because the reader is in it.
 *
 * ## Why sanitising is shared
 *
 * A vote is `Vote: 005 Ministry of Public Service` and a period is
 * `FY 2025/2026`, so every filename this portal builds carries a colon and a
 * slash, and Windows refuses both. Each export had its own `replace` chain and
 * they had already begun to differ.
 */

/** `2026-08-23_1830`, which sorts in a folder listing the way a reader expects. */
export const exportStamp = (): string => businessNow().toFormat("yyyy-LL-dd_HHmm");

/**
 * The parts of a name, joined, with everything Windows refuses taken out.
 *
 * Empty parts are dropped rather than leaving a double space, so a caller can
 * pass a narrowing that may not be there without testing for it first.
 */
export const safeFilename = (...parts: (string | null | undefined)[]): string =>
  parts
    .filter(Boolean)
    .join(" ")
    .replace(/[/:*?"<>|\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
