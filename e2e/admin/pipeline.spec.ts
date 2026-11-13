import { test, expect, type Page } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";

/**
 * The client pipeline (W05 List): a branch manager finds a prospect a sales agent captured and opens
 * the record with its stage history. Uses the demo prospects (ClientsSeeder: Sarah Nakato's on
 * Kiwatule market route). The System Admin sees every client, as head office does, and runs the
 * whole process from the dashboard: adds a prospect with a pin on the map, corrects it, retires it
 * (Inactive, then delete).
 */

/** Picks an option in an InfiniteSelect: the trigger, then the option in the panel. */
async function pick(page: Page, scope: ReturnType<Page["getByRole"]>, placeholder: RegExp, option: string | RegExp) {
  await scope.getByRole("button", { name: placeholder }).click();
  await page.getByRole("button", { name: option }).first().click();
}
test("a branch manager finds a prospect and opens the record", async ({ browser }) => {
  const his = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await his.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);

  await page.goto("/dashboard/pipeline");
  await expect(page.getByRole("heading", { name: "Client pipeline" })).toBeVisible();

  // Rows first: typing before the page has hydrated is wiped by hydration.
  await expect(page.getByRole("row", { name: /CL\d+/ }).first()).toBeVisible();
  await page.getByLabel("Search clients").fill("Aisha Nalubega");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const row = page.getByRole("row", { name: /Aisha Nalubega/ });
  // Made a lead this morning (LeadsSeeder).
  await expect(row).toContainText("Lead");
  await expect(row).toContainText("Kiwatule market route");
  // Who captured her opens under the row, with the rest the columns leave out.
  await row.locator(".p-row-toggler").click();
  await expect(page.locator(".p-datatable-row-expansion")).toContainText("Sarah Nakato");

  await row.getByRole("button", { name: "View details" }).click();
  // Her record, a page of its own: where she was met and where she was made a lead, both on the map.
  await expect(page.getByRole("heading", { name: /Aisha Nalubega/ })).toBeVisible();
  await expect(page.getByText("Kiwatule market, stall row C", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Google Maps" }).first()).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  await expect(page.getByText("Asked for UGX 2,000,000")).toBeVisible();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Captured as Prospect")).toBeVisible();
  await expect(page.getByText("Prospect → Lead")).toBeVisible();
  await his.close();
});

test("the System Admin sees every branch's clients", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("navigation").getByRole("link", { name: "Client pipeline" }).click();
  await expect(page.getByRole("heading", { name: "Client pipeline" })).toBeVisible();
  await expect(page.getByText("Every branch", { exact: false })).toBeVisible();
  // Newest first: the latest of Sarah's prospects heads page one.
  await expect(page.getByRole("row", { name: /Joseph Kiggundu/ })).toBeVisible();
});

test("the System Admin adds a prospect with a pin, corrects it, then retires it", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Prospect ${stamp}`;
  const national = `772${String(stamp).slice(-6)}`;

  await page.goto("/dashboard/pipeline");
  await expect(page.getByRole("row", { name: /CL\d+/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "New prospect" }).click();
  const dialog = page.getByRole("dialog", { name: "New prospect" });
  // From the top down: nobody knows every route by heart.
  await expect(dialog.getByRole("button", { name: /Choose the territory/ })).toBeDisabled();
  await pick(page, dialog, /Choose the branch/, /^Kampala East/);
  await pick(page, dialog, /Choose the territory/, /^Ntinda · Kiwatule/);
  await pick(page, dialog, /Choose the route/, /^Kiwatule market route/);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill(name);
  // Typed after the +256 the field starts with (it ignores fill()).
  await dialog.locator('input[type="tel"]').click();
  await dialog.locator('input[type="tel"]').pressSequentially(national);
  await expect(dialog.getByText("New number: not yet a Letshego client.")).toBeVisible();
  // Optional; saved lowercase.
  await dialog.getByRole("textbox", { name: "Email" }).fill(`E2E.${stamp}@Example.com`);

  // No pin until one is placed: a click on the map drops it.
  await expect(dialog.getByText("No pin yet.", { exact: false })).toBeVisible();
  await dialog.locator(".leaflet-container").click({ position: { x: 200, y: 150 } });
  await expect(dialog.getByText("placed by hand", { exact: false })).toBeVisible();
  await dialog.getByRole("textbox", { name: "Location name" }).fill("Kiwatule, by the fuel station");
  // The pin's popup: who, where, and the way there.
  await dialog.locator(".leaflet-marker-icon").click();
  await expect(dialog.locator(".leaflet-popup")).toContainText(name);
  await expect(dialog.locator(".leaflet-popup")).toContainText(`E2E.${stamp}@Example.com`);
  await expect(dialog.locator(".leaflet-popup").getByRole("link", { name: "Open in Google Maps" })).toBeVisible();
  await dialog.getByRole("button", { name: "Save prospect" }).click();

  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText(`the prospect ${name} on Kiwatule market route`);
  await confirm.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Prospect saved.")).toBeVisible({ timeout: 60_000 });
  await expect(dialog).toBeHidden();

  // Corrected and made Inactive, the step before deleting.
  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Kiwatule market route");
  // The email opens under the row, with the rest the columns leave out.
  await row.locator(".p-row-toggler").click();
  await expect(page.locator(".p-datatable-row-expansion")).toContainText(`e2e.${stamp}@example.com`);
  await row.locator(".p-row-toggler").click();
  await expect(row).toContainText("Active");
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: `Edit ${name}` });
  await expect(edit.getByText("placed by hand", { exact: false })).toBeVisible();
  await edit.locator(".p-dropdown", { has: page.locator("#client-status") }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: "Inactive" }).click();
  await edit.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("dialog", { name: "Confirm submission" }).getByRole("button", { name: "Yes, save" }).click();
  await expect(edit).toBeHidden({ timeout: 60_000 });
  await expect(row).toContainText("Inactive");

  await row.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Delete (1)" }).click();
  await page.getByRole("dialog", { name: `Delete ${name}?` }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Client deleted.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});

/** Back from a client returns to the pipeline where it was left: its page and filters (lib/listReturn; 10 Nov 2026). */
test("back from a client's record returns to the page of the pipeline it was opened from", async ({ page }) => {
  await page.goto("/dashboard/pipeline?page=3&stage=Prospect");
  await expect(page.getByRole("row", { name: /CL\d+/ }).first()).toBeVisible({ timeout: 60_000 });
  await page.getByRole("row", { name: /CL\d+/ }).first().getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pipeline\/[0-9a-z]{26}/i);
  await page.getByRole("button", { name: "Client pipeline" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pipeline\?(?=.*page=3)(?=.*stage=Prospect)/);
});
