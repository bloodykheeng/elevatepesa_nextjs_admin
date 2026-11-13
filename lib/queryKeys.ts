"use client";

import type { QueryClient } from "@tanstack/react-query";

/**
 * Every query root this dashboard uses, and what depends on what (SDS's map).
 *
 * TanStack matches a key by prefix, so a cascade stops at the resource boundary: the
 * users list shows each person's branch and territories, so renaming a territory must
 * refresh it too. The hierarchy stays flat and the edges are declared:
 *
 *   - `root` is the prefix every one of that resource's queries starts with.
 *   - `dependents` names the roots holding a copy of it, resolved transitively.
 *   - `channel` and `events` are the Reverb names, beside the dependents so a save and a
 *     broadcast cascade through the same map.
 */

export interface ResourceDefinition {
  /** The prefix every query for this resource starts with. */
  root: string;
  /** Roots that embed this resource and must refresh with it. */
  dependents?: string[];
  /** The Reverb channel, where the API broadcasts one. */
  channel?: string;
  /** Broadcast names, without Echo's leading dot. */
  events?: string[];
}

/**
 * The register of what a change reaches. Only real edges: an edge belongs here when the
 * dependent query RENDERS a field of the parent, not when the two are merely related.
 */
export const RESOURCES = {
  // Staff accounts: UserController broadcasts on `users` (App\Events\UserEvent).
  users: {
    root: "users",
    channel: "users",
    events: ["user.created", "user.updated", "user.deleted"],
  },
  // Locations: a branch's name shows on territories, routes, users and clients; a territory's
  // on routes, users and clients; a route's on users ("only these routes") and clients.
  branches: { root: "branches", dependents: ["territories", "routes", "users", "clients"] },
  territories: { root: "territories", dependents: ["routes", "users", "clients"] },
  routes: { root: "routes", dependents: ["users", "clients", "prospect-targets"] },
  // The client pipeline and each client's record; a target's progress counts clients.
  clients: { root: "clients", dependents: ["prospect-targets", "leads", "journey-plans"] },
  // Leads: a lead shows on its client's row (the stage) and record (the leads), and on plans.
  "leads": { root: "leads", dependents: ["clients", "journey-plans"] },
  // Lead journey plans: the list, its figures, one plan; a client's record names its plans.
  "journey-plans": { root: "journey-plans", dependents: ["clients"] },
  // Visits and refused check-ins: a visit shows on its lead's record, and counts on its plan.
  // A client's KYC says who is checked in there now.
  visits: { root: "visits", dependents: ["clients", "journey-plans", "kyc"] },
  // KYC: completing it moves the lead and the client's stage on.
  kyc: { root: "kyc", dependents: ["leads", "visits"] },
  // Loan applications: one shows on its client's record (the stage, once disbursed) and its visit (sent).
  "loan-applications": { root: "loan-applications", dependents: ["clients", "visits", "kyc"] },
  // Loan products: an application names its product.
  "loan-products": { root: "loan-products", dependents: ["loan-applications"] },
  // Approval workflows (Admin): nothing else shows them.
  "approval-workflows": { root: "approval-workflows" },
  // Prospect targets: the list, its figures, one target with its routes.
  "prospect-targets": { root: "prospect-targets" },
} as const satisfies Record<string, ResourceDefinition>;

export type ResourceName = keyof typeof RESOURCES;

/**
 * Every root a change to this resource has to reach, itself included. Depth-first with a
 * seen set, so the map may be written as single edges and a cycle terminates.
 */
export function affectedRoots(resource: ResourceName): string[] {
  const seen = new Set<string>();

  const visit = (name: string) => {
    if (seen.has(name)) return;

    seen.add(name);

    const definition = (RESOURCES as Record<string, ResourceDefinition>)[name];

    definition?.dependents?.forEach(visit);
  };

  visit(RESOURCES[resource].root);

  return [...seen];
}

/**
 * Invalidate a resource and everything holding a copy of it. Awaited by its caller,
 * always, before a dialog closes: fire and forget races the close and leaves the list
 * showing the row as it was.
 */
export function invalidateResource(queryClient: QueryClient, resource: ResourceName): Promise<unknown> {
  return Promise.all(affectedRoots(resource).map((root) => queryClient.invalidateQueries({ queryKey: [root] })));
}

/**
 * The same, for a change that REMOVES rows: `resetQueries` on the resource itself, because
 * a deleted row must be gone rather than stale (left on screen it can be ticked and deleted
 * a second time). Its dependents are only invalidated.
 */
export function resetResource(queryClient: QueryClient, resource: ResourceName): Promise<unknown> {
  const [own, ...rest] = affectedRoots(resource);

  return Promise.all([
    queryClient.resetQueries({ queryKey: [own] }),
    ...rest.map((root) => queryClient.invalidateQueries({ queryKey: [root] })),
  ]);
}
