// Opt-in "remember me for 7 days": stores ONLY a non-secret identity hint (the identifier
// signed in with + display name) in localStorage, so a returning user sees a "welcome back"
// greeting and a pre-filled field.
//
// It never stores a token or a password and is never sent to the server: the user still
// authenticates in full every time. Per-device, expires after 7 days, cleared via "Not you?".
//
// `email` holds whatever was signed in with, an address, or a phone as digits. The field
// keeps that name to match the API, which does the same.

const KEY = "pesa_admin_remembered_account";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, which keeps the label honest.

export interface RememberedAccount {
  email: string;
  name: string;
}

interface StoredAccount extends RememberedAccount {
  savedAt: number;
}

export function getRememberedAccount(): RememberedAccount | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredAccount>;
    if (!parsed.email) return null;

    // Expire after 7 days so "Remember me for 7 days" stays true.
    if (
      typeof parsed.savedAt === "number" &&
      Date.now() - parsed.savedAt > TTL_MS
    ) {
      localStorage.removeItem(KEY);
      return null;
    }

    return { email: parsed.email, name: parsed.name ?? "" };
  } catch {
    return null;
  }
}

export function setRememberedAccount(account: RememberedAccount): void {
  try {
    const stored: StoredAccount = { ...account, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* localStorage unavailable (private mode / quota): silently skip */
  }
}

export function clearRememberedAccount(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
