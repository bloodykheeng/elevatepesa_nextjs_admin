"use client";

import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { RecordDetailsDialog, auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions, type Section } from "@/components/dashboard/admin/RecordForm";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, Thumb, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { create, one, update } from "@/services/admin";
import type { Product } from "@/services/types/pesa";
import type { ExportColumn } from "@/lib/exportRows";
import { ugx } from "@/lib/format";

type Row = Product & Record<string, unknown>;
const FILTER_KEYS = ["status", "inventory_types_id", "category_brands_id", "product_types_id", "electronic_category_id", "electronic_brand_id", "electronic_type_id"];

/**
 * The catalogue the app sells. A product belongs to an inventory type; gas & water products have a
 * brand (in a category) and a product type, electronics an electronic category, brand and type.
 * The form asks only for what its inventory type uses.
 */
export default function ProductsList() {
  const options = useOptions();
  const list = useAdminList<Product>({ path: "products", filterKeys: FILTER_KEYS });
  const [editing, setEditing] = useState<{ row: Row | null } | null>(null);
  const viewing = useQuery({ queryKey: ["products", "one", list.viewId], queryFn: () => one<Product>("products", list.viewId), enabled: !!list.viewId, meta: VIEW_META });
  const shown = viewing.data ?? null;

  const opts = options.data;
  const electronicsId = opts?.inventory_types.find((t) => /electronic/i.test(t.name))?.id;
  const isElectronic = (v: Record<string, unknown>) => !!electronicsId && Number(v.inventory_types_id) === electronicsId;
  const isGasWater = (v: Record<string, unknown>) => !!v.inventory_types_id && !isElectronic(v);
  const pick = (list?: { id: number; name: string }[]) => (list ?? []).map((o) => ({ label: o.name, value: String(o.id) }));

  const filterGroups: FilterGroup[] = [
    { title: "Product", fields: [
      { type: "select", key: "inventory_types_id", label: "Inventory type", options: pick(opts?.inventory_types), placeholder: "Any type" },
      { type: "select", key: "status", label: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }], placeholder: "Any status" },
    ] },
    { title: "Gas & water", fields: [
      { type: "select", key: "category_brands_id", label: "Brand", options: pick(opts?.category_brands), placeholder: "Any brand" },
      { type: "select", key: "product_types_id", label: "Product type", options: pick(opts?.product_types), placeholder: "Any product type" },
    ] },
    { title: "Electronics", fields: [
      { type: "select", key: "electronic_category_id", label: "Category", options: pick(opts?.electronic_categories), placeholder: "Any category" },
      { type: "select", key: "electronic_brand_id", label: "Brand", options: pick(opts?.electronic_brands), placeholder: "Any brand" },
      { type: "select", key: "electronic_type_id", label: "Series", options: pick(opts?.electronic_types), placeholder: "Any series" },
    ] },
  ];

  const sections: Section[] = useMemo(() => [
    { title: "The product", fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "inventory_types_id", label: "Inventory type", type: "select", optionsKey: "inventory_types", required: true, hint: "Decides which of the fields below the product uses." },
      { name: "status", label: "Status", type: "status", required: true, hint: "Inactive products are hidden in the app." },
    ] },
    { title: "Price and stock", fields: [
      { name: "price", label: "Price", type: "money", required: true },
      { name: "quantity", label: "Quantity in stock", type: "number", required: true },
    ] },
    { title: "Where it sits in the catalogue", hint: "Pick the inventory type first.", fields: [
      { name: "product_categories_id", label: "Category", type: "select", optionsKey: "product_categories", when: isGasWater, hint: "Narrows the brands." },
      { name: "category_brands_id", label: "Brand", type: "select", optionsKey: "category_brands", when: isGasWater, parent: { field: "product_categories_id", key: "product_categories_id" } },
      { name: "product_types_id", label: "Product type", type: "select", optionsKey: "product_types", when: isGasWater },
      { name: "electronic_category_id", label: "Category", type: "select", optionsKey: "electronic_categories", when: isElectronic },
      { name: "electronic_brand_id", label: "Brand", type: "select", optionsKey: "electronic_brands", when: isElectronic, parent: { field: "electronic_category_id", key: "electronic_categories_id" } },
      { name: "electronic_type_id", label: "Series", type: "select", optionsKey: "electronic_types", when: isElectronic, parent: { field: "electronic_brand_id", key: "electronic_brands_id" } },
    ] },
    { title: "Description", fields: [{ name: "details", label: "Details", type: "textarea", hint: "Shown to customers in the app." }] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [electronicsId]);

  const placeOf = (p: Product) => (p.inventory_types_id === electronicsId
    ? [p.electronic_category?.name, p.electronic_brand?.name, p.electronic_type?.name]
    : [p.category_brand?.name, p.product_type?.name]).filter(Boolean).join(" · ") || "-";

  const columns = [
    {
      field: "name",
      header: "Product",
      sortable: true,
      body: (p: Product) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.photo_url} name={p.name} />
          <div className="min-w-0">
            <p className="font-medium text-(--text-primary)">{p.name}</p>
            <p className="truncate text-xs text-(--text-muted)">{placeOf(p)}</p>
          </div>
        </div>
      ),
    },
    { field: "inventory_type", mobile: false, header: "Inventory type", body: (p: Product) => p.inventory_type?.name ?? "-", exportValue: (p: Product) => p.inventory_type?.name ?? "" },
    { field: "price", header: "Price", sortable: true, body: (p: Product) => <span className="whitespace-nowrap font-medium">{ugx(Number(p.price))}</span> },
    { field: "quantity", header: "In stock", sortable: true, body: (p: Product) => <span className={p.quantity <= 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}>{p.quantity.toLocaleString("en-UG")}</span> },
    { field: "status", header: "Status", sortable: true, body: (p: Product) => <Pill value={p.status} /> },
    { field: "details", mobile: false, header: "Details", visible: false, body: (p: Product) => <span className="line-clamp-2 max-w-sm text-sm">{p.details ?? "-"}</span> },
    ...auditColumns<Product>(),
  ];

  const exportColumns: ExportColumn<Product>[] = [
    { header: "Product", value: (p) => p.name },
    { header: "Inventory type", value: (p) => p.inventory_type?.name ?? "" },
    { header: "Brand", value: (p) => p.category_brand?.name ?? p.electronic_brand?.name ?? "" },
    { header: "Type", value: (p) => p.product_type?.name ?? p.electronic_type?.name ?? "" },
    { header: "Price (UGX)", value: (p) => Number(p.price) },
    { header: "In stock", value: (p) => p.quantity },
    { header: "Status", value: (p) => p.status },
    { header: "Details", value: (p) => p.details ?? "" },
    ...auditExportColumns<Product>(),
  ];

  const toRow = (p: Product): Row => ({ ...p, product_categories_id: (p.category_brand as { product_categories_id?: number } | null)?.product_categories_id ?? null }) as Row;

  return (
    <div className="space-y-5">
      <PageHeader title="Products" subtitle="What the app sells. Inactive products are hidden from customers; products on past orders cannot be deleted." />
      <PrimeReactDataTable<Product>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No products match."
        fileName="Elevate Pesa products"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Name or details" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<Product>((p) => list.openView(p.id)), editAction<Product>((p) => setEditing({ row: toRow(p) }))]}
        selection={{ selected: list.selected, onChange: list.setSelected }}
        toolbarActions={[
          deleteSelectedAction<Product>(() => list.confirmDelete("product", "Products on past orders are kept: make them inactive instead.")),
          createAction<Product>(() => setEditing({ row: null })),
        ]}
      />

      <RecordForm<Row>
        visible={!!editing}
        onHide={() => setEditing(null)}
        record={editing?.row ?? null}
        title="product"
        sections={sections}
        photo={{ required: true, hint: "The app shows every product with its picture." }}
        defaults={{ status: "active", quantity: 0 }}
        save={(body, id) => (id ? update<Row>("products", id, body) : create<Row>("products", body))}
        invalidate={["products", "dashboard"]}
        what="this product"
      />

      <RecordDetailsDialog
        history={shown ? { type: "Product", id: shown.id } : undefined}
        header={shown?.name ?? "Product"}
        visible={!!list.viewId}
        onHide={list.closeView}
        record={shown}
        loading={viewing.isPending}
        error={viewError(viewing, "product")}
        links={shown ? <Thumb src={shown.photo_url} name={shown.name} size="h-44 w-44" /> : undefined}
        fields={shown ? [
          { label: "Price", value: <b>{ugx(Number(shown.price))}</b> },
          { label: "In stock", value: shown.quantity.toLocaleString("en-UG") },
          { label: "Inventory type", value: shown.inventory_type?.name ?? "-" },
          { label: "Status", value: <Pill value={shown.status} /> },
          { label: "Brand", value: shown.category_brand?.name ?? shown.electronic_brand?.name ?? "-" },
          { label: "Type", value: shown.product_type?.name ?? shown.electronic_type?.name ?? "-" },
          ...(shown.electronic_category ? [{ label: "Electronic category", value: shown.electronic_category.name }] : []),
          { label: "Details", value: shown.details || "-", wide: true },
        ] : []}
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Close" text onClick={list.closeView} />
            {shown && <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => { setEditing({ row: toRow(shown) }); list.closeView(); }} />}
          </div>
        }
      />
    </div>
  );
}
