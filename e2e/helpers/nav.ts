import type { Page } from "@playwright/test";

/**
 * Opens a page from the sidebar, unfolding its parent first when the link is folded away (lib/menuItems.ts:
 * related pages fold under one parent, as in SDS). A parent opens itself on its own pages, so it is pressed
 * only when the link is not showing: pressing an open one would fold it.
 */
export async function openFromSidebar(page: Page, parent: string | null, link: string): Promise<void> {
  const nav = page.getByRole("navigation").first();
  const target = nav.getByRole("link", { name: link, exact: true });
  if (parent && !(await target.isVisible())) await nav.getByRole("button", { name: parent, exact: true }).click();
  await target.click();
}
