"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dialog } from "@/components/common/Dialog";
import { Field, FormSection } from "@/components/dashboard/ui";
import InfiniteSelect, { type Option } from "@/components/dashboard/forms/InfiniteSelect";
import { confirmSubmit, guardedClose } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import axiosAPI from "@/services/axiosApi";
import { adminApi } from "@/services/admin";
import type { Order } from "@/services/types/pesa";
import { ugx } from "@/lib/format";
import { useOptions } from "./RecordForm";
import { choices, modeLabel } from "./parts";
import { PlacedAtField, customerPicker } from "./pickers";

type Line = { product: Option | null; quantity: number | null; price: number | null };
type Values = {
  customer: Option | null;
  placed_at: string | null;
  address: string;
  payment_mode: string | null;
  status: string;
  delivery_status: string;
  payment_status: string;
  /** New: take the items out of stock. Edit: move stock for the item changes. */
  stock: boolean;
  charged_amount: number | null;
  items: Line[];
};

const blankLine: Line = { product: null, quantity: 1, price: null };
const blank = (): Values => ({
  customer: null, placed_at: null, address: "", payment_mode: "cod", status: "pending", delivery_status: "pending", payment_status: "pending",
  stock: true, charged_amount: null, items: [{ ...blankLine }],
});

/** The form, filled from an order (the details call: items, customer and all). */
function fromOrder(o: Order): Values {
  return {
    customer: o.created_by ? { label: o.created_by.name, value: String(o.created_by.id), note: o.created_by.phone ?? undefined } : null,
    placed_at: o.created_at ?? null,
    address: o.address ?? "",
    payment_mode: o.payment_mode,
    status: o.status,
    delivery_status: o.delivery_status,
    payment_status: o.payment_status,
    stock: true,
    charged_amount: Number(o.charged_amount ?? 0),
    items: (o.order_products ?? []).map((l) => ({
      // A line whose product was deleted since has no product to pick: it must be chosen again to save.
      product: l.product_id ? { label: l.name, value: String(l.product_id) } : null,
      quantity: l.quantity,
      price: Number(l.price),
    })),
  };
}

type ProductRow = { id: number; name: string; price: string | number; quantity: number | null; status?: string };
const productPicker = {
  queryKey: ["products", "order-picker"] as (string | number | null)[],
  queryFn: ({ page, search }: { page: number; search: string }) =>
    axiosAPI.get("/admin/products", { params: { page, per_page: 20, sort: "name", ...(search ? { "filter[search]": search } : {}) } }),
  mapOption: (p: ProductRow) => ({
    label: p.name, value: String(p.id), data: p,
    note: `${p.status === "inactive" ? "inactive · " : ""}${p.quantity ?? 0} in stock`,
  }),
};

/**
 * New and Edit are one form, so editing changes everything entering set: the customer, when it was placed, the
 * address, the items, the charge, the payment mode and where it stands (for app orders too).
 * - New: re-entering an order the Hostinger loss took, or one taken over the phone. Dated when it was placed, marked
 *   with who entered it, items out of stock unless unticked, nobody messaged.
 * - Edit (`editId`): stock moves for the item changes unless unticked; the charge follows the items' total until it
 *   is typed (a delivery fee, a discount) and never goes below what is paid; a delivery change messages the customer.
 * Payments are recorded on the order (one, or several instalments), each on its own date.
 */
