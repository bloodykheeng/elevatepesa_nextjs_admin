"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { postToLogin } from "@/services/auth/auth-service";
import { useAuth } from "@/contexts/AuthContext";
import { getRememberedAccount, setRememberedAccount, clearRememberedAccount } from "@/lib/rememberedAccount";
import { Banner, FieldError, apiMessage, inputCls, primaryButtonCls } from "@/components/auth/formParts";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

type Values = z.infer<typeof schema>;

/**
 * Staff sign-in: email and password. "Keep me signed in" makes the session last 30 days instead
 * of 12 hours, and remembers the email on this computer for a "Welcome back" (never the password).
 */
export default function LoginRowForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [heading, setHeading] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  useEffect(() => {
    const account = getRememberedAccount();
    if (!account) return;
    setValue("email", account.email);
    setValue("remember", true);
    const firstName = account.name.trim().split(/\s+/)[0];
    if (firstName) setHeading(`Welcome back, ${firstName}`);
  }, [setValue]);

  const signIn = useMutation({
    mutationFn: postToLogin,
    meta: { skipGlobalError: true },
    onMutate: () => setServerError(null),
    onSuccess: (response, values) => {
      const { token, user } = response.data;
      if (values.remember) setRememberedAccount({ email: values.email, name: user.name });
      else clearRememberedAccount();
      login(user, token, values.remember ? 30 : 1);
      const next = params.get("next");
      router.replace(next && next.startsWith("/dashboard") ? next : "/dashboard");
    },
    onError: (error) => setServerError(apiMessage(error, "Sign-in failed. Try again.")),
  });

  return (
    <form noValidate onSubmit={handleSubmit((v) => signIn.mutate({ email: v.email, password: v.password, remember: !!v.remember }))} className="space-y-5">
      {heading && <p className="-mt-2 text-center text-sm font-medium text-(--brand-ink)">{heading}</p>}
      {serverError && <Banner tone="error">{serverError}</Banner>}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-(--text-secondary)">Email</label>
        <input id="email" type="email" autoComplete="username" autoFocus placeholder="you@elevatepesa.com" className={inputCls(!!errors.email)} {...register("email")} />
        <FieldError msg={errors.email?.message} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-(--text-secondary)">Password</label>
          <Link href="/forgot-password" className="text-xs font-semibold text-(--brand-ink) hover:underline">Forgot password?</Link>
        </div>
        <div className="relative">
          <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="Your password" className={`${inputCls(!!errors.password)} pr-11`} {...register("password")} />
          <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-(--text-muted) hover:text-(--text-primary)">
            {showPw ? <MdVisibilityOff /> : <MdVisibility />}
          </button>
        </div>
        <FieldError msg={errors.password?.message} />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-(--text-secondary)">
        <input type="checkbox" className="h-4 w-4 accent-(--brand)" {...register("remember")} />
        Keep me signed in for 30 days
      </label>

      <button type="submit" disabled={signIn.isPending} className={primaryButtonCls}>
        {signIn.isPending && <span className="pi pi-spin pi-spinner text-sm" />}
        {signIn.isPending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
