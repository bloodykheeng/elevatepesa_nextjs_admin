"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MdPerson, MdLogout, MdKeyboardArrowDown } from "react-icons/md";
import { useAuth } from "@/contexts/AuthContext";

export interface UserMenuProps {
  /** Optional overrides; by default the signed-in user is read from AuthContext. */
  name?: string;
  email?: string;
  role?: string;
}

export default function UserMenu({
  name: nameProp,
  email: emailProp,
  role: roleProp,
}: UserMenuProps) {
  const { logoutMutation, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Falls back to the cookie-cached shape used before the profile query
  // resolves, then to a neutral placeholder, never a fake admin.
  const attributes = user as unknown as Record<string, string> | undefined;
  const name = nameProp ?? attributes?.name ?? (user as { name?: string })?.name ?? "Account";
  const email = emailProp ?? attributes?.email ?? (user as { email?: string })?.email ?? "";
  const role = roleProp ?? attributes?.role ?? (user as { role?: string })?.role ?? "";
  const title = attributes?.title ?? (user as { title?: string })?.title ?? "";

  // Where this account sits (branch, territories), in the menu rather than only on
  // the profile page: it decides what every screen shows (the user, 28 Oct 2026: a branch
  // manager sees their branch). Only what is set is drawn, so head office (no branch) gets no block.
  const placed = user as { branch?: { name: string } | null; territories?: { name: string }[] } | undefined;
  const assignment: Array<[string, string]> = [
    ...(placed?.branch?.name ? [["Branch", placed.branch.name] as [string, string]] : []),
    ...(placed?.territories?.length ? [[placed.territories.length === 1 ? "Territory" : "Territories", placed.territories.map((t) => t.name).join(", ")] as [string, string]] : []),
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-(--sidebar-hover-bg)"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
          {initials}
        </span>
        {/*
          CAPPED AND TRUNCATED, because a post-shaped name is long. An officer's
          account is named after the post rather than the person, so it reads
          "Kiboga District Social Development Officer" and pushed the whole
          header across. `title` gives the full string on hover, and opening the
          menu shows it in full anyway, so nothing is lost by cutting it here.

          The cap is deliberately tight. 18rem was tried first and never fired:
          "Kiboga District Social Development Officer" renders in about 17rem, so
          the header still stretched. 12rem cuts it at roughly the same point the
          sidebar footer does, which is what makes the two read as one account.
        */}
        <span className="hidden max-w-36 text-left md:block lg:max-w-48">
          <span
            title={name}
            className="block truncate text-sm font-medium leading-tight text-(--text-primary)"
          >
            {name}
          </span>
          <span className="block truncate text-xs leading-tight text-(--text-muted)">
            {role}
          </span>
        </span>
        <MdKeyboardArrowDown
          className={`text-(--text-muted) transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) py-1 shadow-(--shadow-md)">
          <div className="border-b border-(--border-color) px-4 py-3">
            {/* In full here, wrapping. This is the surface the truncated
                trigger above defers to, so cutting it twice would leave the
                name readable nowhere. */}
            <p className="wrap-break-word text-sm font-semibold text-(--text-primary)">
              {name}
            </p>
            {/* What they are called at work, above what the system calls them.
                "CAO" and "Town Clerk" are how an officer is addressed and how
                they identify themselves; `role` is ours and decides what the
                account may do. Both belong here, and the title first, because
                it is the one a person recognises as their own. */}
            {title && (
              <p className="text-xs text-(--text-secondary)">{title}</p>
            )}
            <p className="truncate text-xs text-(--text-muted)">{email}</p>
            <p className="mt-1 text-xs font-medium text-(--brand-ink)">{role}</p>
          </div>

          {assignment.length > 0 && (
            <div className="border-b border-(--border-color) px-4 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                Where you work
              </p>
              {/* Stacked and wrapping, not a truncated right-hand column.
                  "Trade, Industry and Local Economic Development" is a real
                  department name and the side-by-side version cut it at
                  "Trade, Industry and Loca…", which is the half that says
                  nothing: every department in the vote starts the same way.
                  A tooltip is no answer either, since it needs a mouse and
                  this menu is opened on a phone in the field. */}
              <dl className="space-y-2">
                {assignment.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-(--text-muted)">{label}</dt>
                    <dd className="wrap-break-word text-xs font-medium leading-snug text-(--text-primary)">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="py-1">
            {/* No "Settings" entry: the sidebar's Settings group is the real
                surface, and this one pointed nowhere. */}
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg)"
            >
              <MdPerson className="text-lg text-(--text-muted)" />
              My Profile
            </Link>
          </div>
          <div className="border-t border-(--border-color) py-1">
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {logoutMutation.isPending
                ? <span className="pi pi-spin pi-spinner text-lg" />
                : <MdLogout className="text-lg" />}
              {logoutMutation.isPending ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
