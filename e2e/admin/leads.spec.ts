import { test, expect } from "@playwright/test";
import { createThrowawayProspect } from "../helpers/laravel";

/**
 * Leads (docs/leads.md): the System Admin makes a prospect a lead from the client pipeline (the
 * same call as the field app: NIN, amount, the pin from the prospect), which is their loan request,
 * made once; sees it on the record's Loan request card and in Sales › Loan requests, then corrects it while they are a
 * Lead. The prospect is a throwaway (`E2E Lead …`), removed with its loan request by `e2e:cleanup`.
 */
test("the System Admin makes a prospect a lead, then corrects it", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Lead ${stamp}`;
  const digits = String(stamp).slice(-12);
  createThrowawayProspect(name, `25677${String(stamp).slice(-7)}`);

  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Prospect");
  await row.getByRole("button", { name: "Make a lead" }).click();

  const dialog = page.getByRole("dialog", { name: `Make ${name} a lead: their loan request` });
  // The prospect's pin is already there.
  await expect(dialog.locator(".leaflet-marker-icon")).toBeVisible();
  await dialog.getByRole("textbox", { name: /NIN/ }).fill("CM123");
  await dialog.getByRole("button", { name: "Save loan request" }).click();
  await expect(dialog.getByText("A NIN is 14 letters and digits, as on the National ID.")).toBeVisible();
  // Typed the way it is printed, spaces and lowercase: saved as 14 letters and digits.
  await dialog.getByRole("textbox", { name: /NIN/ }).fill(`cm ${digits.slice(0, 6)} ${digits.slice(6)}`);
  await dialog.locator("#lead-amount").fill("2500000");
  await dialog.locator("#lead-amount").press("Tab");
  await dialog.getByRole("button", { name: "Save loan request" }).click();

  const confirm = page.getByRole("dialog", { name: "Confirm submission" });
  await expect(confirm).toContainText(`the loan request for ${name}: UGX 2,500,000`);
  await confirm.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText(`${name} is a lead.`)).toBeVisible({ timeout: 60_000 });
  await expect(dialog).toBeHidden();

  // Now a Lead: a lead is made once.
  await expect(row).toContainText("Lead");
  await expect(row.getByRole("button", { name: "Make a lead" })).toHaveCount(0);

  // The record is a page of its own, with tabs kept in the URL.
  await row.getByRole("button", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pipeline\/[0-9a-z]{26}$/i);
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByText(`NIN CM${digits}`)).toBeVisible();
  // The loan request keeps its own point (here it started at the prospect's pin), on the Overview's Loan request card.
  await expect(page.getByText("Asked for UGX 2,500,000")).toBeVisible();
  await expect(page.getByText("Waiting for a plan")).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  await page.getByRole("button", { name: "View", exact: true }).click();
  const details = page.getByRole("dialog", { name: `Loan request · ${name}` });
  await expect(details).toContainText("UGX 2,500,000");
  await expect(details.getByRole("link", { name: "Open in Google Maps" })).toBeVisible();
  // Who made it and who last changed it, at the foot of every details dialog.
  await expect(details).toContainText(/Created by\s*System Admin/);
  await expect(details).toContainText(/Updated by\s*System Admin/);
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();

  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Prospect → Lead")).toBeVisible();
  // Each step's GPS opens in Google Maps.
  await expect(page.getByRole("link", { name: /^-?\d+\.\d{5}, -?\d+\.\d{5}$/ }).first()).toHaveAttribute("href", /google\.com\/maps/);

  // Corrected while it is a Lead, from the pencil by the Loan request card's View (not the header).
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Correct the loan request" }).click();
  const correct = page.getByRole("dialog", { name: `Correct ${name}'s loan request` });
  await correct.locator("#lead-amount").fill("3000000");
  await correct.locator("#lead-amount").press("Tab");
  await correct.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("dialog", { name: "Confirm submission" }).getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Loan request saved.")).toBeVisible({ timeout: 60_000 });
  await expect(correct).toBeHidden();

  // Sales › Loan requests: every loan request with its client.
  await page.goto(`/dashboard/loan-requests?search=${encodeURIComponent(name)}`);
  const leadRow = page.getByRole("row", { name: new RegExp(name) });
  await expect(leadRow).toContainText("UGX 3,000,000");
  await expect(leadRow).toContainText("Lead");
});
