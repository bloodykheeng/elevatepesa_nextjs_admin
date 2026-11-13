import type { ReactNode } from "react";
import type { Section } from "@/components/dashboard/admin/RecordForm";
import type { Audited, Options } from "@/services/types/pesa";
import { Pill } from "@/components/dashboard/admin/parts";
import { shortDate } from "@/lib/format";

/**
 * The simple tables, one page each at /dashboard/catalog/<key>, matching App\Admin\Catalog on the
 * API (same keys, same fields). A table's columns, filters, form and View come from here.
 */

export type Row = Record<string, unknown> & Audited & { id: number; name?: string; photo_url?: string | null };

export type CatalogColumn = {
  field: string;
  header: string;
  sortable?: boolean;
  visible?: boolean;
  body?: (row: Row) => ReactNode;
  exportValue?: (row: Row) => string | number | null | undefined;
};

export type CatalogDef = {
  title: string;
  singular: string;
  subtitle: string;
  searchPlaceholder: string;
  /** The row's picture: shown as a thumbnail, edited in the form. */
  photo?: { required?: boolean; hint?: string };
  /** Shown first in the row, beside the picture. */
  nameField: string;
  columns: CatalogColumn[];
  /** Exact-value filters: [API filter key, label, options key in /admin/options or fixed values]. */
  filters: { key: string; label: string; optionsKey?: keyof Options; values?: string[] }[];
  sections: Section[];
  view: (row: Row) => { label: string; value: ReactNode; wide?: boolean }[];
  /** Customers create these in the app: staff view and delete only. */
  readonly?: boolean;
  deleteNote?: string;
};

const status = (row: Row) => <Pill value={String(row.status ?? "")} />;
const rel = (key: string) => (row: Row) => ((row[key] as { name?: string } | null)?.name ?? "-");
const count = (key: string) => (row: Row) => Number(row[key] ?? 0).toLocaleString("en-UG");

const basics = (codeHint?: string): Section => ({
  title: "Details",
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "code", label: "Code", type: "text", hint: codeHint ?? "A short code, if you use one." },
    { name: "status", label: "Status", type: "status", required: true, hint: "Inactive ones are hidden in the app." },
    { name: "details", label: "Details", type: "textarea" },
  ],
});

const inUse = "Ones still in use are kept: make them inactive instead.";

