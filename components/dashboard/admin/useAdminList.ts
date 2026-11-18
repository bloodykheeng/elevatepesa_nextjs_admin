"use client";

import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DataTablePageEvent, DataTableSortEvent } from "primereact/datatable";
import { useListParams, columnSortToParam, DEFAULT_PAGE } from "@/hooks/useListParams";
import { bulkDelete, listOf } from "@/services/admin";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import type { Paginated } from "@/services/types/pesa";

/** In the address, "every value" for a filter that has a default (an empty param means "use the default"). */
const ANY = "all";

/** The catalogue lists: active records only until the Status filter asks for more (the user, 18 Nov 2026). */
export const ACTIVE_BY_DEFAULT: Record<string, string> = { status: "active" };

/** The Status filter of a list that shows active records by default; its empty choice reads "Active only". */
export const STATUS_FILTER = [
  { label: "Active", value: "active" },
  { label: "Inactive (hidden in the app)", value: "inactive" },
  { label: "Any status", value: ANY },
];

/**
 * Everything a standard admin list needs, from the URL: page, page size, search, sort, the
 * filters named in `filterKeys` (each an API `filter[key]`), and `view` (the record open in its
 * View dialog). Because it all lives in the address, Back returns to the same page with the same
 * filters and the same dialog, a reload keeps it, and a link (the bell's) can open a record.
 *
 * `filterDefaults` applies a filter while the address names none (the catalogue's "active only"): the Filters button
 * shows it as chosen, and picking "Any status" writes `status=all`, so the choice survives a reload.
 */
export function useAdminList<T extends { id: number | string }>({
  path,
  filterKeys = [],
  filterDefaults = {},
  fetcher,
  enabled = true,
}: {
  /** The /api/admin/<path> list, and the query key root. */
  path: string;
  filterKeys?: string[];
  /** A value per filter key, used while the address has none. */
  filterDefaults?: Record<string, string>;
  /** Defaults to GET /api/admin/<path>. */
  fetcher?: (params: Record<string, string | number | undefined>) => Promise<Paginated<T>>;
  enabled?: boolean;
}) {
  const lp = useListParams();
  const { getParam: addressParam, setFilters: writeFilters } = lp;
  const queryClient = useQueryClient();
  const toast = usePrimeReactToast();

  // A filter's value as the list uses it: the address, else its default; "all" is every value.
  const defaultsKey = JSON.stringify(filterDefaults);
  const getParam = useCallback((key: string) => {
    const value = addressParam(key);
    const defaults = JSON.parse(defaultsKey) as Record<string, string>;
    return value || (defaults[key] ?? "");
  }, [addressParam, defaultsKey]);
  // Clearing a defaulted filter means "every value", not "back to the default".
  const setFilters = useCallback((updates: Record<string, string | number>) => {
    const defaults = JSON.parse(defaultsKey) as Record<string, string>;
    writeFilters(Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, k in defaults && (v === "" || v === undefined) ? ANY : v])));
  }, [writeFilters, defaultsKey]);

  // A string key for the filters in force: stable across renders while nothing changes.
  const keysKey = filterKeys.join(",");
  const valuesKey = JSON.stringify(filterKeys.map((k) => getParam(k)));
  const params = useMemo(() => {
    const keys = keysKey ? keysKey.split(",") : [];
    const values = JSON.parse(valuesKey) as string[];
    const p: Record<string, string | undefined> = { "filter[search]": lp.search || undefined, sort: lp.sort || undefined };
    keys.forEach((k, i) => (p[`filter[${k}]`] = values[i] && values[i] !== ANY ? values[i] : undefined));
    return p;
  }, [lp.search, lp.sort, keysKey, valuesKey]);

  const fetchPage = useCallback(
    (page: number, perPage: number) => (fetcher ?? ((q) => listOf<T>(path, q)))({ ...params, page, per_page: perPage }),
    [fetcher, path, params],
  );

  const query = useQuery({
    queryKey: [path, "list", lp.page, lp.pageSize, params],
    queryFn: () => fetchPage(lp.page, lp.pageSize),
    placeholderData: keepPreviousData,
    enabled,
  });

  // The record open in the View dialog, by id, in the URL.
  const viewId = lp.getParam("view");
  const openView = (id: number | string) => lp.pushParams({ view: String(id) });
  const closeView = () => lp.pushParams({ view: "" });

  const [selected, setSelected] = useState<T[]>([]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [path] });

  const remove = useMutation({
    mutationFn: (ids: (number | string)[]) => bulkDelete(path, ids),
    onSuccess: async (r) => {
      setSelected([]);
      await invalidate();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(r.message);
    },
  });

  /** Confirm, then delete the ticked rows. */
  const confirmDelete = (what: string, extra?: string) =>
    confirmAction({
      header: `Delete ${selected.length} ${what}${selected.length === 1 ? "" : "s"}?`,
      message: extra ?? "This cannot be undone.",
      danger: true,
      acceptLabel: "Delete",
      accept: () => remove.mutateAsync(selected.map((s) => s.id)),
    });

  return {
    ...lp,
    getParam,
    setFilters,
    params,
    query,
    rows: query.data?.data ?? [],
    total: query.data?.meta.total ?? 0,
    fetchPage,
    invalidate,
    viewId,
    openView,
    closeView,
    selected,
    setSelected,
    confirmDelete,
    /** Spread into PrimeReactDataTable. */
    table: {
      loading: query.isPending || query.isPlaceholderData,
      pagination: {
        total: query.data?.meta.total ?? 0,
        rows: lp.pageSize,
        first: lp.first,
        onPageChange: (e: DataTablePageEvent) => lp.pushParams({ page: (e.page ?? 0) + 1, pageSize: e.rows }),
      },
      sort: {
        field: lp.sortField,
        order: lp.sortOrder,
        onSort: (e: DataTableSortEvent) => lp.pushParams({ sort: columnSortToParam(e.sortField, e.sortOrder), page: DEFAULT_PAGE }),
      },
    },
  };
}
