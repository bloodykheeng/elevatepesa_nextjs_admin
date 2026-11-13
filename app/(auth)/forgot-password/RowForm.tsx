"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { postForgotPassword } from "@/services/auth/auth-service";
import { Banner, FieldError, apiMessage, inputCls, primaryButtonCls } from "@/components/auth/formParts";

const schema = z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address") });

/** The API answers the same whether or not the address is a staff account, so this does too. */
export default function ForgotPasswordRowForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>({ resolver: zodResolver(schema) });

  const send = useMutation({
    mutationFn: (email: string) => postForgotPassword(email),
    meta: { skipGlobalError: true },
    onMutate: () => setError(null),
    onSuccess: (response) => setSent(response.data.message),
    onError: (e) => setError(apiMessage(e)),
  });

  if (sent) {
    return (
      <div className="space-y-4">
        <Banner tone="success">{sent}</Banner>
        <p className="text-center text-sm text-(--text-muted)">No email after a few minutes? Check spam, or send it again.</p>
        <button type="button" className="w-full text-sm font-semibold text-(--brand-ink) hover:underline" onClick={() => setSent(null)}>
          Send again
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit((v) => send.mutate(v.email))} className="space-y-5">
      {error && <Banner tone="error">{error}</Banner>}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-(--text-secondary)">Email</label>
        <input id="email" type="email" autoComplete="username" autoFocus placeholder="you@elevatepesa.com" className={inputCls(!!errors.email)} {...register("email")} />
        <FieldError msg={errors.email?.message} />
      </div>
      <button type="submit" disabled={send.isPending} className={primaryButtonCls}>
        {send.isPending && <span className="pi pi-spin pi-spinner text-sm" />}
        Send reset link
      </button>
    </form>
  );
}
