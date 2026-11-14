/**
 * Shapes of the admin API (/api/admin/*, pesa_back routes/admin.php). Money comes as decimal
 * strings ("50000.00"); format with lib/format's ugx(Number(x)). Times are UTC ISO strings.
 */

export interface UserReference {
  id: number | string;
  name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
}

/** The audit fields a list shows as hidden columns and a details dialog at its foot. */
export interface Audited {
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: UserReference | null;
  updated_by?: UserReference | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; per_page: number; current_page: number; last_page: number };
  links?: unknown;
}

export type Money = string | number;

/** One audit trail entry (GET /admin/audit-trail): values were frozen when it was written. */
export interface AuditEntry {
  id: number;
  created_at: string;
  event: string;
  event_label: string;
  module: string | null;
  description: string;
  title: string | null;
  subject_type: string | null;
  subject_id: number | null;
  causer_id: number | null;
  causer: { name: string | null; email: string | null; role: string | null } | null;
  source: "admin" | "old-admin" | "app" | "system" | null;
  request_id: string | null;
  changed: number | null;
  /** The first few changes, as text ("Status: Pending → Delivered"). */
  changes_preview: { label: string; old: string | null; new: string | null; secret: boolean }[];
  ip: string | null;
  /** "Chrome 158 on Windows", "The app on Android 14". */
  device: string | null;
}

export type AuditValueType = "string" | "text" | "enum" | "relation" | "date" | "datetime" | "boolean" | "number" | "money" | "file" | "secret" | "list";
export interface AuditField {
  field: string;
  label: string;
  type: AuditValueType;
  value?: unknown;
  old?: unknown;
  new?: unknown;
  columns?: { key: string; label: string; type?: AuditValueType }[];
}
export interface AuditEntryDetail extends AuditEntry {
  snapshot: AuditField[] | null;
  changes: AuditField[] | null;
  request: {
    id?: string; method?: string; path?: string; ip?: string; user_agent?: string; command?: string;
    device?: { kind: string; platform: string | null; browser: string | null; summary: string };
  } | null;
  extra: Record<string, unknown> | null;
  same_request: number;
}

export interface Payment extends Audited {
  id: number;
  order_id?: number;
  package_id?: number;
  user_id: number;
  amount: Money;
  payment_method: string | null;
  transaction_number: string | null;
  details: string | null;
  order?: { id: number; order_number: string; charged_amount: Money; balance_due: Money } | null;
  package?: { id: number; name: string; package_number: string | null; charged_amount: Money; balance_due: Money } | null;
  customer?: UserReference | null;
}

export interface OrderLine {
  id: number;
  name: string;
  price: Money;
  quantity: number;
  product_id: number | null;
  product?: { id: number; name: string; photo_url: string | null } | null;
}

export interface Order extends Audited {
  id: number;
  order_number: string;
  status: string;
  amount: Money;
  charged_amount: Money;
  amount_paid: Money;
  balance_due: Money;
  payment_status: string;
  payment_mode: string;
  delivery_status: string;
  address: string | null;
  order_products_count?: number;
  order_products?: OrderLine[];
  payments?: Payment[];
}

export interface Package extends Audited {
  id: number;
  name: string;
  package_number: string | null;
  order_number: string | null;
  pickup: string | null;
  destination: string | null;
  extraInfo: string | null;
  status: string;
  photo_url: string | null;
  charged_amount: Money;
  amount_paid: Money;
  balance_due: Money;
  payment_status: string | null;
  delivery_status: string | null;
  payment_mode: string | null;
  payments?: Payment[];
}

export interface Named {
  id: number;
  name: string;
}

export interface Product extends Audited {
  id: number;
  name: string;
  status: string;
  photo_url: string | null;
  price: Money;
  quantity: number;
  details: string | null;
  inventory_types_id: number | null;
  category_brands_id: number | null;
  product_types_id: number | null;
  electronic_category_id: number | null;
  electronic_brand_id: number | null;
  electronic_type_id: number | null;
  inventory_type?: Named | null;
  category_brand?: Named | null;
  product_type?: Named | null;
  electronic_category?: Named | null;
  electronic_brand?: Named | null;
  electronic_type?: Named | null;
}

export interface Account {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  gender: string | null;
  nin: string | null;
  date_of_birth: string | null;
  role: string | null;
  photo_url: string | null;
  lastlogin: string | null;
  has_device: boolean;
  orders_count?: number;
  packages_count?: number;
  created_at: string | null;
  updated_at: string | null;
  orders?: Order[];
  packages?: Package[];
  totals?: { orders_value: number; paid: number; balance_due: number };
}

export interface CustomerMessage extends Audited {
  id: number;
  title: string;
  body: string;
  send_push: boolean;
  send_email: boolean;
  audience: "all_customers" | "selected";
  status: "queued" | "sending" | "sent" | "failed";
  recipients_count: number;
  push_sent: number;
  push_failed: number;
  email_sent: number;
  email_failed: number;
  finished_at: string | null;
}

export interface MessageRecipient {
  id: number;
  user_id: number;
  push_status: string | null;
  email_status: string | null;
  error: string | null;
  user?: UserReference | null;
}

export interface InboxItem {
  id: string;
  kind: "order" | "package" | "customer" | "send" | null;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string | null;
}

export interface Role {
  id: number;
  name: string;
  users_count: number;
  permissions: string[];
  locked: boolean;
}

export interface Options {
  product_categories: (Named & { status: string })[];
  category_brands: (Named & { status: string; product_categories_id: number })[];
  product_types: (Named & { status: string })[];
  inventory_types: (Named & { status: string })[];
  electronic_categories: (Named & { status: string })[];
  electronic_brands: (Named & { status: string; electronic_categories_id: number })[];
  electronic_types: (Named & { status: string; electronic_brands_id: number })[];
  explore_categories: (Named & { status: string })[];
  roles: string[];
  order_statuses: string[];
  order_payment_statuses: string[];
  order_delivery_statuses: string[];
  package_statuses: string[];
  package_payment_statuses: string[];
  package_delivery_statuses: string[];
  payment_methods: string[];
  payment_modes: string[];
}

export interface Dashboard {
  period: { from: string | null; to: string | null };
  /** An order filter (product, category, status) is in force: the order figures and order payments are narrowed. */
  filtered: boolean;
  orders: { count: number; cancelled: number; value: number; paid: number; balance_due: number; with_balance: number; by_delivery: Record<string, number> };
  packages: { count: number; value: number; paid: number; balance_due: number; with_balance: number };
  customers: { total: number; new: number };
  /** Order payments only (narrowed by the order filters). */
  payments: { count: number; amount: number; by_method: { method: string; count: number; amount: number }[] };
  package_payments: { count: number; amount: number };
  monthly: { month: string; orders: number; value: number; paid: number }[];
  top_products: { product_id: number | null; name: string; quantity: number; value: number }[];
  top_customers: { user_id: number; name: string; orders: number; value: number; balance_due: number }[];
  data_range: { first_order: string | null; last_order: string | null };
}
