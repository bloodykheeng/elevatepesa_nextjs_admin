"use client";

import { Button } from "primereact/button";
import axiosAPI from "@/services/axiosApi";
import { describeFilters, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { useOptions } from "./RecordForm";
import { choices, modeLabel } from "./parts";

/**
 * What an order is narrowed to by what was in it: a product, or a whole kind (an inventory type, a gas and water
 * category, an electronics category). The dashboard filters by these (the old dashboard's Products and Inventory
 * Types, the user, 14 Nov 2026), and its arrows carry them to Orders and Order payments, whose API takes the same
 * keys (pesa_back Order::scopeMatching). An order matches when any of its items does.
 */
export const ORDER_ITEM_KEYS = ["product", "inventory_type", "product_category", "electronic_category"] as const;
/** Item filters and the order's own statuses: what the dashboard passes on. */
export const ORDER_FILTER_KEYS = [...ORDER_ITEM_KEYS, "delivery_status", "payment_status", "payment_mode"];
/** The product picker keeps the product's name beside its id in the address, for the chip; never sent to the API. */
export const PRODUCT_LABEL_KEY = "product_label";

const named = (rows: { id: number; name: string }[] | undefined) => (rows ?? []).map((r) => ({ label: r.name, value: String(r.id) }));

/** The "What was ordered" group of a Filters dialog. */
export function useOrderItemGroup(): FilterGroup {
  const o = useOptions().data;
  return {
    title: "What was ordered",
    fields: [
      {
        type: "picker",
        key: "product",
        labelKey: PRODUCT_LABEL_KEY,
        label: "Product",
        queryKey: ["products", "picker"],
        queryFn: ({ page, search }) => axiosAPI.get("/admin/products", { params: { page, per_page: 20, sort: "name", ...(search ? { "filter[search]": search } : {}) } }),
        mapOption: (p: { id: number; name: string }) => ({ label: p.name, value: String(p.id) }),
        placeholder: "Any product",
        searchPlaceholder: "Search products",
      },
      { type: "select", key: "inventory_type", label: "Inventory type", options: named(o?.inventory_types), placeholder: "Any inventory type" },
      { type: "select", key: "product_category", label: "Gas & water category", options: named(o?.product_categories), placeholder: "Any category" },
      { type: "select", key: "electronic_category", label: "Electronics category", options: named(o?.electronic_categories), placeholder: "Any category" },
    ],
  };
}

/** The order's own statuses, as the dashboard filters them. */
export function useOrderStatusGroup(): FilterGroup {
  const o = useOptions().data;
  return {
    title: "Where the order stands",
    fields: [
      { type: "select", key: "delivery_status", label: "Delivery", options: choices(o?.order_delivery_statuses ?? []), placeholder: "Any delivery" },
      { type: "select", key: "payment_status", label: "Payment", options: choices(o?.order_payment_statuses ?? []), placeholder: "Any payment" },
      { type: "select", key: "payment_mode", label: "Mode", options: choices(o?.payment_modes ?? [], modeLabel), placeholder: "Any mode" },
    ],
  };
}

/**
 * On Order payments, the order filters a dashboard arrow brought along, said in words with an x: "Payments on
 * orders with: Product: Nivana · Delivery: Delivered". The payments list has no Filters for them of its own.
 */
export function OrderFiltersBar({ get, onClear }: { get: (key: string) => string; onClear: () => void }) {
  const groups = [useOrderItemGroup(), useOrderStatusGroup()];
  const values = Object.fromEntries([...ORDER_FILTER_KEYS, PRODUCT_LABEL_KEY].map((k) => [k, get(k)]));
  const text = describeFilters(groups, values);
  if (!text) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-(--border-color) bg-(--bg-card) px-3 py-2 text-sm shadow-(--shadow-sm)">
      <i className="pi pi-filter text-xs text-(--text-muted)" aria-hidden />
      <span className="text-(--text-secondary)">Payments on orders with</span>
      <span className="font-medium text-(--text-primary)">{text}</span>
      <Button label="Clear" icon="pi pi-times" text size="small" onClick={onClear} />
    </div>
  );
}
