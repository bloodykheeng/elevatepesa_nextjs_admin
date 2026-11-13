import { expect, type Page } from "@playwright/test";
import { signInCodeFor } from "./laravel";

/** Types a 6-digit code into the six boxes (components/auth/CodeInput.tsx). */
export async function typeCode(page: Page, code: string): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await page.getByLabel(`Digit ${i + 1}`).fill(code[i]);
  }
}

/**
 * Signs in through the page, both steps: the identifier and password, then the code the
 * API emailed (read from its cache). `email` is the account's email, used to find the code;
 * `typed` is what goes in the box (a username or phone also signs in).
 */
export async function signInThroughPage(page: Page, email: string, password: string, typed = email): Promise<void> {
  await page.goto("/login");
  // Role locators or `:visible`, never a bare getByLabel: with Cache Components Next keeps a
  // page you left mounted but hidden (<Activity>), and only those skip hidden elements.
  // (A password input has no ARIA role, so it goes by id.)
  await page.getByRole("textbox", { name: "Username, email or phone" }).fill(typed);
  await page.locator("#password:visible").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  await typeCode(page, signInCodeFor(email));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}
