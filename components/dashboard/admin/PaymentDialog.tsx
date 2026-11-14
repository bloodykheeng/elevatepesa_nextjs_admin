"use client";

import { useEffect } from "react";
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
import { useOptions } from "./RecordForm";
import { methodLabel } from "./parts";
import { ugx } from "@/lib/format";
import { PlacedAtField } from "./pickers";

type Values = { amount: number | null; payment_method: string | null; transaction_number: string; details: string; paid_at: string | null };

/**
 * Record money received against an order or a package. The amount can never pass the balance due;
 * the API checks it again and pushes "Payment received" to the customer's phone. A payment re-entered for an
 * earlier day ("Paid on") is dated then and sends no message.
 */
export default function PaymentDialog({
  visible,
  onHide,
  balance,
  reference,
  submit,
  onSaved,
}: {
  visible: boolean;
  onHide: () => void;
  balance: number;
  /** "order #ABC123": in the header and the confirmation. */
  reference: string;
  submit: (body: Values) => Promise<{ message: string }>;
  onSaved: () => void;
}) {
  const toast = usePrimeReactToast();
  const options = useOptions();
  const { control, handleSubmit, reset, setError, formState } = useForm<Values>({
    defaultValues: { amount: null, payment_method: null, transaction_number: "", details: "", paid_at: null },
  });
  useEffect(() => { if (visible) reset({ amount: null, payment_method: null, transaction_number: "", details: "", paid_at: null }); }, [visible, reset]);

  const save = useMutation({
    mutationFn: submit,
    meta: { skipGlobalError: true },
    onSuccess: (r) => { toast.success(r.message); onSaved(); onHide(); },
    onError: (error) => {
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      if (data?.errors) Object.entries(data.errors).forEach(([k, m]) => setError(k as keyof Values, { message: m[0] }));
      toast.error(data?.message ?? "The payment was not recorded.");
    },
  });
  const close = () => guardedClose(formState.isDirty, save.isPending, onHide);

  return (
    <Dialog
      header={`Record a payment for ${reference}`}
      visible={visible}
      onHide={close}
      style={{ width: "min(30rem, 95vw)" }}
      modal
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" text onClick={close} disabled={save.isPending} />
          <Button label="Record payment" icon="pi pi-check" loading={save.isPending}
            onClick={handleSubmit((v) => confirmSubmit(`a payment of ${ugx(v.amount ?? 0)} for ${reference}`, () => save.mutateAsync(v)))} />
        </div>
      }
    >
      <div className="space-y-4">
        <p className="m-0 rounded-lg bg-(--brand-light) px-3 py-2 text-sm text-(--brand-ink)">Balance due: <b>{ugx(balance)}</b></p>
        <Field label="Amount" required htmlFor="amount" error={formState.errors.amount?.message}>
          <Controller name="amount" control={control}
            rules={{ validate: (v) => (!v || v <= 0 ? "Enter the amount received" : v > balance ? `More than the balance due (${ugx(balance)})` : true) }}
            render={({ field }) => <InputNumber inputId="amount" value={field.value} onValueChange={(e) => field.onChange(e.value ?? null)} prefix="UGX " min={0} className="w-full" inputClassName="w-full" autoFocus />} />
        </Field>
        <Field label="How it was paid" required htmlFor="payment_method" error={formState.errors.payment_method?.message}>
          <Controller name="payment_method" control={control} rules={{ required: "Choose how it was paid" }}
            render={({ field }) => (
              <Dropdown inputId="payment_method" value={field.value} onChange={(e) => field.onChange(e.value)} className="w-full" placeholder="Choose"
                options={(options.data?.payment_methods ?? []).map((m) => ({ label: methodLabel(m), value: m }))} />
            )} />
        </Field>
        <Field label="Paid on" htmlFor="paid_at" hint="Leave empty for a payment received now (the customer gets a message). An earlier day records it quietly." error={formState.errors.paid_at?.message}>
          <Controller name="paid_at" control={control} render={({ field }) => <PlacedAtField id="paid_at" label="Paid on" value={field.value} onChange={field.onChange} />} />
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
