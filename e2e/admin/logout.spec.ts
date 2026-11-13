import { test, expect } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { ADMIN_EMAIL, PASSWORD } from "../helpers/accounts";

/** Signing out ends this session and sends the person to sign in. */
test("signs out from the account menu", async ({ page, context }) => {
  // A context of its own: signing out revokes the token, and the saved admin session is
  // shared by the other admin specs. Sign in fresh for this one.
  await context.clearCookies();
  await signInThroughPage(page, ADMIN_EMAIL, PASSWORD);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("button", { name: "Sign Out" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
