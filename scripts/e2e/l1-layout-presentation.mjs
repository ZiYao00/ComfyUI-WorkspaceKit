import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL = "http://127.0.0.1:8190/";
const MODE_KEY = "workspacekit.layout.presentation.mode";
const TAB_KEYS = {
  workflows: "workspace2.tabs.workflows.visible",
  nodes: "workspace2.tabs.nodes.visible",
  templates: "workspace2.tabs.templates.visible",
  layout: "workspace2.tabs.layout.visible",
  theme: "workspace2.tabs.theme.visible",
};

async function openLayout(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector(".workspace2-tab-button", { timeout: 45_000 });
  const sidebarButton = page.locator(".workspace2-tab-button").first();
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
  localStorage.setItem("workspace2.panelIntegrations.enabled", "0");
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
  assert.equal(await layoutSettings.count(), 1, "Display mode entry should navigate to Layout presentation settings");
  const modeSelect = layoutSettings.locator('[data-workspacekit-layout-presentation-mode="true"] select');
  assert.equal(await modeSelect.inputValue(), "top");

  await modeSelect.selectOption("pinned");
  const floating = page.locator(".workspacekit-layout-floating-toolbar");
  await floating.waitFor({ state: "visible", timeout: 10_000 });
  assert.equal(await floating.locator(".workspacekit-layout-floating-button").count(), 8);
  await topbar.waitFor({ state: "detached", timeout: 10_000 });

  await modeSelect.selectOption("selection");
  await floating.waitFor({ state: "hidden", timeout: 10_000 });

  await modeSelect.selectOption("none");
  await floating.waitFor({ state: "detached", timeout: 10_000 });
  assert.equal(await topbar.count(), 0);

  await modeSelect.selectOption("top");
  await topbar.waitFor({ state: "visible", timeout: 10_000 });

  assert.deepEqual(pageErrors, [], `Unexpected page errors:\n${pageErrors.join("\n")}`);
  console.log("L1-A1.1/A2 Layout real-page presentation smoke passed.");
} finally {
  await context.close();
  await browser.close();
}
