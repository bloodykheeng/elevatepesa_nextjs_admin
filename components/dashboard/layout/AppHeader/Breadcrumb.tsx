"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdHome, MdChevronRight } from "react-icons/md";

import { useBreadcrumbState } from "@/contexts/BreadcrumbContext";
import { listReturnUrl } from "@/lib/listReturn";
import { menuGroups } from "@/lib/menuItems";
import type { NavItem } from "@/types/navigation";

// Where the URL segment and the sidebar label differ. Anything not listed is
// capitalised from the segment ("groups" -> "Groups"), which covers most pages.
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "Your profile",
  notifications: "Notifications",
};

/** The menu's own names, by page address: a crumb says what the sidebar says. */
const menuLabels: Record<string, string> = {};
const collect = (items: NavItem[]) => items.forEach((i) => { if (i.href) menuLabels[i.href] = i.label; if (i.children) collect(i.children); });
menuGroups.forEach((g) => collect(g.items));

/** Path segments that group pages but are not a page themselves. */
const HIDDEN_SEGMENTS = new Set(["catalog"]);

/**
 * Does this segment look like a record id rather than a word?
 *
 * ULIDs (26 of Crockford's base32) and UUIDs, which is everything this app puts
 * in a URL. Matched by shape rather than by a list of routes, so a detail page
 * added tomorrow does not have to remember to opt in.
 */
function looksLikeAnId(seg: string): boolean {
  return /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/.test(seg) || /^[0-9a-f-]{36}$/i.test(seg);
}

function label(seg: string, href?: string) {
  return (
    (href ? menuLabels[href] : undefined) ??
    routeLabels[seg] ??
    seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")
  );
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // `claimed` says a route has taken responsibility for naming this record;
  // `title` is the name once it has it. The two are separate so a crumb that is
  // still loading can show a skeleton rather than a word that names nothing.
  const { claimed, title: recordTitle, parents } = useBreadcrumbState();
  // The last id is the record shown; earlier ones are named from `parents`, in order.
  const idPositions = segments.map((seg, i) => (looksLikeAnId(seg) ? i : -1)).filter((i) => i >= 0);
  const lastId = idPositions.at(-1) ?? -1;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        aria-label="Home"
        className="flex items-center text-(--text-muted) transition-colors hover:text-(--text-primary)"
      >
        <MdHome className="text-[17px]" />
      </Link>

      {segments.map((seg, i) => {
        let href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        if (HIDDEN_SEGMENTS.has(seg)) return null;
        const pageHref = href;
        // A list under a record (a client's loan applications) is that record's tab.
        if (!looksLikeAnId(seg) && i > 0 && looksLikeAnId(segments[i - 1]) && !isLast) href = "/" + segments.slice(0, i).join("/") + `?tab=${seg}`;
        // A list goes back where it was left (its page, filters, search: lib/listReturn), once mounted.
        else if (mounted && !looksLikeAnId(seg) && !isLast) href = listReturnUrl(href);

        // An ID is never shown. What replaces it depends on whether anybody is
        // coming with a name:
        //
        //   a route claimed it and has one   the name
        //   a route claimed it, still loading  a skeleton, below
        //   nobody claimed it                "Details"
        const isRecord = looksLikeAnId(seg);
        const own = isRecord && i === lastId ? recordTitle : isRecord ? (parents?.[idPositions.indexOf(i)] ?? null) : null;
        const isResolving = isRecord && claimed && own === null;
        const text = isRecord ? (own ?? "Details") : label(seg, pageHref);

        return (
          <span key={`${seg}-${i}`} className="flex items-center gap-1">
            <MdChevronRight className="shrink-0 text-base text-(--text-muted)" />
            {isResolving ? (
              // The shape of the answer while it is on its way, which is what
              // every other loading state in this app shows. It replaced the
              // word "Details" flashing for the length of one request and then
              // being overwritten by the vote's name.
              <span
                aria-label="Loading"
                className="inline-block h-4 w-24 animate-pulse rounded bg-(--border-color) align-middle"
              />
            ) : isLast ? (
              <span className="max-w-[45vw] truncate font-semibold text-(--text-primary) sm:max-w-none">
                {text}
              </span>
            ) : (
              <Link
                href={href}
                className="text-(--text-muted) transition-colors hover:text-(--text-primary)"
              >
                {text}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
