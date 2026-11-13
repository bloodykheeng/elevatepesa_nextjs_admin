/**
 * The pages anyone may open, signed in or not. `/` sends a visitor to /login and a signed-in
 * person to /dashboard (proxy.ts).
 *
 * /reset-password must stay public and keep its address: the mobile app's "forgot password"
 * opens adb.elevatepesa.com/reset-password, and staff reset links land there too.
 */
export const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/not-found"];

/** The sign-in pages, which a signed-in person is sent away from. Reset is not one: a link works either way. */
export const SIGN_IN_ROUTES = ["/login", "/forgot-password"];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}
