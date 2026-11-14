"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Dialog } from "@/components/common/Dialog";
import { Field, FormSection } from "@/components/dashboard/ui";
import PhotoUploaderPicker, { type UploadedPhoto } from "@/components/dashboard/forms/PhotoUploaderPicker";
import { confirmSubmit, guardedClose } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { adminApi, photoUrl, toFormData } from "@/services/admin";
import type { Options } from "@/services/types/pesa";
import { calendarDate, calendarDay } from "@/lib/format";
import InfiniteSelect, { type Option } from "@/components/dashboard/forms/InfiniteSelect";
import { PlacedAtField, customerPicker } from "./pickers";

/** The dropdown choices every form and filter reads: one call, cached for five minutes. */
export function useOptions() {
  return useQuery({ queryKey: ["options"], queryFn: adminApi.options, staleTime: 5 * 60 * 1000 });
}

export type FieldDef = {
  name: string;
  label: string;
  /**
   * "customer": one customer from GET /admin/customers (sent as its id). "moment": when something happened, a date
   * and time on the Kampala clock, never in the future, sent as an instant (empty = now).
   */
  type: "text" | "textarea" | "number" | "money" | "status" | "select" | "date" | "password" | "email" | "customer" | "moment";
  required?: boolean;
  hint?: string;
  /** For "select": the list in GET /admin/options. */
  optionsKey?: keyof Options;
  /** For "status": the values offered (active/inactive by default). */
  values?: string[];
  /** Only shown when this returns true for the current values (a field that depends on another). */
  when?: (values: Record<string, unknown>) => boolean;
  /** For a "select" narrowed by another field: keep only options whose `parentKey` equals values[parentField]. */
  parent?: { field: string; key: string };
  /** Read the starting value from another key of the record (a "moment" `placed_at` starts from `created_at`). */
  from?: string;
  /** For "moment": no day before this (an instant). */
  min?: string | null;
};

export type Section = { title: string; hint?: string; fields: FieldDef[] };

const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

/**
 * Create or edit one record: numbered sections of fields, an optional photo with a live preview
 * (the current one shown when editing; replace or remove it), "Confirm submission" before
 * sending, the API's field errors shown under each field, and unsaved changes never lost
 * silently. Saves as multipart through `save`.
 */
