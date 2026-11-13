import { test, expect, type Page } from "@playwright/test";
import { openFromSidebar } from "../helpers/nav";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";

/**
 * Lead journey plans (docs/lead-journey-plans.md): the branch manager reads the figures and opens
 * the demo plan (LeadJourneyPlansSeeder: Joel Mugisha's "Kiwatule leads", Florence Nambi then Peter
 * Ssali) with its leads in visit order, numbered pins and the dashed line joining them. The System
 * Admin gives Joel a plan of the lead left waiting (Aisha Nalubega), picked in the Add leads dialog,
 * changes it from the list (removes her and picks her again), then deletes it.
 */

/** Opens Add leads, ticks the waiting lead and adds it: the picker closes and the lead is in the plan. */
async function addLead(page: Page, form: ReturnType<Page["getByRole"]>, lead: string) {
  await form.getByRole("button", { name: "Add leads" }).click();
  const picker = page.getByRole("dialog", { name: "Add leads for Joel Mugisha" });
  // Searched, not scanned: with demo data many leads wait ahead of the seeded one (10 Nov 2026).
  await picker.getByPlaceholder("Name, number or phone").fill(lead);
  await picker.getByRole("button", { name: "Search waiting leads" }).click();
  const waiting = picker.getByRole("row", { name: new RegExp(lead) }).first();
  await expect(waiting).toBeVisible();
  // Florence and Peter are on Kiwatule leads already: they are not offered.
  await expect(picker.getByRole("row", { name: /Florence Nambi/ })).toHaveCount(0);
  await waiting.getByRole("checkbox").first().click();
  await picker.getByRole("button", { name: "Add 1 lead" }).click();
  await expect(picker).toBeHidden();
  await expect(form.getByRole("row", { name: new RegExp(lead) })).toBeVisible();
}

/** Picks an option in an InfiniteSelect: the trigger, then the option in the panel. */
async function pick(page: Page, scope: ReturnType<Page["getByRole"]>, placeholder: RegExp, option: string | RegExp) {
  await scope.getByRole("button", { name: placeholder }).click();
  await page.getByRole("button", { name: option }).first().click();
}

/** A day `n` from today as the calendar shows it ("5 Dec 2026"), typed in, then the panel closed. */
async function typeDay(dialog: ReturnType<Page["getByRole"]>, id: string, n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const text = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  await dialog.locator(`#${id}`).fill(text);
  // An outside click closes the panel; sent to the header itself, since the panel may open over it.
  const header = dialog.locator(".p-dialog-header");
  await header.dispatchEvent("mousedown");
  await header.dispatchEvent("click");
  await expect(dialog.page().locator(".p-datepicker")).toBeHidden();
}

test("a branch manager reads the figures and opens a plan with its leads in visit order", async ({ browser }) => {
  const his = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await his.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);

  await openFromSidebar(page, "Planning", "Journey plans");
  await expect(page.getByRole("heading", { name: "Journey plans" })).toBeVisible();
  await expect(page.getByText("Leads waiting for a plan")).toBeVisible();
  const row = page.getByRole("row", { name: /Kiwatule leads/ }).first();
  await expect(row).toContainText("Running");
  await expect(row).toContainText("Joel Mugisha");

  await row.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/dashboard\/journey-plans\/[0-9a-z]{26}$/i);
  await expect(page.getByRole("heading", { name: /Kiwatule leads/ })).toBeVisible();
  const visits = page.getByRole("row", { name: /CL\d+/ });
  await expect(visits.nth(0)).toContainText("Florence Nambi");
  await expect(visits.nth(1)).toContainText("Peter Ssali");
  // Numbered pins at each lead's own point.
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator(".leaflet-marker-icon").first()).toContainText(/[12]/);
  // Joined in visit order by the planned (dashed) line, and a solid one where the officer checked in, if he has.
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible();

  // A lead opens its client's record.
  await visits.nth(0).getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("heading", { name: /Florence Nambi/ })).toBeVisible();
  // Their Loan request card names the plan.
  await expect(page.getByRole("link", { name: "Kiwatule leads" })).toBeVisible();
  await his.close();
});

test("the System Admin gives an officer a plan from the waiting leads, changes it, then deletes it", async ({ page }) => {
  const name = `E2E plan ${Date.now()}`;

  await page.goto("/dashboard/journey-plans");
  await expect(page.getByRole("row", { name: /Kiwatule leads/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "New plan" }).click();
  const dialog = page.getByRole("dialog", { name: "New lead journey plan" });

  await pick(page, dialog, /Choose the officer/, /^Joel Mugisha/);
  await dialog.getByRole("textbox", { name: "Plan name" }).fill(name);
  await typeDay(dialog, "plan-starts", 30);
  await typeDay(dialog, "plan-ends", 32);

  // Nothing ticked yet: saving says what is missing.
  await dialog.getByRole("button", { name: "Save plan" }).click();
  await expect(dialog.getByText("Add at least one lead to visit.")).toBeVisible();

  // Aisha is the one waiting.
  await addLead(page, dialog, "Aisha Nalubega");

  await dialog.getByRole("button", { name: "Save plan" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText(`${name}: 1 lead for Joel Mugisha to visit`);
  await confirm.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Saved. Joel Mugisha sees it now.")).toBeVisible({ timeout: 60_000 });

  // Changed from the list: the form fetches its leads first.
  await page.goto(`/dashboard/journey-plans?search=${encodeURIComponent(name)}`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Upcoming");
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: `Edit ${name}` });
  const aisha = edit.getByRole("row", { name: /Aisha Nalubega/ });
  await expect(aisha).toBeVisible();
  // The list's buttons sit inside the form and never submit it: Add leads on a valid form only opens the picker.
  await edit.getByRole("button", { name: "Add leads" }).click();
  const picker = page.getByRole("dialog", { name: "Add leads for Joel Mugisha" });
  // Aisha is on this plan, so the picker leaves her out (other leads made by hand may still wait).
  await expect(picker.locator(".p-datatable")).toBeVisible();
  await expect(picker.getByRole("row", { name: /Aisha Nalubega/ })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Confirm submission" })).toHaveCount(0);
  await picker.getByRole("button", { name: "Cancel" }).click();
  // Removed the one way (tick, then Remove), then picked again: the plan's own lead is free for it.
  await aisha.getByRole("checkbox").first().click();
  await edit.getByRole("button", { name: "Remove (1)" }).click();
  await expect(edit.getByText("No leads yet. Press Add leads.")).toBeVisible();
  await addLead(page, edit, "Aisha Nalubega");
  await edit.getByRole("textbox", { name: "Description" }).fill("Aisha first: she asked this morning.");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("dialog", { name: "Confirm submission" }).getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Saved. Joel Mugisha sees the change.")).toBeVisible({ timeout: 60_000 });

  // Deleted the one way: tick it, then Delete in the toolbar. Aisha waits again.
  await row.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Delete (1)" }).click();
  await page.getByRole("dialog", { name: `Delete ${name}?` }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Journey plan deleted.")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
});
