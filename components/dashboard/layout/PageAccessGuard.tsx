"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { mayOpen, pageRequirement } from "@/lib/pageAccess";
import type { NavGroup } from "@/types/navigation";

/**
 * A page the user may not open says so, instead of rendering an empty screen whose
 * every request the API refuses (a sales agent typing /dashboard/users). The
 * requirement comes from the menu (lib/pageAccess), so the sidebar and the guard always
 * agree. Alpha's PageAccessGuard. The API stays the security boundary; this is what the
 * person sees.
 */
export default function PageAccessGuard({ groups, children }: { groups: NavGroup[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, isProfileLoading } = useAuth();
  const requirement = pageRequirement(pathname, groups);

  // While the profile loads the page passes through, under the layout's loader: it must
  // stay in the tree for Next's validation, and its queries wait on their permissions.
  if (isProfileLoading || mayOpen(requirement, role)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-(--border-color) bg-(--bg-card) p-8 text-center shadow-sm">
        <span className="pi pi-lock text-3xl text-(--text-muted)" />
        <h1 className="mt-3 text-lg font-semibold text-(--text-primary)">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-(--text-muted)">
          {requirement?.label ? `${requirement.label} is not part of your role. ` : ""}
          If you need it, ask an administrator.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-(--border-color) px-4 py-2 text-sm font-medium text-(--brand) hover:bg-(--bg-page)"
        >
          <span className="pi pi-home text-xs" /> Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
