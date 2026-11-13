import { test, expect, type Page } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";

/**
 * Locations (prototype W11): Branch › Territory › Route as three tabs, a route added from the
 * top down and confirmed, then retired the Alpha way (Inactive, then delete). And branch
 * scoping: a branch manager sees their own branch only. Seeded LocationsSeeder data.
 */

/** Picks an option in an InfiniteSelect: the trigger, then the option in the panel. */
async function pick(page: Page, scope: ReturnType<Page["getByRole"]>, placeholder: RegExp, option: string | RegExp) {
  await scope.getByRole("button", { name: placeholder }).click();
  await page.getByRole("button", { name: option }).first().click();
}

test("an admin adds a route from the top down, then retires it", async ({ page }) => {
  const name = `E2E route ${Date.now()}`;

  await page.goto("/dashboard/locations?level=routes");
  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Branches/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Routes/ })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("button", { name: "New" }).click();
  const dialog = page.getByRole("dialog", { name: "New route" });
  // The territory waits for its branch.
  await expect(dialog.getByRole("button", { name: /Choose the territory/ })).toBeDisabled();
  await pick(page, dialog, /Choose the branch/, /^Kampala Central/);
  await pick(page, dialog, /Choose the territory/, /Nakasero · Kololo/);
  await dialog.getByRole("textbox", { name: "Route name" }).fill(name);
  await dialog.getByRole("button", { name: "Save route" }).click();

  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText(`the route ${name} in Nakasero · Kololo`);
  await confirm.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Route added.")).toBeVisible({ timeout: 60_000 });
  await expect(dialog).toBeHidden();

  // Only an Inactive route can be deleted: make it Inactive, then delete it.
  await page.goto(`/dashboard/locations?level=routes&search=${encodeURIComponent(name)}`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Kampala Central");
  // An Active one cannot be ticked for Delete (the API refuses it too: LocationsTest).
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit route" });
  await edit.locator(".p-dropdown", { has: page.locator("#route-status") }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: "Inactive" }).click();
  await edit.getByRole("button", { name: "Save route" }).click();
  await page.getByRole("dialog", { name: "Confirm submission" }).getByRole("button", { name: "Yes, save" }).click();
  await expect(edit).toBeHidden({ timeout: 60_000 });

  await row.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Delete (1)" }).click();
  await page.getByRole("dialog", { name: "Delete 1 route?" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Route deleted.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});

test("a branch manager sees their own branch only", async ({ browser }) => {
  const theirs = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await theirs.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);

  await page.goto("/dashboard/locations?level=branches");
  await expect(page.getByText("You see Kampala East only.")).toBeVisible();
  await expect(page.getByRole("tab", { name: /1\s*Branch\b/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Kampala East/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Mbarara/ })).toHaveCount(0);
  // Branches are head office's: no New, no Edit.
  await expect(page.getByRole("button", { name: "New" })).toHaveCount(0);

  // Their territories and routes are theirs to keep.
  await page.getByRole("tab", { name: /Territories/ }).click();
  await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Mbarara Town/ })).toHaveCount(0);
  await theirs.close();
});
