import { test, expect } from "@playwright/test";
import { signInThroughPage, typeCode } from "../helpers/signIn";

/**
 * Signing in (letshego-laravel docs/sign-in.md): the password, then the emailed code.
 * Uses the seeded System Admin (UsersTableSeeder).
 */
import { ADMIN_EMAIL as EMAIL, PASSWORD } from "../helpers/accounts";

test("a wrong password says so and asks for no code", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

  await page.getByRole("textbox", { name: "Username, email or phone" }).fill(EMAIL);
  await page.locator("#password:visible").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Filtered: Next's route announcer is an (empty) alert too.
  await expect(page.getByRole("alert").filter({ hasText: "The provided credentials are incorrect." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toHaveCount(0);
});

test("empty fields are refused before anything is sent", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Enter your username, email or phone")).toBeVisible();
  await expect(page.getByText("Enter your password")).toBeVisible();
});

test("a wrong code is refused and the right one lands on the Overview", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Username, email or phone" }).fill(EMAIL);
  await page.locator("#password:visible").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();

  // 000000 is never a code the API issues (100000 to 999999).
  await typeCode(page, "000000");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The code is wrong or has expired." })).toBeVisible();

  await signInThroughPage(page, EMAIL, PASSWORD, "admin");
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Users" })).toBeVisible();
});

test("a visitor who is not signed in is sent to sign in", async ({ page }) => {
  await page.goto("/dashboard/users");
  await expect(page).toHaveURL(/\/login$/);
});
