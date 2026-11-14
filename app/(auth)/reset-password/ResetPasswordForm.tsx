"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { postResetPassword } from "@/services/auth/auth-service";
import { Banner, FieldError, apiMessage, inputCls, primaryButtonCls } from "@/components/auth/formParts";

const schema = z
  .object({
    password: z.string().min(6, "At least 6 characters"),
    password_confirmation: z.string().min(1, "Repeat the new password"),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ["password_confirmation"], message: "The two passwords differ" });

type Values = z.infer<typeof schema>;

/** Each password box has its own eye, so the repeat can be checked too. */
function PasswordInput({ id, invalid, autoFocus, ...field }: { id: string; invalid: boolean; autoFocus?: boolean } & ReturnType<ReturnType<typeof useForm<Values>>["register"]>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} autoComplete="new-password" autoFocus={autoFocus} className={`${inputCls(invalid)} pr-11`} {...field} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-(--text-muted) hover:text-(--text-primary)">
        {show ? <MdVisibilityOff /> : <MdVisibility />}
      </button>
    </div>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });

  const save = useMutation({
    mutationFn: (v: Values) => postResetPassword({ token, ...v }),
    meta: { skipGlobalError: true },
    onMutate: () => setError(null),
    onSuccess: (response) => setDone(response.data.message),
    onError: (e) => setError(apiMessage(e)),
  });

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <Banner tone="success">{done}</Banner>
        <p className="text-sm text-(--text-muted)">Customers: open the Elevate Pesa app and sign in. Staff:</p>
        <Link href="/login" className={primaryButtonCls}>Go to sign in</Link>
      </div>
    );
  }

  const expired = !!error && /expired|invalid/i.test(error);

  return (
    <form noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
      {error && (
        <Banner tone="error">
          {error}{" "}
          {expired && <Link href="/reset-password" className="font-semibold underline">Ask for a new link</Link>}
        </Banner>
      )}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-(--text-secondary)">New password</label>
        <PasswordInput id="password" invalid={!!errors.password} autoFocus {...register("password")} />
        <FieldError msg={errors.password?.message} />
      </div>
      <div>
        <label htmlFor="password_confirmation" className="mb-1.5 block text-sm font-medium text-(--text-secondary)">Repeat the new password</label>
        <PasswordInput id="password_confirmation" invalid={!!errors.password_confirmation} {...register("password_confirmation")} />
        <FieldError msg={errors.password_confirmation?.message} />
      </div>
      <button type="submit" disabled={save.isPending} className={primaryButtonCls}>
        {save.isPending && <span className="pi pi-spin pi-spinner text-sm" />}
        Save new password
      </button>
    </form>
  );
}
