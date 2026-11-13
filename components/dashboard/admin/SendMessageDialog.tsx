"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "@/components/common/Dialog";
import { Field, FormSection } from "@/components/dashboard/ui";
import { confirmAction, guardedClose } from "@/components/dashboard/ConfirmAction";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { INBOX_KEY } from "@/components/dashboard/layout/AppHeader/NotificationBell";
import { adminApi } from "@/services/admin";

/**
 * A message to customers: to everyone, or to the customers ticked in a list. Push goes to the
 * app on their phone (only customers signed in on a phone have one), email to their address.
 * Before sending it says how many each channel reaches and how many emails are left today
 * (MailDog's free plan: 150 a day; the API refuses a send that would go over).
 */
export default function SendMessageDialog({
  visible,
  onHide,
  recipients,
  onSent,
}: {
  visible: boolean;
  onHide: () => void;
  /** Picked customers, or null for every customer. */
  recipients: { id: number; name: string }[] | null;
  onSent?: () => void;
}) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setTitle(""); setBody(""); setPush(true); setEmail(false); setErrors({});
  }, [visible]);

  const audience = recipients ? { audience: "selected", user_ids: recipients.map((r) => r.id) } : { audience: "all_customers" };
  const preview = useQuery({
    queryKey: ["messages", "preview", recipients?.map((r) => r.id).join(",") ?? "all"],
    queryFn: () => adminApi.previewMessage(audience),
    enabled: visible,
  });
  const p = preview.data;

  const send = useMutation({
    mutationFn: () => adminApi.sendMessage({ title, body, send_push: push, send_email: email, ...audience }),
    meta: { skipGlobalError: true },
    onSuccess: (r) => {
      toast.success(r.message);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: INBOX_KEY }), 4000);
      onSent?.();
      onHide();
    },
    onError: (error) => {
      const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      setErrors(Object.fromEntries(Object.entries(data?.errors ?? {}).map(([k, m]) => [k, m[0]])));
      toast.error(data?.message ?? "The message was not sent.");
    },
  });

  const who = recipients ? (recipients.length === 1 ? recipients[0].name : `${recipients.length} picked customers`) : "every customer";
  const reach = [push && p ? `${p.with_device} by push` : null, email && p ? `${p.with_email} by email` : null].filter(Boolean).join(" and ");
  const overLimit = email && p ? p.with_email > p.emails_left_today : false;

  const submit = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Give it a title";
    if (!body.trim()) e.body = "Write the message";
    if (!push && !email) e.send_push = "Choose push, email or both";
    if (overLimit) e.send_email = `Only ${p?.emails_left_today} emails are left today`;
    setErrors(e);
    if (Object.keys(e).length) return;
    confirmAction({
      header: "Send this message?",
      message: `To ${who}: ${reach || "nobody can be reached on these channels"}. It cannot be taken back.`,
      acceptLabel: "Send",
      closeOnError: true,
      accept: () => send.mutateAsync(),
    });
  };

  const dirty = !!(title || body);

  return (
    <Dialog
      header={`Message ${who}`}
      visible={visible}
      onHide={() => guardedClose(dirty, send.isPending, onHide)}
      style={{ width: "min(36rem, 95vw)" }}
      modal
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-(--text-muted)">{preview.isPending ? "Counting who it reaches..." : reach ? `Reaches ${reach}.` : ""}</span>
          <span className="flex gap-2">
            <Button label="Cancel" text onClick={() => guardedClose(dirty, send.isPending, onHide)} disabled={send.isPending} />
            <Button label="Send" icon="pi pi-send" loading={send.isPending} onClick={submit} disabled={preview.isPending} />
          </span>
        </div>
      }
    >
      <div className="space-y-7">
        <FormSection n={1} title="How to send it" hint={p ? `${p.recipients.toLocaleString("en-UG")} customers: ${p.with_device} have the app on a phone, ${p.with_email} have an email address.` : undefined}>
          <div className="space-y-2" data-invalid={errors.send_push ? "true" : undefined}>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox inputId="push" checked={push} onChange={(e) => setPush(!!e.checked)} />
              <span><b>Push to the app</b><br /><span className="text-xs text-(--text-muted)">Shows on their phone right away. Free.</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox inputId="email" checked={email} onChange={(e) => setEmail(!!e.checked)} />
              <span>
                <b>Email</b><br />
                <span className={`text-xs ${overLimit ? "font-semibold text-red-600 dark:text-red-400" : "text-(--text-muted)"}`}>
                  {p ? `${p.emails_left_today} of ${p.daily_email_limit} emails left today.` : "Up to 150 a day on the mail plan."}
                  {overLimit ? " Too many for today: send as push, or pick fewer customers." : ""}
                </span>
              </span>
            </label>
            {(errors.send_push || errors.send_email) && <small className="block text-xs text-red-500">{errors.send_push || errors.send_email}</small>}
          </div>
        </FormSection>
        <FormSection n={2} title="The message">
          <Field label="Title" required error={errors.title} htmlFor="msg-title" hint="The bold line on their phone, and the email subject.">
            <InputText id="msg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="w-full" />
          </Field>
          <Field label="Message" required error={errors.body} htmlFor="msg-body" hint={`${body.length} of 1000 characters.`}>
            <InputTextarea id="msg-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1000} autoResize className="w-full" />
          </Field>
        </FormSection>
      </div>
    </Dialog>
  );
}
