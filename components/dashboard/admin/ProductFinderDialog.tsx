"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Dialog } from "@/components/common/Dialog";
import axiosAPI from "@/services/axiosApi";
import type { Paginated, Product } from "@/services/types/pesa";
import { ugx } from "@/lib/format";
import { useOptions } from "./RecordForm";
import { Thumb } from "./parts";
import { PRODUCT_API_KEYS, catalogue, productParams, type Choice } from "./catalogue";

const K = PRODUCT_API_KEYS;
const PER_PAGE = 8;

/**
 * The order form's funnel beside a product picker: narrow the catalogue the old admin's way (inventory type, then its
 * category › brand › type or series), search within it, and click the product. Each row shows its picture, where it
 * sits, its price and its stock, so the right one is found without knowing its exact name.
 */
export default function ProductFinderDialog({ visible, onHide, onPick }: {
  visible: boolean;
  onHide: () => void;
  onPick: (product: Product) => void;
}) {
  const o = useOptions().data;
  const c = catalogue(o);
  const [v, setV] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { if (visible) { setV({}); setSearch(""); setPage(1); } }, [visible]);

  const side = c.sideOf(v[K.inventoryType]);
  const params = productParams(v, K);
  const results = useQuery({
    queryKey: ["products", "finder", params, search, page],
    queryFn: async () => (await axiosAPI.get<Paginated<Product>>("/admin/products", {
      params: { page, per_page: PER_PAGE, sort: "name", ...params, ...(search.trim() ? { "filter[search]": search.trim() } : {}) },
    })).data,
    enabled: visible,
    placeholderData: keepPreviousData,
  });

  /** Sets a level and empties the levels under it. */
  const set = (key: string, value: string | null, clears: string[] = []) => {
    setV((d) => ({ ...d, ...Object.fromEntries(clears.map((k) => [k, ""])), [key]: value ?? "" }));
    setPage(1);
  };
  const select = (key: string, label: string, options: Choice[], placeholder: string, clears: string[] = [], locked?: string) => (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-(--text-secondary)" htmlFor={`finder-${key}`}>{label}</label>
      <Dropdown inputId={`finder-${key}`} value={v[key] || null} options={options} onChange={(e) => set(key, e.value, clears)} showClear filter={options.length > 8}
        placeholder={locked ?? placeholder} disabled={!!locked} className="w-full" emptyMessage="Nothing under what is picked above" />
    </div>
  );
  const all = [K.gasCategory, K.gasBrand, K.productType, K.electronicCategory, K.electronicBrand, K.electronicSeries];
  const rows = results.data?.data ?? [];
  const last = results.data?.meta.last_page ?? 1;
  const placeOf = (p: Product) => (c.sideOf(p.inventory_types_id) === "electronics"
    ? [p.electronic_category?.name, p.electronic_brand?.name, p.electronic_type?.name]
    : [p.category_brand?.name, p.product_type?.name]).filter(Boolean).join(" · ");

  return (
    <Dialog header="Find a product" visible={visible} onHide={onHide} style={{ width: "min(44rem, 96vw)" }} modal
      footer={<div className="flex justify-end"><Button label="Close" text onClick={onHide} /></div>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {select(K.inventoryType, "Inventory type", c.inventoryTypes, "Any inventory type", all)}
          {side !== "electronics" && select(K.gasCategory, "Gas & water category", c.gasCategories, "Any category", [K.gasBrand])}
          {side !== "electronics" && select(K.gasBrand, "Gas & water brand", c.gasBrands(v[K.gasCategory] || null), "Any brand")}
          {side !== "electronics" && select(K.productType, "Product type", c.productTypes, "Any product type")}
          {side !== "gas_water" && select(K.electronicCategory, "Electronics category", c.electronicCategories, "Any category", [K.electronicBrand, K.electronicSeries])}
          {side !== "gas_water" && select(K.electronicBrand, "Electronics brand", c.electronicBrands(v[K.electronicCategory] || null), "Any brand", [K.electronicSeries])}
          {side !== "gas_water" && select(K.electronicSeries, "Series", c.electronicSeries(v[K.electronicBrand] || null), "Any series")}
        </div>
        <InputText value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name" className="w-full" aria-label="Search products" />

        <div className="overflow-hidden rounded-xl border border-(--border-color)">
          {results.isPending ? (
            <div className="h-48 animate-pulse bg-(--border-color)" aria-label="Loading" />
          ) : rows.length === 0 ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-(--text-muted)">No products match. Lift a choice above or change the search.</p>
          ) : (
            <ul className="divide-y divide-(--border-color)">
              {rows.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { onPick(p); onHide(); }}
                    className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2.5 text-left hover:bg-(--bg-page)">
                    <Thumb src={p.photo_url} name={p.name} preview={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-(--text-primary)">{p.name}{p.status === "inactive" && <span className="ml-2 text-xs font-normal text-(--text-muted)">(inactive)</span>}</span>
                      <span className="block truncate text-xs text-(--text-muted)">{placeOf(p) || "-"}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block whitespace-nowrap text-sm font-semibold text-(--text-primary)">{ugx(Number(p.price))}</span>
                      <span className={`block whitespace-nowrap text-xs ${Number(p.quantity) > 0 ? "text-(--text-muted)" : "text-red-600 dark:text-red-400"}`}>{Number(p.quantity ?? 0)} in stock</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {last > 1 && (
          <div className="flex items-center justify-between text-sm text-(--text-secondary)">
            <Button label="Previous" icon="pi pi-angle-left" text size="small" disabled={page <= 1} onClick={() => setPage((n) => n - 1)} />
            <span>Page {page} of {last} · {results.data?.meta.total} products</span>
            <Button label="Next" icon="pi pi-angle-right" iconPos="right" text size="small" disabled={page >= last} onClick={() => setPage((n) => n + 1)} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
