"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { CardsPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import { confirmSubmit } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { adminApi } from "@/services/admin";
import type { Role } from "@/services/types/pesa";

const WHAT: Record<string, string> = {
  Admin: "Everything, including accounts, roles and messages to customers. Always holds every permission.",
  Editor: "Day-to-day work: orders, packages, payments, the catalogue and the app's content. Not accounts, roles or messages.",
  Customer: "The mobile app's role. Cannot open this dashboard.",
};

function RoleCard({ role, all }: { role: Role; all: string[] }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<string[]>(role.permissions);
  useEffect(() => setPicked(role.permissions), [role.permissions]);
  const dirty = [...picked].sort().join() !== [...role.permissions].sort().join();

  const save = useMutation({
    mutationFn: () => adminApi.saveRole(role.id, picked),
    onSuccess: (r) => { toast.success(r.message); queryClient.invalidateQueries({ queryKey: ["roles"] }); },
  });

  return (
    <Card title={`${role.name} · ${role.users_count.toLocaleString("en-UG")} ${role.users_count === 1 ? "account" : "accounts"}`}>
      <p className="m-0 mb-4 text-sm text-(--text-secondary)">{WHAT[role.name] ?? ""}</p>
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-(--brand-ink)">Permissions ({picked.length} of {all.length})</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {all.map((p) => (
            <label key={p} className={`flex items-center gap-2 text-sm ${role.locked ? "opacity-70" : "cursor-pointer"}`}>
              <Checkbox checked={picked.includes(p)} disabled={role.locked} onChange={(e) => setPicked((cur) => (e.checked ? [...cur, p] : cur.filter((x) => x !== p)))} />
              {p}
            </label>
          ))}
        </div>
        {!role.locked && (
          <div className="mt-4 flex justify-end">
            <Button label="Save" icon="pi pi-check" size="small" disabled={!dirty} loading={save.isPending} onClick={() => confirmSubmit(`the ${role.name} permissions`, () => save.mutateAsync())} />
          </div>
        )}
      </details>
    </Card>
  );
}

/**
 * The roles. Pages in this dashboard are opened by role (Admin, Editor); the permission list is
 * kept from the old system and does not change what a page shows.
 */
export default function Roles() {
  const q = useQuery({ queryKey: ["roles"], queryFn: adminApi.roles });
  if (q.isPending) return <CardsPageSkeleton padded={false} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Roles & access" subtitle="Who can do what. To give someone a role, edit their account in Customers & staff." />
      <div className="grid gap-5 lg:grid-cols-3">
        {(q.data?.data ?? []).map((r) => <RoleCard key={r.id} role={r} all={q.data?.permissions ?? []} />)}
      </div>
    </div>
  );
}