export default function OrderFormDialog({ visible, onHide, onSaved, editId = null }: {
  visible: boolean;
  onHide: () => void;
  onSaved: (order: Order) => void;
  editId?: number | null;
}) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const options = useOptions();
  const editing = useQuery({ queryKey: ["orders", "one", String(editId)], queryFn: () => adminApi.order(Number(editId)), enabled: visible && !!editId });
  const order = editId ? editing.data ?? null : null;
  const initial = useMemo(() => (order ? fromOrder(order) : blank()), [order]);
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<Values>({ defaultValues: initial });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  // The charge follows the items' total until someone types their own (or, editing, it already differed).
  const [chargeTyped, setChargeTyped] = useState(false);
  useEffect(() => {
    if (!visible) return;
    reset(initial);
    setChargeTyped(!!order && Math.abs(Number(order.charged_amount) - Number(order.amount)) > 0.5);
  }, [visible, initial, order, reset]);
  const items = useWatch({ control, name: "items" });
  const charged = useWatch({ control, name: "charged_amount" });
  const total = (items ?? []).reduce((sum, l) => sum + (l.price ?? 0) * (l.quantity ?? 0), 0);
  // Until someone types a charge it is the items' total, worked out here, never copied into the field (a copied total
  // went stale: an order was saved charged UGX 0 with 220,000 of items, the browser test, 14/11/2026).
  const charge = chargeTyped ? charged ?? 0 : total;
  const paid = order ? Number(order.amount_paid ?? 0) : 0;
  const due = charge - paid;

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = {
        customer_id: Number(v.customer?.value),
        placed_at: v.placed_at,
        address: v.address,
        payment_mode: v.payment_mode,
        status: v.status,
        delivery_status: v.delivery_status,
        charged_amount: chargeTyped ? v.charged_amount : total,
        items: v.items.map((l) => ({ product_id: Number(l.product?.value), quantity: l.quantity, price: l.price })),
      };
      return order
        ? adminApi.updateOrder(order.id, { ...body, adjust_stock: v.stock, ...(formState.dirtyFields.payment_status ? { payment_status: v.payment_status } : {}) })
        : adminApi.createOrder({ ...body, deduct_stock: v.stock });
    },
    meta: { skipGlobalError: true },
    onSuccess: async (r) => {
      await Promise.all(["orders", "dashboard", "products", "payments"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      toast.success(r.message);
      onSaved(r.data);
      onHide();
    },
    onError: (error) => {
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      Object.entries(data?.errors ?? {}).forEach(([k, m]) => {
        const name = k === "customer_id" ? "customer" : k.replace(/^items\.(\d+)\.product_id$/, "items.$1.product");
        setError(name as never, { message: m[0] });
      });
      toast.error(data?.message ?? "The order was not saved. Check the form.");
    },
  });
  const close = () => guardedClose(formState.isDirty, save.isPending, onHide);
  const err = (path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], formState.errors) as { message?: string } | undefined;
  const loading = !!editId && editing.isPending;

  return (
    <Dialog
      header={order ? `Edit order #${order.order_number}` : editId ? "Edit order" : "New order"}
      visible={visible}
      onHide={close}
      style={{ width: "min(46rem, 96vw)" }}
      modal
      footer={loading ? (
        // Loading the order to edit: nothing to save yet, so no total and no save button that reads like "create".
        <div className="flex justify-end"><Button label="Cancel" text onClick={onHide} /></div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-sm text-(--text-secondary)">
            Charged: <b className="text-(--text-primary)">{ugx(charge)}</b>
            {order && paid > 0 && <> · paid {ugx(paid)} · <b className={due > 0 ? "text-red-600 dark:text-red-400" : ""}>{ugx(Math.max(0, due))} owed</b></>}
          </p>
          <div className="flex gap-2">
            <Button label="Cancel" text onClick={close} disabled={save.isPending} />
            <Button label={editId ? "Save" : "Enter order"} icon="pi pi-check" loading={save.isPending}
              onClick={handleSubmit((v) => confirmSubmit(order ? `the changes to order #${order.order_number}` : `an order of ${ugx(charge)} for ${v.customer?.label}`, () => save.mutateAsync(v)), () => toast.error("Some fields need attention."))} />
          </div>
        </div>
      )}
    >
      {loading ? <div className="h-72 animate-pulse rounded-xl bg-(--border-color)" aria-label="Loading" /> : (
      <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
        <FormSection n={1} title="Who and when" hint={order ? undefined : "For an order the app lost, put the day and time it was really placed."}>
          <Field label="Customer" required error={err("customer")?.message}>
            <Controller name="customer" control={control} rules={{ required: "Choose the customer" }}
              render={({ field }) => (
                <InfiniteSelect {...customerPicker} value={field.value} invalid={!!err("customer")} onChange={field.onChange}
                  placeholder="Choose the customer" searchPlaceholder="Name, phone or email" />
              )} />
          </Field>
          <Field label="Placed" htmlFor="placed_at" hint={order ? "Pick the day, then reopen it to set the time." : "Leave empty for now. Pick the day, then reopen it to set the time."} error={err("placed_at")?.message}>
            <Controller name="placed_at" control={control} render={({ field }) => <PlacedAtField id="placed_at" value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="Delivery address" required htmlFor="address" error={err("address")?.message}>
            <Controller name="address" control={control} rules={{ validate: (v) => (v.trim() ? true : "Enter where it goes") }}
              render={({ field }) => <InputText id="address" {...field} className="w-full" placeholder="Town, street, landmark" />} />
          </Field>
        </FormSection>

        <FormSection n={2} title="Items" hint="The price is the product's price today: change it if the customer paid another price then.">
          <div className="space-y-3">
            {fields.map((f, i) => {
              const line = items?.[i];
              return (
                <div key={f.id} className="grid grid-cols-2 items-start gap-2 rounded-xl border border-(--border-color) p-3 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto] sm:border-0 sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <Controller name={`items.${i}.product`} control={control} rules={{ required: "Choose the product" }}
                      render={({ field }) => (
                        <InfiniteSelect {...productPicker} value={field.value} invalid={!!err(`items.${i}.product`)}
                          onChange={(o) => {
                            field.onChange(o);
                            const p = o?.data as ProductRow | undefined;
                            if (p) setValue(`items.${i}.price`, Number(p.price), { shouldDirty: true });
                          }}
                          placeholder="Choose a product" searchPlaceholder="Search products" />
                      )} />
                    {err(`items.${i}.product`)?.message && <small className="text-red-600">{err(`items.${i}.product`)?.message}</small>}
                  </div>
                  <Controller name={`items.${i}.quantity`} control={control} rules={{ validate: (v) => (v && v >= 1 ? true : "At least 1") }}
                    render={({ field }) => (
                      <InputNumber value={field.value} onValueChange={(e) => field.onChange(e.value ?? null)} min={1} placeholder="Qty"
                        aria-label="Quantity" invalid={!!err(`items.${i}.quantity`)} className="w-full" inputClassName="w-full" />
                    )} />
                  <Controller name={`items.${i}.price`} control={control} rules={{ validate: (v) => (v !== null && v >= 0 ? true : "Enter the price") }}
                    render={({ field }) => (
                      <InputNumber value={field.value} onValueChange={(e) => field.onChange(e.value ?? null)} min={0} prefix="UGX " placeholder="Price each"
                        aria-label="Price each" invalid={!!err(`items.${i}.price`)} className="w-full" inputClassName="w-full" />
                    )} />
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                    <span className="text-sm text-(--text-muted) sm:hidden">{ugx((line?.price ?? 0) * (line?.quantity ?? 0))}</span>
                    <Button type="button" icon="pi pi-trash" text severity="danger" aria-label="Remove this item" disabled={fields.length === 1} onClick={() => remove(i)} />
                  </div>
                </div>
              );
            })}
            <Button type="button" label="Add another item" icon="pi pi-plus" outlined size="small" onClick={() => append({ ...blankLine })} />
          </div>
          <Field>
            <Controller name="stock" control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox inputId="stock" checked={field.value} onChange={(e) => field.onChange(!!e.checked)} />
                  <span>
                    {order ? "Move stock for the item changes" : "Take these items out of stock"}
                    <span className="block text-xs text-(--text-muted)">
                      {order ? "Removed items go back into stock and added ones come out. Untick if the stock count is already right." : "Untick if the stock count already allows for this order."}
                    </span>
                  </span>
                </label>
              )} />
          </Field>
        </FormSection>

        <FormSection n={3} title="Money" hint={order ? "Payments are recorded on the order, one or several instalments." : "Nothing is paid yet: record payments on the order once it is entered, one or several instalments, each on the day it was paid."}>
          <Field label="Charged" required htmlFor="charged_amount" error={err("charged_amount")?.message}
            hint={chargeTyped
              ? <>Items total {ugx(total)}. <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-medium text-(--brand-ink) underline" onClick={() => { setChargeTyped(false); setValue("charged_amount", null, { shouldDirty: true }); }}>Use the items&apos; total</button></>
              : "What the customer pays: the items' total, or type another (a delivery fee, a discount)."}>
            <Controller name="charged_amount" control={control}
              rules={{ validate: (v) => { const c = chargeTyped ? v : total; return c === null ? "Enter the amount charged" : c < paid ? `Less than what is already paid (${ugx(paid)})` : true; } }}
              render={({ field }) => (
                <InputNumber inputId="charged_amount" value={chargeTyped ? field.value : total}
                  onValueChange={(e) => {
                    // Only a real change makes it typed: the field can report its own (total) value back.
                    if (!chargeTyped && (e.value ?? null) === total) return;
                    setChargeTyped(true);
                    field.onChange(e.value ?? null);
                  }}
                  min={0} prefix="UGX " className="w-full" inputClassName="w-full" />
              )} />
          </Field>
          <Field label="Payment mode" required htmlFor="payment_mode" error={err("payment_mode")?.message}>
            <Controller name="payment_mode" control={control} rules={{ required: "Choose the payment mode" }}
              render={({ field }) => (
                <Dropdown inputId="payment_mode" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full"
                  options={choices(options.data?.payment_modes ?? [], modeLabel)} />
              )} />
          </Field>
        </FormSection>

        <FormSection n={4} title="Where it stands" hint={order ? "Changing the delivery sends the customer a message on their phone." : undefined}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status">
              <Controller name="status" control={control}
                render={({ field }) => <Dropdown inputId="status" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" options={choices(options.data?.order_statuses ?? [])} />} />
            </Field>
            <Field label="Delivery" htmlFor="delivery_status">
              <Controller name="delivery_status" control={control}
                render={({ field }) => <Dropdown inputId="delivery_status" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" options={choices(options.data?.order_delivery_statuses ?? [])} />} />
            </Field>
            {order && (
              <Field label="Payment" htmlFor="payment_status" hint="Recording payments sets this for you when the balance reaches zero." className="sm:col-span-2">
                <Controller name="payment_status" control={control}
                  render={({ field }) => <Dropdown inputId="payment_status" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" options={choices(options.data?.order_payment_statuses ?? [])} />} />
              </Field>
            )}
          </div>
        </FormSection>
      </form>
      )}
    </Dialog>
  );
}
