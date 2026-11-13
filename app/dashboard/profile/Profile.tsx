"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Card, Field, PageHeader } from "@/components/dashboard/ui";
import PhotoUploaderPicker, { type UploadedPhoto } from "@/components/dashboard/forms/PhotoUploaderPicker";
import { confirmSubmit } from "@/components/dashboard/ConfirmAction";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { adminApi, photoUrl, toFormData } from "@/services/admin";
import { dateTime } from "@/lib/format";

type Errors = Record<string, string>;
const errorsOf = (error: unknown): Errors =>
  Object.fromEntries(Object.entries((error as { response?: { data?: { errors?: Record<string, string[]> } } }).response?.data?.errors ?? {}).map(([k, m]) => [k, m[0]]));

/** The signed-in staff member's own details and password. Role and email are changed by an admin. */
export default function Profile() {
  const { user, role } = useAuth();
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [profileErrors, setProfileErrors] = useState<Errors>({});
  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setPhoto(user?.photo_url ? { status: "existing", previewUrl: photoUrl(user.photo_url) ?? "" } : null);
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => adminApi.updateProfile(toFormData({ name, phone }, photo?.status === "new" ? photo.file : null, !!user?.photo_url && !photo)),
    meta: { skipGlobalError: true },
    onMutate: () => setProfileErrors({}),
    onSuccess: (r) => { toast.success(r.message); queryClient.invalidateQueries({ queryKey: ["auth-profile"] }); },
    onError: (e) => { setProfileErrors(errorsOf(e)); toast.error("Your profile was not saved."); },
  });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [pwErrors, setPwErrors] = useState<Errors>({});
  const savePassword = useMutation({
    mutationFn: () => adminApi.changePassword({ current_password: current, password: next, password_confirmation: repeat }),
    meta: { skipGlobalError: true },
    onMutate: () => setPwErrors({}),
    onSuccess: (r) => { toast.success(r.message); setCurrent(""); setNext(""); setRepeat(""); },
    onError: (e) => { setPwErrors(errorsOf(e)); toast.error("Your password was not changed."); },
  });

  const checkPassword = () => {
    const e: Errors = {};
    if (!current) e.current_password = "Enter your current password";
    if (next.length < 8) e.password = "At least 8 characters";
    if (next !== repeat) e.password_confirmation = "The two passwords differ";
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Your profile" subtitle={`${user?.email ?? ""} · ${role ?? ""}${user?.lastlogin ? ` · last signed in ${dateTime(user.lastlogin)}` : ""}`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Your details">
          <div className="space-y-4">
            <PhotoUploaderPicker key={user?.photo_url ?? "none"} setValue={(_f, p) => setPhoto(p)} photo={photo} existingPhoto={user?.photo_url ? photoUrl(user.photo_url) : null} />
            <Field label="Full name" required htmlFor="p-name" error={profileErrors.name}>
              <InputText id="p-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
            </Field>
            <Field label="Phone" htmlFor="p-phone" error={profileErrors.phone}>
              <InputText id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
            </Field>
            <p className="m-0 text-xs text-(--text-muted)">Your email and role are changed by an admin.</p>
            <div className="flex justify-end">
              <Button label="Save details" icon="pi pi-check" loading={saveProfile.isPending} disabled={!name.trim()} onClick={() => confirmSubmit("your details", () => saveProfile.mutateAsync())} />
            </div>
          </div>
        </Card>
        <Card title="Change your password">
          <div className="space-y-4">
            <Field label="Current password" required htmlFor="pw-current" error={pwErrors.current_password}>
              <Password inputId="pw-current" value={current} onChange={(e) => setCurrent(e.target.value)} feedback={false} toggleMask className="w-full" inputClassName="w-full" autoComplete="current-password" />
            </Field>
            <Field label="New password" required htmlFor="pw-next" hint="At least 8 characters." error={pwErrors.password}>
              <Password inputId="pw-next" value={next} onChange={(e) => setNext(e.target.value)} toggleMask className="w-full" inputClassName="w-full" autoComplete="new-password" />
            </Field>
            <Field label="Repeat the new password" required htmlFor="pw-repeat" error={pwErrors.password_confirmation}>
              <Password inputId="pw-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)} feedback={false} toggleMask className="w-full" inputClassName="w-full" autoComplete="new-password" />
            </Field>
            <p className="m-0 text-xs text-(--text-muted)">Other computers and phones signed in as you are signed out.</p>
            <div className="flex justify-end">
              <Button label="Change password" icon="pi pi-lock" loading={savePassword.isPending} onClick={() => checkPassword() && confirmSubmit("your new password", () => savePassword.mutateAsync())} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