export default function RecordForm<T extends { id: number }>({
  visible,
  onHide,
  record,
  title,
  sections,
  photo,
  defaults,
  save,
  invalidate,
  what,
  onSaved,
}: {
  visible: boolean;
  onHide: () => void;
  /** null when creating. */
  record: (T & Record<string, unknown>) | null;
  /** "product category": used in the header and the confirmation. */
  title: string;
  sections: Section[];
  /** The record has a picture; `required` when a new one must have it. */
  photo?: { required?: boolean; hint?: string };
  defaults?: Record<string, unknown>;
  save: (body: FormData, id?: number) => Promise<{ message: string; data: T }>;
  /** Query keys to refresh after a save. */
  invalidate: string[];
  what: string;
  onSaved?: (saved: T) => void;
}) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const options = useOptions();
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  const initial = useMemo(() => {
    const v: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.type === "customer" || f.type === "moment") {
        const start = record?.[f.from ?? f.name] as { id: number; name: string; phone?: string | null } | string | null | undefined;
        v[f.name] = f.type === "customer"
          ? (start && typeof start === "object" ? ({ label: start.name, value: String(start.id), note: start.phone ?? undefined } as Option) : null)
          : (typeof start === "string" ? start : null);
        return;
      }
      const raw = f.type === "password" ? "" : record?.[f.name] ?? defaults?.[f.name] ?? (f.type === "status" ? (f.values ?? ["active"])[0] : null);
      v[f.name] = f.type === "number" || f.type === "money" || f.type === "select" ? (raw === null || raw === "" || raw === undefined ? null : Number(raw)) : raw ?? "";
    });
    v.photo = record?.photo_url ? ({ status: "existing", previewUrl: photoUrl(String(record.photo_url)) } as UploadedPhoto) : null;
    return v;
  }, [record, defaults, fields]);

  const form = useForm<Record<string, unknown>>({ defaultValues: initial });
  const { control, handleSubmit, reset, setError, setValue, formState } = form;
  useEffect(() => { if (visible) reset(initial); }, [visible, initial, reset]);
  const values = useWatch({ control }) as Record<string, unknown>;

  const mutation = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const body: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (f.when && !f.when(v)) { body[f.name] = null; return; }
        const value = v[f.name];
        body[f.name] = f.type === "date" && value instanceof Date ? calendarDay(value)
          : f.type === "customer" ? ((value as Option | null)?.value ?? null)
          : value;
      });
      const p = v.photo as UploadedPhoto | null;
      const removed = !!record?.photo_url && !p;
      return save(toFormData(body, p?.status === "new" ? p.file : null, removed), record?.id);
    },
    meta: { skipGlobalError: true },
    onSuccess: async (r) => {
      await Promise.all(invalidate.map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      queryClient.invalidateQueries({ queryKey: ["options"] });
      toast.success(r.message);
      onSaved?.(r.data);
      onHide();
    },
    onError: (error) => {
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      if (data?.errors) Object.entries(data.errors).forEach(([k, m]) => setError(k, { message: m[0] }));
      toast.error(data?.message ?? "Could not save. Check the form and try again.");
    },
  });

  const close = () => guardedClose(formState.isDirty, mutation.isPending, onHide);

  const optionsFor = (f: FieldDef) => {
    const list = (f.optionsKey ? (options.data?.[f.optionsKey] as unknown as Record<string, unknown>[]) : []) ?? [];
    const narrowed = f.parent ? list.filter((o) => String(o[f.parent!.key]) === String(values[f.parent!.field] ?? "")) : list;
    return narrowed.map((o) => ({ label: `${o.name}${o.status === "inactive" ? " (inactive)" : ""}`, value: Number(o.id) }));
  };

  const renderField = (f: FieldDef) => {
    if (f.when && !f.when(values)) return null;
    const err = formState.errors[f.name]?.message as string | undefined;
    return (
      <Field key={f.name} label={f.label} required={f.required} hint={f.hint} error={err} htmlFor={f.name}>
        <Controller
          name={f.name}
          control={control}
          rules={f.required ? { validate: (v) => (v !== null && v !== undefined && v !== "" ? true : `Enter the ${f.label.toLowerCase()}`) } : undefined}
          render={({ field }) => {
            switch (f.type) {
              case "textarea":
                return <InputTextarea id={f.name} value={String(field.value ?? "")} onChange={(e) => field.onChange(e.target.value)} rows={4} autoResize className="w-full" />;
              case "number":
                return <InputNumber inputId={f.name} value={field.value as number | null} onValueChange={(e) => field.onChange(e.value ?? null)} min={0} useGrouping className="w-full" inputClassName="w-full" />;
              case "money":
                return <InputNumber inputId={f.name} value={field.value as number | null} onValueChange={(e) => field.onChange(e.value ?? null)} min={0} prefix="UGX " className="w-full" inputClassName="w-full" />;
              case "status":
                return <Dropdown inputId={f.name} value={field.value} options={(f.values ?? ["active", "inactive"]).map((v) => ({ label: label(v), value: v }))} onChange={(e) => field.onChange(e.value)} className="w-full" />;
              case "select":
                return (
                  <Dropdown inputId={f.name} value={field.value} options={optionsFor(f)} onChange={(e) => field.onChange(e.value ?? null)} filter showClear={!f.required}
                    placeholder={f.parent && !values[f.parent.field] ? "Pick the one above first" : `Choose ${f.label.toLowerCase()}`}
                    disabled={!!f.parent && !values[f.parent.field]} loading={options.isPending} className="w-full" emptyMessage="Nothing to choose" />
                );
              case "date":
                return (
                  <Calendar inputId={f.name} value={field.value instanceof Date ? field.value : calendarDate(field.value ? String(field.value) : null)}
                    onChange={(e) => field.onChange(e.value ?? null)} dateFormat="d M yy" showIcon showButtonBar className="w-full" />
                );
              case "password":
                return <InputText id={f.name} type="password" autoComplete="new-password" value={String(field.value ?? "")} onChange={(e) => field.onChange(e.target.value)} className="w-full" />;
              case "customer":
                return <InfiniteSelect {...customerPicker} value={field.value as Option | null} onChange={field.onChange} invalid={!!err}
                  placeholder="Choose the customer" searchPlaceholder="Name, phone or email" />;
              case "moment":
                return <PlacedAtField id={f.name} label={f.label} value={(field.value as string | null) ?? null} onChange={field.onChange} min={f.min} />;
              case "email":
                return <InputText id={f.name} type="email" value={String(field.value ?? "")} onChange={(e) => field.onChange(e.target.value)} className="w-full" />;
              default:
                return <InputText id={f.name} value={String(field.value ?? "")} onChange={(e) => field.onChange(e.target.value)} className="w-full" />;
            }
          }}
        />
      </Field>
    );
  };

  return (
    <Dialog
      header={record ? `Edit ${title}` : `New ${title}`}
      visible={visible}
      onHide={close}
      style={{ width: "min(40rem, 95vw)" }}
      modal
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" text onClick={close} disabled={mutation.isPending} />
          <Button label={record ? "Save" : "Create"} icon="pi pi-check" loading={mutation.isPending}
            onClick={handleSubmit((v) => confirmSubmit(what, () => mutation.mutateAsync(v)), () => toast.error("Some fields need attention."))} />
        </div>
      }
    >
      <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
        {sections.map((s, i) => (
          <FormSection key={s.title} n={i + 1} title={s.title} hint={s.hint}>
            {s.fields.map(renderField)}
          </FormSection>
        ))}
        {photo && (
          <FormSection n={sections.length + 1} title="Photo" hint={photo.required && !record ? "Needed: the app shows each one with its picture." : photo.hint}>
            <Field error={formState.errors.photo?.message as string | undefined}>
              <Controller
                name="photo"
                control={control}
                rules={photo.required && !record ? { validate: (v) => (v ? true : "A photo is needed: the app shows every one with its picture") } : undefined}
                render={({ field }) => (
                  <PhotoUploaderPicker
                    key={`${record?.id ?? "new"}-${visible}`}
                    setValue={(_name, p) => { setValue("photo", p, { shouldDirty: true }); field.onChange(p); }}
                    photo={field.value as UploadedPhoto | null}
                    existingPhoto={record?.photo_url ? photoUrl(String(record.photo_url)) : null}
                  />
                )}
              />
            </Field>
          </FormSection>
        )}
      </form>
    </Dialog>
  );
}
