import { test, expect, type Locator, type Page } from "@playwright/test";
import { openFromSidebar } from "../helpers/nav";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";

/**
 * Prospect targets (W10, W10b, W10c): a branch manager reads the list with its figures and opens
 * Sarah Nakato's demo target (ProspectTargetsSeeder: a week ago to three weeks ahead, her four
 * routes) with its routes, map and prospects. The System Admin gives her a later target, routes
 * picked from the top down, is refused a second one sharing its days, then deletes it.
 */

/** Picks an option in an InfiniteSelect: the trigger, then the option in the panel. */
async function pick(page: Page, scope: Locator, placeholder: RegExp, option: string | RegExp, search?: string) {
  await scope.getByRole("button", { name: placeholder }).click();
  // Searched, not scanned, when the list is long (demo data adds many people: 10 Nov 2026).
  if (search) await page.getByPlaceholder("Name", { exact: true }).fill(search);
  await page.getByRole("button", { name: option }).first().click();
}

/** "4 Dec 2026", as the form's calendars write a day. */
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

async function typeDay(dialog: Locator, id: string, value: string) {
  const input = dialog.locator(`#${id}`);
  await input.fill(value);
  // A click outside closes the calendar's panel, as a person would.
  await dialog.locator(".p-dialog-header").click({ position: { x: 20, y: 20 } });
}

test("a branch manager reads the figures and opens a target with its routes and map", async ({ browser }) => {
  const his = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await his.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);

  await openFromSidebar(page, "Planning", "Prospect targets");
  await expect(page.getByRole("heading", { name: "Prospect targets" })).toBeVisible();
  await expect(page.getByText("With a target running")).toBeVisible();
  const row = page.getByRole("row", { name: /Sarah Nakato/ }).first();
  await expect(row).toContainText("Running");
  await expect(row).toContainText(/of 150/);

  await row.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/dashboard\/prospect-targets\/[0-9a-z]{26}$/i);
  await expect(page.getByRole("heading", { name: /Sarah Nakato's prospect target/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Kiwatule market route/ }).first()).toBeVisible();
  // Her demo prospects inside the period, on the map and in the list.
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("row", { name: /Joseph Kiggundu/ })).toBeVisible();
  // A pin's popup says how to reach them.
  await page.locator(".leaflet-marker-icon").first().dispatchEvent("click");
  await expect(page.locator(".leaflet-popup")).toContainText("Phone");

  // The list narrowed to one of the target's routes, kept in the URL.
  await page.getByRole("button", { name: "Filters" }).click();
  const filters = page.getByRole("dialog", { name: "Filters" });
  await filters.locator(".p-dropdown").click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: "Ntinda stage route" }).click();
  await filters.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/route=/);
  await expect(page.getByRole("button", { name: "Remove Route: Ntinda stage route" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Grace Namutebi/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Joseph Kiggundu/ })).toHaveCount(0);
  await his.close();
});

test("the System Admin gives a target, routes from the top down, no two sharing a day, then deletes it", async ({ page }) => {
  const stamp = Date.now();
  const description = `E2E target ${stamp}`;

  await page.goto("/dashboard/prospect-targets");
  await expect(page.getByRole("row", { name: /Sarah Nakato/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "New target" }).click();
  const dialog = page.getByRole("dialog", { name: "New prospect target" });

  // Routes wait for the person: they are theirs.
  await expect(dialog.getByRole("button", { name: "Add a route" })).toBeDisabled();
  await pick(page, dialog, /Choose the person/, /^Sarah Nakato/, "Sarah Nakato");
  await typeDay(dialog, "target-starts", day(40));
  await typeDay(dialog, "target-ends", day(46));
  await dialog.getByRole("textbox", { name: "Description" }).fill(description);

  // Her one branch and one territory fill themselves; the route is chosen.
  const first = dialog.getByTestId("target-line-0");
  await expect(first.getByRole("button", { name: /Kampala East/ })).toBeVisible();
  await expect(first.getByRole("button", { name: /Ntinda · Kiwatule/ })).toBeVisible();
  await pick(page, first, /Choose the route/, /^Kiwatule market route/);
  // A number box commits its value when it is left.
  await first.locator("#target-line-0-expected").fill("25");
  await first.locator("#target-line-0-expected").press("Tab");
  await dialog.getByRole("button", { name: "Add a route" }).click();
  const second = dialog.getByTestId("target-line-1");
  await pick(page, second, /Choose the route/, /^Ntinda stage route/);
  await second.locator("#target-line-1-expected").fill("15");
  await second.locator("#target-line-1-expected").press("Tab");
  await expect(dialog.getByText("40 prospects")).toBeVisible();

  await dialog.getByRole("button", { name: "Save target" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText("a target of 40 prospects for Sarah Nakato");
  await confirm.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Saved. Sarah Nakato sees it now.")).toBeVisible({ timeout: 60_000 });

  // A second one sharing those days is refused, on the field, with the reason.
  await page.getByRole("button", { name: "New target" }).click();
  await pick(page, dialog, /Choose the person/, /^Sarah Nakato/, "Sarah Nakato");
  await typeDay(dialog, "target-starts", day(44));
  await typeDay(dialog, "target-ends", day(50));
  await pick(page, dialog.getByTestId("target-line-0"), /Choose the route/, /^Kiwatule market route/);
  await dialog.locator("#target-line-0-expected").fill("10");
  await dialog.locator("#target-line-0-expected").press("Tab");
  await dialog.getByRole("button", { name: "Save target" }).click();
  await page.getByRole("dialog", { name: "Confirm submission" }).getByRole("button", { name: "Yes, save" }).click();
  await expect(dialog.getByText(/Sarah Nakato already has a target for .*Change that one, or choose days outside it\./)).toBeVisible({ timeout: 60_000 });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  const discard = page.getByRole("dialog", { name: /Discard|unsaved/i });
  if (await discard.isVisible().catch(() => false)) await discard.getByRole("button").last().click();

  // Deleted the one way: tick it, then Delete in the toolbar.
  await page.goto(`/dashboard/prospect-targets?search=${encodeURIComponent(description)}`);
  const row = page.getByRole("row", { name: /Sarah Nakato/ });
  await expect(row).toContainText("Upcoming");
  // Edited from the list: the form fetches its routes first.
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Sarah Nakato's target" });
  await expect(edit.getByTestId("target-line-1").getByRole("button", { name: /Ntinda stage route/ })).toBeVisible();
  await edit.getByRole("button", { name: "Cancel" }).click();
  await expect(edit).toBeHidden();
  await row.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Delete (1)" }).click();
  await page.getByRole("dialog", { name: "Delete Sarah Nakato's target?" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Prospect target deleted.")).toBeVisible({ timeout: 60_000 });
});

test("paging a target's prospects keeps the place, and a reload comes back to it", async ({ page }) => {
  await page.goto("/dashboard/prospect-targets");
  await page.getByRole("row", { name: /Sarah Nakato/ }).first().getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("row", { name: /Joseph Kiggundu/ })).toBeVisible();
  // One <main> per page: the dashboard's scroll box.
  const main = page.getByRole("main");
  await main.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  const bottom = await main.evaluate((el) => el.scrollTop);
  expect(bottom).toBeGreaterThan(300);

  await page.getByRole("button", { name: "Page 2" }).last().click();
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(bottom / 2);

  await page.reload();
  await expect.poll(() => main.evaluate((el) => el.scrollTop), { timeout: 15_000 }).toBeGreaterThan(bottom / 2);
});
