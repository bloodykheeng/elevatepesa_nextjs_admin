"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "@/components/common/Dialog";
import { Field } from "@/components/dashboard/ui";
import { confirmSubmit, guardedClose } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import type { Payment } from "@/services/types/pesa";
import { useOptions } from "./RecordForm";
import { methodLabel } from "./parts";
import { dateTime, ugx } from "@/lib/format";
import { PlacedAtField } from "./pickers";

type Values = { amount: number | null; payment_method: string | null; transaction_number: string; details: string; paid_at: string | null };

/**
 * Record money received against an order or a package (one payment or the next instalment), or correct one already
 * recorded (`payment`). The amount can never pass what is owed; the API checks it again. A new payment received now
 * pushes "Payment received" to the customer's phone; one re-entered for an earlier day ("Paid on") is dated then and
 * sends nothing, and so does a correction. "Paid on" cannot go before the order or package (`notBefore`).
 */
export default function PaymentDialog({
  visible,
  onHide,
  balance,
  reference,
  submit,
  onSaved,
  payment = null,
  notBefore = null,
}: {
  visible: boolean;
  onHide: () => void;
  /** Owed now, before this payment. */
  balance: number;
  /** "order #ABC123": in the header and the confirmation. */
  reference: string;
  submit: (body: Values) => Promise<{ message: string }>;
  onSaved: () => void;
  /** Correcting this payment instead of recording a new one. */
  payment?: Payment | null;
  /** When the order was placed (or the package booked): no payment before it. */
  notBefore?: string | null;
}) {
  const toast = usePrimeReactToast();
  const options = useOptions();
  // A correction may use what this payment already counts for.
  const allowed = balance + (payment ? Number(payment.amount ?? 0) : 0);
  const initial = useMemo<Values>(() => payment
    ? { amount: Number(payment.amount), payment_method: payment.payment_method, transaction_number: payment.transaction_number ?? "", details: payment.details ?? "", paid_at: payment.created_at ?? null }
    : { amount: null, payment_method: null, transaction_number: "", details: "", paid_at: null }, [payment]);
  const { control, handleSubmit, reset, setError, formState } = useForm<Values>({ defaultValues: initial });
  useEffect(() => { if (visible) reset(initial); }, [visible, initial, reset]);

  const save = useMutation({
    mutationFn: submit,
    meta: { skipGlobalError: true },
    onSuccess: (r) => { toast.success(r.message); onSaved(); onHide(); },
    onError: (error) => {
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      if (data?.errors) Object.entries(data.errors).forEach(([k, m]) => setError(k as keyof Values, { message: m[0] }));
      toast.error(data?.message ?? "The payment was not saved.");
    },
  });
  const close = () => guardedClose(formState.isDirty, save.isPending, onHide);

  return (
    <Dialog
      header={payment ? `Correct payment${payment.receipt_number ? ` ${payment.receipt_number}` : ""} for ${reference}` : `Record a payment for ${reference}`}
      visible={visible}
      onHide={close}
      style={{ width: "min(30rem, 95vw)" }}
      modal
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" text onClick={close} disabled={save.isPending} />
          <Button label={payment ? "Save" : "Record payment"} icon="pi pi-check" loading={save.isPending}
            onClick={handleSubmit((v) => confirmSubmit(`${payment ? "this correction to " : ""}a payment of ${ugx(v.amount ?? 0)} for ${reference}`, () => save.mutateAsync(v)))} />
        </div>
      }
    >
      <div className="space-y-4">
        <p className="m-0 rounded-lg bg-(--brand-light) px-3 py-2 text-sm text-(--brand-ink)">
          {payment ? <>Can be up to <b>{ugx(allowed)}</b> (the balance plus this payment).</> : <>Balance due: <b>{ugx(balance)}</b>. Pay it at once, or record part now and the rest as later instalments.</>}
        </p>
        <Field label="Amount" required htmlFor="amount" error={formState.errors.amount?.message}>
          <Controller name="amount" control={control}
            rules={{ validate: (v) => (!v || v <= 0 ? "Enter the amount received" : v > allowed ? `More than is owed (${ugx(allowed)})` : true) }}
            render={({ field }) => <InputNumber inputId="amount" value={field.value} onValueChange={(e) => field.onChange(e.value ?? null)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" autoFocus />} />
        </Field>
        <Field label="How it was paid" required htmlFor="payment_method" error={formState.errors.payment_method?.message}>
          <Controller name="payment_method" control={control} rules={{ required: "Choose how it was paid" }}
            render={({ field }) => (
              <Dropdown inputId="payment_method" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" placeholder="Choose"
                options={(options.data?.payment_methods ?? []).map((m) => ({ label: methodLabel(m), value: m }))} />
            )} />
        </Field>
        <Field label="Paid on" htmlFor="paid_at" error={formState.errors.paid_at?.message}
          hint={payment
            ? `When this money came in${notBefore ? `: not before ${dateTime(notBefore)}` : ""}.`
            : `Leave empty for money received now (the customer gets a message). An earlier day and time records it quietly${notBefore ? `, not before ${dateTime(notBefore)}` : ""}.`}>
          <Controller name="paid_at" control={control} render={({ field }) => <PlacedAtField id="paid_at" label="Paid on" value={field.value} onChange={field.onChange} min={notBefore} />} />
        </Field>
        <Field label="Transaction number" htmlFor="transaction_number" hint="The mobile money or bank reference, if there is one." error={formState.errors.transaction_number?.message}>
          <Controller name="transaction_number" control={control} render={({ field }) => <InputText id="transaction_number" {...field} className="w-full" />} />
        </Field>
        <Field label="Note" htmlFor="details" error={formState.errors.details?.message}>
          <Controller name="details" control={control} render={({ field }) => <InputTextarea id="details" {...field} rows={2} autoResize className="w-full" />} />
        </Field>
      </div>
    </Dialog>
  );
}
