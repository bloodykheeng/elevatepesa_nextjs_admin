"use client";

import { usePathname } from "next/navigation";
import { CardsPageSkeleton, ListPageSkeleton, ReportPageSkeleton } from "@/components/dashboard/RecordSkeleton";

/**
 * Shown at once while a dashboard page's code and data arrive (Next.js loading.js; prefetched with the route), so a
 * navigation never shows a blank page (the user, 10 Nov 2026: "why is this showing a white screen, is it a crash").
 * In the shape of the page that is coming: the dashboard as a report, profile, roles and manual as cards, the rest as a list.
 */
export default function DashboardLoading() {
  const path = usePathname();
  if (path === "/dashboard") return <ReportPageSkeleton />;
  if (["/dashboard/profile", "/dashboard/user-manual", "/dashboard/roles"].some((p) => path.startsWith(p))) return <CardsPageSkeleton />;
  return <ListPageSkeleton />;
}
