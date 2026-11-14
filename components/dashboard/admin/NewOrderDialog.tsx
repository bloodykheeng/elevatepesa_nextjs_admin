"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  deduct_stock: boolean;
  items: Line[];
};

const blankLine: Line = { product: null, quantity: 1, price: null };
const blank = (): Values => ({
  customer: null, placed_at: null, address: "", payment_mode: "cod", status: "pending", delivery_status: "pending", deduct_stock: true, items: [{ ...blankLine }],
});

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
 * Enter an order a customer did not place in the app: re-entering one the Hostinger loss took, or one taken over the
 * phone. The API dates it when it was placed, marks who entered it, takes the items out of stock (unless unticked)
 * and messages nobody. Payments are recorded on the order afterwards, each on its own date.
 */
export default function NewOrderDialog({ visible, onHide, onSaved }: { visible: boolean; onHide: () => void; onSaved: (order: Order) => void }) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const options = useOptions();
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<Values>({ defaultValues: blank() });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  useEffect(() => { if (visible) reset(blank()); }, [visible, reset]);
  const items = useWatch({ control, name: "items" });
  const total = (items ?? []).reduce((sum, l) => sum + (l.price ?? 0) * (l.quantity ?? 0), 0);

  const save = useMutation({
    mutationFn: (v: Values) => adminApi.createOrder({
      customer_id: Number(v.customer?.value),
      placed_at: v.placed_at,
      address: v.address,
      payment_mode: v.payment_mode,
      status: v.status,
      delivery_status: v.delivery_status,
      deduct_stock: v.deduct_stock,
      items: v.items.map((l) => ({ product_id: Number(l.product?.value), quantity: l.quantity, price: l.price })),
    }),
    meta: { skipGlobalError: true },
    onSuccess: async (r) => {
      await Promise.all(["orders", "dashboard", "products"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
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
      toast.error(data?.message ?? "The order was not entered. Check the form.");
    },
  });
  const close = () => guardedClose(formState.isDirty, save.isPending, onHide);
  const err = (path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], formState.errors) as { message?: string } | undefined;

  return (
    <Dialog
      header="New order"
      visible={visible}
      onHide={close}
      style={{ width: "min(46rem, 96vw)" }}
      modal
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-sm text-(--text-secondary)">Total: <b className="text-(--text-primary)">{ugx(total)}</b></p>
          <div className="flex gap-2">
            <Button label="Cancel" text onClick={close} disabled={save.isPending} />
            <Button label="Enter order" icon="pi pi-check" loading={save.isPending}
              onClick={handleSubmit((v) => confirmSubmit(`an order of ${ugx(total)} for ${v.customer?.label}`, () => save.mutateAsync(v)), () => toast.error("Some fields need attention."))} />
          </div>
        </div>
      }
    >
      <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
        <FormSection n={1} title="Who and when" hint="For an order the app lost, put the day and time it was really placed.">
          <Field label="Customer" required error={err("customer")?.message}>
            <Controller name="customer" control={control} rules={{ required: "Choose the customer" }}
              render={({ field }) => (
                <InfiniteSelect {...customerPicker} value={field.value} invalid={!!err("customer")}
                  onChange={field.onChange}
                  placeholder="Choose the customer" searchPlaceholder="Name, phone or email" />
              )} />
          </Field>
          <Field label="Placed" htmlFor="placed_at" hint="Leave empty for now." error={err("placed_at")?.message}>
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
                      <InputNumber value={field.value} onValueChange={(e) => field.onChange(e.value ?? null)} min={1} showButtons={false} placeholder="Qty"
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
            <Controller name="deduct_stock" control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox inputId="deduct_stock" checked={field.value} onChange={(e) => field.onChange(!!e.checked)} />
                  <span>
                    Take these items out of stock
                    <span className="block text-xs text-(--text-muted)">Untick if the stock count already allows for this order.</span>
                  </span>
                </label>
              )} />
          </Field>
        </FormSection>

        <FormSection n={3} title="Where it stands" hint="Nothing is paid yet: record payments on the order once it is entered, each on the day it was paid.">
          <Field label="Payment mode" required htmlFor="payment_mode" error={err("payment_mode")?.message}>
            <Controller name="payment_mode" control={control} rules={{ required: "Choose the payment mode" }}
              render={({ field }) => (
                <Dropdown inputId="payment_mode" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full"
                  options={choices(options.data?.payment_modes ?? [], modeLabel)} />
              )} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="status">
              <Controller name="status" control={control}
                render={({ field }) => <Dropdown inputId="status" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" options={choices(options.data?.order_statuses ?? [])} />} />
            </Field>
            <Field label="Delivery" htmlFor="delivery_status">
              <Controller name="delivery_status" control={control}
                render={({ field }) => <Dropdown inputId="delivery_status" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" options={choices(options.data?.order_delivery_statuses ?? [])} />} />
            </Field>
          </div>
        </FormSection>
      </form>
    </Dialog>
  );
}
