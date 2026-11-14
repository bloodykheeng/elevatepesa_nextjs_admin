"use client";

import { Button } from "primereact/button";
import { catalogueFields, type CatalogueKeys } from "./catalogue";
import { describeFilters, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { useOptions } from "./RecordForm";
import { choices, modeLabel } from "./parts";

/**
 * What an order is narrowed to by what was in it: a product, or a whole kind (an inventory type, a gas and water
 * category, an electronics category). The dashboard filters by these (the old dashboard's Products and Inventory
 * Types, the user, 14 Nov 2026), and its arrows carry them to Orders and Order payments, whose API takes the same
 * keys (pesa_back Order::scopeMatching). An order matches when any of its items does.
 */
export const ORDER_ITEM_KEYS = ["inventory_type", "product_category", "category_brand", "product_type", "electronic_category", "electronic_brand", "electronic_type", "product"] as const;
/** Item filters and the order's own statuses: what the dashboard passes on. */
export const ORDER_FILTER_KEYS = [...ORDER_ITEM_KEYS, "delivery_status", "payment_status", "payment_mode"];
/** The product picker keeps the product's name beside its id in the address, for the chip; never sent to the API. */
export const PRODUCT_LABEL_KEY = "product_label";

/** The order filters' names for each catalogue level (the API's Order::ITEM_FILTERS). */
export const ORDER_CATALOGUE_KEYS: CatalogueKeys = {
  inventoryType: "inventory_type", gasCategory: "product_category", gasBrand: "category_brand", productType: "product_type",
  electronicCategory: "electronic_category", electronicBrand: "electronic_brand", electronicSeries: "electronic_type",
};

/**
 * The "What was ordered" group of a Filters dialog, cascading like the old admin: the inventory type first, then only
 * its side's category, brand and type (or series), and the product last, searched among those (catalogue.ts).
 */
export function useOrderItemGroup(): FilterGroup {
  const o = useOptions().data;
  return { title: "What was ordered", fields: catalogueFields(o, ORDER_CATALOGUE_KEYS, { key: "product", labelKey: PRODUCT_LABEL_KEY }) };
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