export const CATALOG: Record<string, CatalogDef> = {
  "inventory-types": {
    title: "Inventory types",
    singular: "inventory type",
    subtitle: "The top level of the catalogue: gas & water, electronics. Every product has one.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "code", header: "Code", sortable: true },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [basics()],
    view: (r) => [{ label: "Code", value: String(r.code ?? "-") }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: inUse,
  },
  "product-categories": {
    title: "Categories",
    singular: "category",
    subtitle: "Gas and water categories. Each holds brands.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "code", header: "Code", sortable: true },
      { field: "brands_count", header: "Brands", sortable: true, body: count("brands_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [basics()],
    view: (r) => [{ label: "Code", value: String(r.code ?? "-") }, { label: "Brands", value: count("brands_count")(r) }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Categories with brands are kept: deleting one would take its brands and their products with it.",
  },
  "category-brands": {
    title: "Brands",
    singular: "brand",
    subtitle: "Gas and water brands, each in a category.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "product_category", header: "Category", body: rel("product_category"), exportValue: rel("product_category") as (r: Row) => string },
      { field: "products_count", header: "Products", sortable: true, body: count("products_count") },
      { field: "code", header: "Code", sortable: true, visible: false },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [
      { key: "product_categories_id", label: "Category", optionsKey: "product_categories" },
      { key: "status", label: "Status", values: ["active", "inactive"] },
    ],
    sections: [{ title: "Where it belongs", fields: [{ name: "product_categories_id", label: "Category", type: "select", optionsKey: "product_categories", required: true }] }, basics()],
    view: (r) => [{ label: "Category", value: rel("product_category")(r) }, { label: "Products", value: count("products_count")(r) }, { label: "Code", value: String(r.code ?? "-") }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Brands with products are kept: deleting one would delete its products too.",
  },
  "product-types": {
    title: "Product types",
    singular: "product type",
    subtitle: "Gas and water product types (cylinder sizes, refills...).",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "code", header: "Code", sortable: true },
      { field: "products_count", header: "Products", sortable: true, body: count("products_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [basics()],
    view: (r) => [{ label: "Code", value: String(r.code ?? "-") }, { label: "Products", value: count("products_count")(r) }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Types with products are kept: deleting one would delete its products too.",
  },
  "electronic-categories": {
    title: "Electronic categories",
    singular: "electronic category",
    subtitle: "Phones, TVs, fridges... Each holds brands.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "code", header: "Code", sortable: true },
      { field: "brands_count", header: "Brands", sortable: true, body: count("brands_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [basics()],
    view: (r) => [{ label: "Code", value: String(r.code ?? "-") }, { label: "Brands", value: count("brands_count")(r) }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Categories with brands or products are kept: deleting one would take them with it.",
  },
  "electronic-brands": {
    title: "Electronic brands",
    singular: "electronic brand",
    subtitle: "Samsung, Tecno, Hisense... each in an electronic category.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "electronic_category", header: "Category", body: rel("electronic_category"), exportValue: rel("electronic_category") as (r: Row) => string },
      { field: "types_count", header: "Series", sortable: true, body: count("types_count") },
      { field: "products_count", header: "Products", sortable: true, body: count("products_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [
      { key: "electronic_categories_id", label: "Category", optionsKey: "electronic_categories" },
      { key: "status", label: "Status", values: ["active", "inactive"] },
    ],
    sections: [{ title: "Where it belongs", fields: [{ name: "electronic_categories_id", label: "Category", type: "select", optionsKey: "electronic_categories", required: true }] }, basics()],
    view: (r) => [{ label: "Category", value: rel("electronic_category")(r) }, { label: "Series", value: count("types_count")(r) }, { label: "Products", value: count("products_count")(r) }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Brands with series or products are kept.",
  },
  "electronic-types": {
    title: "Electronic series",
    singular: "series",
    subtitle: "Models or ranges under a brand: Tecno Pop, Itel A70... Products are listed under one.",
    searchPlaceholder: "Name, code or details",
    photo: {},
    nameField: "name",
    columns: [
      { field: "electronic_brand", header: "Brand", body: rel("electronic_brand"), exportValue: rel("electronic_brand") as (r: Row) => string },
      { field: "products_count", header: "Products", sortable: true, body: count("products_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [
      { key: "electronic_brands_id", label: "Brand", optionsKey: "electronic_brands" },
      { key: "status", label: "Status", values: ["active", "inactive"] },
    ],
    sections: [{ title: "Where it belongs", fields: [{ name: "electronic_brands_id", label: "Brand", type: "select", optionsKey: "electronic_brands", required: true }] }, basics()],
    view: (r) => [{ label: "Brand", value: rel("electronic_brand")(r) }, { label: "Products", value: count("products_count")(r) }, { label: "Status", value: status(r) }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
    deleteNote: "Series with products are kept.",
  },
  ads: {
    title: "Adverts",
    singular: "advert",
    subtitle: "Banners the app shows between their start and end dates while active.",
    searchPlaceholder: "Title or details",
    photo: { required: true, hint: "Wide pictures work best. JPG, PNG or WebP, up to 5 MB." },
    nameField: "title",
    columns: [
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
      { field: "start_date", header: "Starts", sortable: true, body: (r) => shortDate(String(r.start_date ?? "")) },
      { field: "end_date", header: "Ends", sortable: true, body: (r) => shortDate(String(r.end_date ?? "")) },
      { field: "details", header: "Details", visible: false },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive", "pending"] }],
    sections: [
      { title: "The advert", fields: [{ name: "title", label: "Title", type: "text", required: true }, { name: "details", label: "Details", type: "textarea" }] },
      { title: "When it shows", fields: [
        { name: "status", label: "Status", type: "status", values: ["active", "inactive", "pending"], required: true },
        { name: "start_date", label: "Starts", type: "date", required: true },
        { name: "end_date", label: "Ends", type: "date", required: true },
      ] },
    ],
    view: (r) => [{ label: "Status", value: status(r) }, { label: "Shows", value: `${shortDate(String(r.start_date ?? ""))} to ${shortDate(String(r.end_date ?? ""))}` }, { label: "Details", value: String(r.details ?? "-"), wide: true }],
  },
  "explore-categories": {
    title: "Explore categories",
    singular: "explore category",
    subtitle: "Sections of the app's Explore tab. Each holds articles.",
    searchPlaceholder: "Name",
    nameField: "name",
    columns: [
      { field: "blogs_count", header: "Articles", sortable: true, body: count("blogs_count") },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [{ title: "Details", fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "status", label: "Status", type: "status", required: true }] }],
    view: (r) => [{ label: "Articles", value: count("blogs_count")(r) }, { label: "Status", value: status(r) }],
    deleteNote: "Categories with articles are kept: deleting one would delete its articles.",
  },
  "explore-category-blogs": {
    title: "Articles",
    singular: "article",
    subtitle: "What customers read in the app's Explore tab.",
    searchPlaceholder: "Title or text",
    photo: {},
    nameField: "name",
    columns: [
      { field: "explore_category", header: "Category", body: rel("explore_category"), exportValue: rel("explore_category") as (r: Row) => string },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [
      { key: "explore_categories_id", label: "Category", optionsKey: "explore_categories" },
      { key: "status", label: "Status", values: ["active", "inactive"] },
    ],
    sections: [
      { title: "Where it belongs", fields: [{ name: "explore_categories_id", label: "Category", type: "select", optionsKey: "explore_categories", required: true }] },
      { title: "The article", fields: [{ name: "name", label: "Title", type: "text", required: true }, { name: "status", label: "Status", type: "status", required: true }, { name: "details", label: "Text", type: "textarea" }] },
    ],
    view: (r) => [{ label: "Category", value: rel("explore_category")(r) }, { label: "Status", value: status(r) }, { label: "Text", value: String(r.details ?? "-"), wide: true }],
  },
  faqs: {
    title: "FAQs",
    singular: "FAQ",
    subtitle: "Questions and answers the app shows.",
    searchPlaceholder: "Question or answer",
    nameField: "question",
    columns: [
      { field: "answer", header: "Answer", body: (r) => <span className="line-clamp-2 max-w-md text-sm text-(--text-secondary)">{String(r.answer ?? "")}</span> },
      { field: "status", header: "Status", sortable: true, body: status, exportValue: (r) => String(r.status) },
    ],
    filters: [{ key: "status", label: "Status", values: ["active", "inactive"] }],
    sections: [{ title: "Question and answer", fields: [{ name: "question", label: "Question", type: "textarea", required: true }, { name: "answer", label: "Answer", type: "textarea", required: true }, { name: "status", label: "Status", type: "status", required: true }] }],
    view: (r) => [{ label: "Status", value: status(r) }, { label: "Answer", value: String(r.answer ?? "-"), wide: true }],
  },
  referrals: {
    title: "Referrals",
    singular: "referral",
    subtitle: "People customers referred, from the app.",
    searchPlaceholder: "Name, or the customer's name or phone",
    nameField: "name",
    columns: [
      { field: "created_by", header: "Referred by", body: (r) => (r.created_by as { name?: string } | null)?.name ?? "-", exportValue: (r) => (r.created_by as { name?: string } | null)?.name ?? "" },
      { field: "phone", header: "Their phone", body: (r) => (r.created_by as { phone?: string } | null)?.phone ?? "-", exportValue: (r) => (r.created_by as { phone?: string } | null)?.phone ?? "" },
    ],
    filters: [],
    sections: [],
    view: (r) => [{ label: "Referred by", value: (r.created_by as { name?: string } | null)?.name ?? "-" }, { label: "Their phone", value: (r.created_by as { phone?: string } | null)?.phone ?? "-" }],
    readonly: true,
  },
};
