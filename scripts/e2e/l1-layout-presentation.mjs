import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrlArgIndex = process.argv.indexOf("--base-url");
const URL = baseUrlArgIndex >= 0 && process.argv[baseUrlArgIndex + 1]
  ? `${process.argv[baseUrlArgIndex + 1].replace(/\/$/, "")}/`
  : "http://127.0.0.1:8190/";
const MODE_KEY = "workspacekit.layout.presentation.mode";
const TAB_KEYS = {
  workflows: "workspace2.tabs.workflows.visible",
  nodes: "workspace2.tabs.nodes.visible",
  templates: "workspace2.tabs.templates.visible",
  layout: "workspace2.tabs.layout.visible",
  theme: "workspace2.tabs.theme.visible",
};
const WORKSPACEKIT_SIDEBAR_SELECTOR = [
  '[data-tab-id="workspace2"]',
  '[data-sidebar-tab-id="workspace2"]',
  '[aria-label="WorkspaceKit"]',
  '.workspace2-tab-button',
].join(', ');

async function openLayout(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector(WORKSPACEKIT_SIDEBAR_SELECTOR, { timeout: 45_000 });
  const sidebarButton = page.locator(WORKSPACEKIT_SIDEBAR_SELECTOR).first();
  if (!(await sidebarButton.evaluate((el) => el.classList.contains("side-bar-button-selected")))) {
    await sidebarButton.click();
  }
  await page.waitForSelector('[data-workspace2-module-id="workspacekit.layout"]', { timeout: 15_000 });
  await page.locator('[data-workspace2-module-id="workspacekit.layout"]').click();
  await page.waitForSelector(".workspacekit-layout-v2", { timeout: 15_000 });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(({ modeKey, tabKeys }) => {
  localStorage.setItem(modeKey, "top");
  localStorage.setItem("workspacekit.layout.command-icon-size", "22");
  localStorage.setItem("workspacekit.layout.spacing", "32");
  localStorage.setItem("workspace2.panelIntegrations.enabled", "1");
  localStorage.setItem(tabKeys.workflows, "1");
  localStorage.setItem(tabKeys.nodes, "1");
  localStorage.setItem(tabKeys.templates, "1");
  localStorage.setItem(tabKeys.layout, "1");
  localStorage.setItem(tabKeys.theme, "0");
}, { modeKey: MODE_KEY, tabKeys: TAB_KEYS });

const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await openLayout(page);

  const disableResult = await page.evaluate(() => globalThis.WorkspaceKitPanelAPI?.setProvidersEnabled?.(false));
  assert.equal(disableResult?.ok, true, "runtime Provider disable should succeed");
  assert.equal(disableResult?.enabled, false);
  await page.waitForSelector(".workspacekit-layout-v2", { timeout: 10_000 });
  await page.locator('[data-workspace2-module-id="workspacekit.layout"]').click();
  await page.waitForSelector(".workspacekit-layout-v2", { timeout: 10_000 });
  const enableResult = await page.evaluate(() => globalThis.WorkspaceKitPanelAPI?.setProvidersEnabled?.(true));
  assert.equal(enableResult?.ok, true, "runtime Provider enable should succeed");
  assert.equal(enableResult?.enabled, true);
  const disableAgainResult = await page.evaluate(() => globalThis.WorkspaceKitPanelAPI?.setProvidersEnabled?.(false));
  assert.equal(disableAgainResult?.ok, true, "repeated runtime Provider disable should succeed");
  assert.equal(disableAgainResult?.enabled, false);
  await page.waitForSelector(".workspacekit-layout-v2", { timeout: 10_000 });

  const rows = page.locator("[data-layout-primary-row]");
  assert.equal(await rows.count(), 2, "primary Layout commands should have exactly two fixed rows");
  assert.equal(await rows.nth(0).locator(".workspacekit-layout-v2-command").count(), 4);
  assert.equal(await rows.nth(1).locator(".workspacekit-layout-v2-command").count(), 4);

  const sizeGrid = page.locator('[data-layout-size-grid="true"]');
  assert.equal(await sizeGrid.locator(".workspacekit-layout-v2-command").count(), 5, "size commands should form one equal five-command row");

  const spacing = page.locator('[data-layout-spacing-group="true"]');
  assert.equal(await spacing.locator('input[type="number"]').inputValue(), "32");
  assert.equal(await spacing.locator(".workspacekit-layout-v2-spacing-command").count(), 2);

  const legacyIcons = page.locator(".workspacekit-layout-command-icon.is-nodealigner-legacy");
  assert.ok(await legacyIcons.count() >= 12, "the full panel should render the restored historical icon vocabulary");

  const topbar = page.locator(".workspacekit-layout-topbar-slot");
  await topbar.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await page.locator(".workspacekit-layout-floating-toolbar").count(), 0, "top mode should not also mount a floating toolbar");

  await page.locator(".workspacekit-layout-v2-display-mode").click();
  await page.waitForSelector(".workspace2-settings-backdrop", { timeout: 10_000 });
  const layoutSettings = page.locator('[data-workspacekit-layout-display-settings="true"]');
  assert.equal(await layoutSettings.count(), 1, "Display mode entry should navigate to the dedicated Layout Settings page");
  assert.equal(await page.locator('[data-workspace2-settings-page="layout"].is-active').count(), 1);
  const modeGroup = layoutSettings.locator('[data-workspacekit-layout-presentation-mode="true"]');
  const modeRadio = (value) => modeGroup.locator(`input[type="radio"][value="${value}"]`);
  assert.equal(await modeRadio("top").isChecked(), true);
  assert.equal(await modeGroup.locator('input[type="radio"]').count(), 4);

  await modeRadio("pinned").check();
  const floating = page.locator(".workspacekit-layout-floating-toolbar");
  await floating.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await floating.locator(".workspacekit-layout-floating-button").count(), 8);
  await topbar.waitFor({ state: "detached", timeout: 10_000 });
  const floatingBox = await floating.boundingBox();
  const shellBox = await page.locator(".workspace2-shell").boundingBox();
  if (floatingBox && shellBox) {
    const overlapsShell = floatingBox.x < shellBox.x + shellBox.width
      && floatingBox.x + floatingBox.width > shellBox.x
      && floatingBox.y < shellBox.y + shellBox.height
      && floatingBox.y + floatingBox.height > shellBox.y;
    assert.equal(overlapsShell, false, "pinned Layout toolbar must stay out from under the WK sidebar");
  }

  await modeRadio("selection").check();
  await floating.waitFor({ state: "hidden", timeout: 10_000 });

  await modeRadio("none").check();
  await floating.waitFor({ state: "detached", timeout: 10_000 });
  assert.equal(await topbar.count(), 0);

  await modeRadio("top").check();
  await topbar.waitFor({ state: "visible", timeout: 10_000 });

  assert.deepEqual(pageErrors, [], `Unexpected page errors:\n${pageErrors.join("\n")}`);
  console.log("L1-A1.1/A2 Layout real-page presentation smoke passed.");
} finally {
  await context.close();
  await browser.close();
}
