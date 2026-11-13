import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicRoute, SIGN_IN_ROUTES } from "@/lib/publicRoutes";
import { AUTH_TOKEN_COOKIE, AUTH_PROFILE_COOKIE } from "@/lib/authCookies";

/**
 * Routing only (Alpha's model, docs/dashboard-patterns.md "Page access"):
 *
 *   1. a public page (lib/publicRoutes.ts) passes for everyone;
 *   2. not signed in: anything else goes to /login;
 *   3. signed in on a sign-in page, or on `/`: to /dashboard;
 *   4. signed in: every dashboard page passes. Which page shows is PageAccessGuard's
 *      question (the menu entry's permission), and what data comes back is the API's.
 *
 * The cookies only route. The API trusts the Sanctum token, never the profile cookie.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const signedIn = !!req.cookies.get(AUTH_TOKEN_COOKIE)?.value && !!req.cookies.get(AUTH_PROFILE_COOKIE)?.value;

  if (!signedIn) {
    if (isPublicRoute(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/" || SIGN_IN_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
