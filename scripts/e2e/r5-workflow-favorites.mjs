// Mutating real-page acceptance for R5 workflow favorites.
// It uses an existing test-package workflow, then restores the favorite list
// to empty before exit. No workflow files, templates, or node data are edited.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const fail = (message) => { throw new Error(`[R5 workflow favorites] ${message}`); };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /workspacekit|workspace2/i.test(message.text())) errors.push(message.text());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await page.waitForSelector("canvas", { state: "attached", timeout: 20_000 });
    await page.locator(".workspace2-tab-button").click();
    await page.waitForSelector(".workspace2-workflow-blueprint", { timeout: 15_000 });
    await page.waitForSelector(".workspace2-row.is-file[data-workspace2-item-path]", { timeout: 15_000 });

    const row = page.locator(".workspace2-row.is-file[data-workspace2-item-path]").first();
    const path = await row.getAttribute("data-workspace2-item-path");
    if (!path) fail("Browse did not expose a workflow file path");
    const rowSelector = `.workspace2-row.is-file[data-workspace2-item-path="${path.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, "\\\"")}"]`;
    const favoriteButton = row.locator(".workspace2-actions .workspace2-icon-button").first();
    await favoriteButton.click();
    await page.waitForFunction((favoritePath) => fetch("/workspace2/workflow-favorites")
      .then((response) => response.json())
      .then((data) => data.favorites?.includes(favoritePath)), path, { timeout: 10_000 });

    const viewTabs = page.locator(".workspace2-workflow-view-tab");
    if (await viewTabs.count() !== 2) fail("All/Favorites view controls are missing");
    await viewTabs.nth(1).click();
    await page.waitForSelector(rowSelector, { timeout: 10_000 });
    const favoriteRows = await page.locator(".workspace2-row.is-file[data-workspace2-item-path]").count();
    if (favoriteRows !== 1) fail(`Favorites projection expected one row, got ${favoriteRows}`);

    await viewTabs.nth(0).click();
    await page.waitForSelector(rowSelector, { timeout: 10_000 });
    await page.locator(`${rowSelector} .workspace2-actions .workspace2-icon-button`).first().click();
    await page.waitForFunction((favoritePath) => fetch("/workspace2/workflow-favorites")
      .then((response) => response.json())
      .then((data) => !data.favorites?.includes(favoritePath)), path, { timeout: 10_000 });

    if (errors.length) fail(`WorkspaceKit console errors: ${errors.join(" | ")}`);
    console.log(`R5 workflow favorites real-page passed for ${path}`);
  } finally {
    // Safety cleanup in case the UI assertion fails after the first click.
    await page.evaluate(() => fetch("/workspace2/workflow-favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites: [] }),
    })).catch(() => {});
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
