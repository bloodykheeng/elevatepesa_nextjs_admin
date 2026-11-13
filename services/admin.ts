import axiosAPI from "./axiosApi";
import { cleanParams } from "./types/api";
import type {
  Account, AuditEntry, AuditEntryDetail, CustomerMessage, Dashboard, InboxItem, MessageRecipient, Options, Order, Package, Paginated, Payment, Product, Role,
} from "./types/pesa";

/**
 * Every call the dashboard makes, against /api/admin/* (pesa_back routes/admin.php).
 * Lists take ?page, per_page, sort and filter[...]; writes are POST (multipart when a photo goes).
 */

type Params = Record<string, string | number | boolean | undefined | null>;

const get = async <T>(url: string, params: Params = {}) => (await axiosAPI.get<T>(url, { params: cleanParams(params) })).data;

const post = async <T>(url: string, body: unknown = {}) =>
  (await axiosAPI.post<T>(url, body, body instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined)).data;

type Saved<T> = { message: string; data: T };

/** A record list: orders, products, the catalogue tables... */
export const listOf = <T>(path: string, params: Params = {}) => get<Paginated<T>>(`/admin/${path}`, params);
export const one = <T>(path: string, id: number | string) => get<{ data: T }>(`/admin/${path}/${id}`).then((r) => r.data);
export const create = <T>(path: string, body: FormData | object) => post<Saved<T>>(`/admin/${path}`, body);
export const update = <T>(path: string, id: number | string, body: FormData | object) => post<Saved<T>>(`/admin/${path}/${id}`, body);
export const bulkDelete = (path: string, ids: (number | string)[]) => post<{ message: string }>(`/admin/${path}/bulk-delete`, { ids });

export const adminApi = {
  dashboard: (params: { from?: string; to?: string }) => get<Dashboard>("/admin/dashboard", params),
  options: () => get<Options>("/admin/options"),

  orders: (params: Params) => listOf<Order>("orders", params),
  order: (id: number) => one<Order>("orders", id),
  updateOrder: (id: number, body: object) => update<Order>("orders", id, body),
  recordOrderPayment: (id: number, body: object) => post<Saved<Order>>(`/admin/orders/${id}/payments`, body),

  packages: (params: Params) => listOf<Package>("packages", params),
  package: (id: number) => one<Package>("packages", id),
  updatePackage: (id: number, body: FormData | object) => update<Package>("packages", id, body),
  recordPackagePayment: (id: number, body: object) => post<Saved<Package>>(`/admin/packages/${id}/payments`, body),

  payments: (params: Params) => listOf<Payment>("payments", params),
  packagePayments: (params: Params) => listOf<Payment>("package-payments", params),

  products: (params: Params) => listOf<Product>("products", params),

  users: (params: Params) => listOf<Account>("users", params),
  user: (id: number) => one<Account>("users", id),

  auditTrail: (params: Params) => get<Paginated<AuditEntry> & { modules: string[] }>("/admin/audit-trail", params),
  auditEntry: (id: number) => one<AuditEntryDetail>("audit-trail", id),

  roles: () => get<{ data: Role[]; permissions: string[] }>("/admin/roles"),
  saveRole: (id: number, permissions: string[]) => post<{ message: string }>(`/admin/roles/${id}`, { permissions }),

  messages: (params: Params) => listOf<CustomerMessage>("notifications", params),
  message: (id: number) => one<CustomerMessage>("notifications", id),
  messageRecipients: (id: number, params: Params) => listOf<MessageRecipient>(`notifications/${id}/recipients`, params),
  previewMessage: (body: object) => post<{ recipients: number; with_device: number; with_email: number; emails_left_today: number; daily_email_limit: number }>("/admin/notifications/preview", body),
  sendMessage: (body: object) => post<Saved<CustomerMessage>>("/admin/notifications", body),

  updateProfile: (body: FormData) => post<{ message: string; user: Account & { permissions: string[] } }>("/admin/auth/profile", body),
  changePassword: (body: { current_password: string; password: string; password_confirmation: string }) => post<{ message: string }>("/admin/auth/password", body),

  inbox: (params: { unread?: boolean; page?: number; per_page?: number }) =>
    get<{ data: InboxItem[]; meta: Paginated<InboxItem>["meta"]; unread_count: number }>("/admin/inbox", params),
  readInbox: (id: string) => post<{ unread_count: number }>(`/admin/inbox/${id}/read`),
  readAllInbox: () => post<{ unread_count: number }>("/admin/inbox/read-all"),
};

/** A stored photo path ("/product_photos/x.png") as a URL the browser can load. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** A form's values as multipart, for any save that may carry a photo. Empty values are sent as "". */
export function toFormData(values: Record<string, unknown>, photo?: File | null, removePhoto = false): FormData {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "boolean") form.append(key, value ? "1" : "0");
    else form.append(key, value === null ? "" : String(value));
  });
  if (photo) form.append("photo", photo);
  if (removePhoto) form.append("remove_photo", "1");
  return form;
}
