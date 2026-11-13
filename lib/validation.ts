import { z } from "zod";
import type { AxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isValidPhone, PHONE_HINT } from "@/lib/phone";

/**
 * The rules every dashboard form validates with (react-hook-form + zod, as in Alpha). A form
 * builds its schema from these, so "required", a phone and an amount read and behave the
 * same everywhere. The API checks everything again; these only stop a
 * form that cannot succeed from being sent, or confirmed.
 *
 * See docs/dashboard-patterns.md, "Forms".
 */

/**
 * Pass to every `.superRefine(fn, ALWAYS)`. By default zod skips an object's refinements while
 * any field has already failed, so a first Save showed the empty-amount error but not "Choose
 * the account." (the account check lives in the refinement). With this the form lists every
 * problem at once. The refinement then sees the raw values, so it must not assume they passed.
 */
export const ALWAYS = { when: () => true } as const;

/** Text that must be filled in. */
export const requiredText = (message: string, min = 1) => z.string().trim().min(min, message);

/** Text that may be left empty. */
export const optionalText = (max = 2000) => z.string().trim().max(max, `Keep it under ${max} characters.`);

/** A whole UGX amount of at least `min`. Empty inputs arrive as null. */
export const amount = (message: string, min = 1) =>
  z.number({ error: message }).int().min(min, min > 1 ? `At least UGX ${min.toLocaleString("en-US")}.` : message);

/** An email address, or empty when `required` is false. */
export const email = (required = true) =>
  required
    ? z.string().trim().min(1, "Enter the email address.").email("Enter a valid email address.")
    : z.string().trim().email("Enter a valid email address.").or(z.literal(""));

/** Any country's number: digits with the country code, no "+" (what PhoneField gives). */
export const phone = (required = true) =>
  required
    ? z.string().trim().min(1, "Enter the phone number.").refine(isValidPhone, PHONE_HINT)
    : z.string().trim().refine((v) => !v || isValidPhone(v), PHONE_HINT);

/** A moment that has already happened (a payment, a posting). */
export const pastMoment = (message: string) =>
  z.date({ error: message }).refine((d) => d.getTime() <= Date.now() + 60_000, "The date cannot be in the future.");

type ApiErrorBody = { message?: string; errors?: Record<string, string[]> };

/** The toast a refused form says "Not saved" with; registered by the app's providers (TanstackContext). */
let notSavedToast: ((summary: string, detail?: string) => void) | null = null;
export function registerNotSavedToast(toast: ((summary: string, detail?: string) => void) | null): void {
  notSavedToast = toast;
}

/**
 * Brings the first field marked wrong into view, in the open dialog when there is one: a long form's
 * error at its top was out of sight while the reader looked at the buttons, and Save seemed to do
 * nothing (the user, 28 Oct 2026). Pass as `handleSubmit`'s second argument for the schema's own errors.
 */
export function revealFirstInvalid(): void {
  if (typeof document === "undefined") return;
  // After React has drawn the red borders.
  window.setTimeout(() => {
    const dialogs = document.querySelectorAll<HTMLElement>(".p-dialog");
    const scope: ParentNode = dialogs.length ? dialogs[dialogs.length - 1] : document;
    const first = scope.querySelector<HTMLElement>('[data-invalid="true"], .p-invalid, [aria-invalid="true"]');
    if (!first) return;
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    first.querySelector<HTMLElement>("input, textarea, select, [tabindex]")?.focus({ preventScroll: true });
  }, 60);
}

/**
 * Laravel's 422 onto the form: each `errors.field` message lands under its own field (red
 * border and all), so server-only rules (an email already taken, a balance gone down) read
 * the same as the schema's. Returns, for the form's own line, the reasons that matched no field
 * (or the general message when nothing matched), and null when every one found its field.
 *
 *   onError: (error) => setFormError(applyServerErrors(error, setError, ["name", "email"]))
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** The form's fields named as the API names them, or a map from the API's name to the form's. */
  fields: readonly Path<T>[] | Partial<Record<string, Path<T>>>,
): string | null {
  const body = (error as AxiosError<ApiErrorBody>)?.response?.data;
  if (!body) return "Could not reach the server. Check your connection and try again.";
  const target = (key: string): Path<T> | undefined =>
    Array.isArray(fields) ? ((fields as readonly string[]).includes(key) ? (key as Path<T>) : undefined) : (fields as Partial<Record<string, Path<T>>>)[key];
  let placed = false;
  // A reason with no field of its own on this form ("check in first", "their client KYC is too old")
  // is still said, beside the ones placed on fields: a refusal is never dropped.
  const unplaced: string[] = [];
  Object.entries(body.errors ?? {}).forEach(([key, messages]) => {
    const field = target(key);
    if (field) {
      setError(field, { type: "server", message: messages[0] });
      placed = true;
    } else if (messages[0]) {
      unplaced.push(messages[0]);
    }
  });
  // Said in a toast as well as under the fields, and the first marked field scrolled into view.
  notSavedToast?.("Not saved", placed ? (unplaced[0] ?? body.message ?? "Check the fields marked in red.") : (unplaced[0] ?? body.message));
  if (placed) revealFirstInvalid();
  if (unplaced.length) return unplaced.join(" ");
  if (placed) return null;
  return body.message ?? "Something went wrong. Try again.";
}
