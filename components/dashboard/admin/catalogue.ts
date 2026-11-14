import axiosAPI from "@/services/axiosApi";
import type { FilterField, FilterValues } from "@/components/dashboard/filters/FiltersButton";
import type { Options } from "@/services/types/pesa";

/**
 * The catalogue as the old admin cascaded it, top down, so the next choice only offers what is under the last one:
 *
 *   Inventory type ─┬─ Gas & water:  Category › Brand › (Product type)  › Product
 *                   └─ Electronics:  Category › Brand › Series          › Product
 *
 * An inventory type's `side` (GET /admin/options, read from its products) decides which branch shows. Used by every
 * place that narrows by what was ordered (dashboard, Orders, Order payments), the Products filters and the order
 * form's product finder, so they all cascade the same way.
 */
export type Side = "gas_water" | "electronics";
export type Choice = { label: string; value: string };

const choices = (rows: { id: number; name: string; status?: string }[] | undefined): Choice[] =>
  (rows ?? []).map((r) => ({ label: `${r.name}${r.status === "inactive" ? " (inactive)" : ""}`, value: String(r.id) }));

export function catalogue(o: Options | undefined) {
  const sideOf = (inventoryType: string | number | null | undefined): Side | null =>
    (o?.inventory_types.find((t) => String(t.id) === String(inventoryType ?? ""))?.side as Side | undefined) ?? null;
  return {
    sideOf,
    inventoryTypes: choices(o?.inventory_types),
    gasCategories: choices(o?.product_categories),
    gasBrands: (category?: string | null) => choices(o?.category_brands.filter((b) => !category || String(b.product_categories_id) === category)),
    productTypes: choices(o?.product_types),
    electronicCategories: choices(o?.electronic_categories),
    electronicBrands: (category?: string | null) => choices(o?.electronic_brands.filter((b) => !category || String(b.electronic_categories_id) === category)),
    electronicSeries: (brand?: string | null) => choices(o?.electronic_types.filter((t) => !brand || String(t.electronic_brands_id) === brand)),
  };
}

/** The URL (and API) keys a place uses for each level; orders and products name them differently. */
export type CatalogueKeys = {
  inventoryType: string;
  gasCategory: string;
  gasBrand: string;
  productType: string;
  electronicCategory: string;
  electronicBrand: string;
  electronicSeries: string;
};

/** The admin products API's own filter names, which the product picker and finder search with. */
export const PRODUCT_API_KEYS: CatalogueKeys = {
  inventoryType: "inventory_types_id", gasCategory: "product_category", gasBrand: "category_brands_id", productType: "product_types_id",
  electronicCategory: "electronic_category_id", electronicBrand: "electronic_brand_id", electronicSeries: "electronic_type_id",
};

/** `filter[...]` params for GET /admin/products from values held under `keys`. */
export function productParams(values: FilterValues, keys: CatalogueKeys): Record<string, string> {
  return Object.fromEntries(
    (Object.keys(keys) as (keyof CatalogueKeys)[])
      .filter((level) => values[keys[level]])
      .map((level) => [`filter[${PRODUCT_API_KEYS[level]}]`, values[keys[level]]]),
  );
}

/**
 * The cascading Filters fields for a catalogue, under `keys`. Picking a level clears what was under it; a branch shows
 * only when no inventory type is picked or the picked one is on its side. With `product`, a product picker comes last,
 * searching only the products under everything picked above it.
 */
export function catalogueFields(o: Options | undefined, keys: CatalogueKeys, product?: { key: string; labelKey: string }): FilterField[] {
  const c = catalogue(o);
  const k = keys;
  const gasWater = (d: FilterValues) => !d[k.inventoryType] || c.sideOf(d[k.inventoryType]) === "gas_water";
  const electronics = (d: FilterValues) => !d[k.inventoryType] || c.sideOf(d[k.inventoryType]) === "electronics";
  const below = (...more: string[]) => [...more, ...(product ? [product.key, product.labelKey] : [])];

  return [
    {
      type: "select", key: k.inventoryType, label: "Inventory type", options: c.inventoryTypes, placeholder: "Any inventory type",
      clears: below(k.gasCategory, k.gasBrand, k.productType, k.electronicCategory, k.electronicBrand, k.electronicSeries),
    },
    { type: "select", key: k.gasCategory, label: "Gas & water category", options: c.gasCategories, placeholder: "Any category", when: gasWater, clears: below(k.gasBrand) },
    {
      type: "select", key: k.gasBrand, label: "Gas & water brand", options: c.gasBrands(), placeholder: "Any brand", when: gasWater,
      narrow: (d) => c.gasBrands(d[k.gasCategory] || null), clears: below(),
    },
    { type: "select", key: k.productType, label: "Product type", options: c.productTypes, placeholder: "Any product type", when: gasWater, clears: below() },
    { type: "select", key: k.electronicCategory, label: "Electronics category", options: c.electronicCategories, placeholder: "Any category", when: electronics, clears: below(k.electronicBrand, k.electronicSeries) },
    {
      type: "select", key: k.electronicBrand, label: "Electronics brand", options: c.electronicBrands(), placeholder: "Any brand", when: electronics,
      narrow: (d) => c.electronicBrands(d[k.electronicCategory] || null), clears: below(k.electronicSeries),
    },
    {
      type: "select", key: k.electronicSeries, label: "Series", options: c.electronicSeries(), placeholder: "Any series", when: electronics,
      narrow: (d) => c.electronicSeries(d[k.electronicBrand] || null), clears: below(),
    },
    ...(product ? [{
      type: "picker" as const,
      key: product.key,
      labelKey: product.labelKey,
      label: "Product",
      queryKey: ["products", "picker"],
      queryFn: ({ page, search }: { page: number; search: string }) => axiosAPI.get("/admin/products", { params: { page, per_page: 20, sort: "name", ...(search ? { "filter[search]": search } : {}) } }),
      // Only the products under what is picked above it.
      cascade: (d: FilterValues) => {
        const params = productParams(d, keys);
        return {
          queryKey: ["products", "picker", JSON.stringify(params)],
          queryFn: ({ page, search }: { page: number; search: string }) => axiosAPI.get("/admin/products", { params: { page, per_page: 20, sort: "name", ...params, ...(search ? { "filter[search]": search } : {}) } }),
        };
      },
      mapOption: (p: { id: number; name: string }) => ({ label: p.name, value: String(p.id) }),
      placeholder: "Any product",
      searchPlaceholder: "Search products",
    }] : []),
  ];
}
