import { test, expect } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";

/**
 * The Base A stop point: an admin creates a user, placed in a branch and territory (several
 * agents may share one) and confirmed before saving, who then signs in. The new Sales Agent's
 * menu has no Users, and typing the address shows "You don't have access" (Alpha's page
 * access, from the menu's permission). The account is a throwaway (e2e:cleanup).
 */
test("an admin creates a sales agent who then signs in", async ({ page, browser }) => {
  const stamp = Date.now();
  const email = `e2e-agent-${stamp}@example.com`;
  const password = "Field-2026-ok";

  await page.goto("/dashboard/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.getByRole("button", { name: "New" }).click();

  const dialog = page.getByRole("dialog", { name: "New account" });
  await dialog.getByRole("textbox", { name: "Full name" }).fill("E2E Agent");
  await dialog.getByRole("textbox", { name: "Staff ID" }).fill(`LU-E2E-${String(stamp).slice(-5)}`);
  await dialog.getByRole("textbox", { name: "Email" }).fill(email);
  // PrimeReact's Dropdown: the trigger is a button; the options are in a panel at the end of
  // <body> (a hidden native <select> carries the same option names, so go by the panel).
  await dialog.getByRole("button", { name: "Choose a role" }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: "Sales Agent" }).click();
  // Where they work: a branch and a territory. Seeded LocationsSeeder names.
  await dialog.getByRole("button", { name: /Choose the branch/ }).click();
  await page.getByRole("button", { name: /^Kampala East/ }).click();
  await dialog.locator("label", { hasText: "Kireka · Bweyogerere" }).click();
  await dialog.locator("#user-password").fill(password);
  await dialog.getByRole("button", { name: "Save" }).click();

  // Confirm before submit (confirmSubmit): nothing is sent until Yes.
  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText("the account for E2E Agent");
  await confirm.getByRole("button", { name: "Yes, save" }).click();

  // `php artisan serve` answers one request at a time on Windows, so the save can wait
  // behind the list's own requests (docs/e2e-testing.md, "Two screens at once").
  await expect(page.getByText("Account created. Sign-in details were emailed.")).toBeVisible({ timeout: 60_000 });
  await expect(dialog).toBeHidden();
  await page.goto(`/dashboard/users?search=${encodeURIComponent(email)}`);
  await expect(page.getByRole("row", { name: /E2E Agent/ })).toContainText("Kireka · Bweyogerere");

  // The new person, in a browser of their own.
  const theirs = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const agent = await theirs.newPage();
  await signInThroughPage(agent, email, password);
  // A sales agent lands on their own figures (docs/dashboards.md).
  await expect(agent.getByRole("heading", { name: "My figures" })).toBeVisible({ timeout: 60_000 });
  await expect(agent.getByRole("navigation").getByRole("link", { name: "Users" })).toHaveCount(0);

  await agent.goto("/dashboard/users");
  await expect(agent.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
  await theirs.close();
});

test("the form refuses an account without an email", async ({ page }) => {
  await page.goto("/dashboard/users");
  await page.getByRole("button", { name: "New" }).click();

  const dialog = page.getByRole("dialog", { name: "New account" });
  await dialog.getByRole("textbox", { name: "Full name" }).fill("No Email");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog.getByText("Enter the email address.")).toBeVisible();
  await expect(dialog).toBeVisible();
});
