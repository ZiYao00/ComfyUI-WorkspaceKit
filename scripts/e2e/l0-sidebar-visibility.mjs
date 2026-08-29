import assert from "node:assert/strict";
import { chromium } from "playwright";

const URL = "http://127.0.0.1:8190/";
const visibilityKeys = {
  workflows: "workspace2.tabs.workflows.visible",
  nodes: "workspace2.tabs.nodes.visible",
  templates: "workspace2.tabs.templates.visible",
  layout: "workspace2.tabs.layout.visible",
  theme: "workspace2.tabs.theme.visible",
};

async function openWorkspace(page) {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector(".workspace2-tab-button", { timeout: 45_000 });
  const button = page.locator(".workspace2-tab-button").first();
  if (!(await button.evaluate((el) => el.classList.contains("side-bar-button-selected")))) {
    await button.click();
  }
  await page.waitForSelector(".workspace2-module-settings", { timeout: 15_000 });
}

async function withContext(browser, preferences, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ preferences, visibilityKeys }) => {
    localStorage.setItem("workspace2.panelIntegrations.enabled", String(preferences.external ?? 0));
    for (const [name, key] of Object.entries(visibilityKeys)) {
      if (name in preferences) localStorage.setItem(key, String(preferences[name]));
      else localStorage.removeItem(key);
    }
  }, { preferences, visibilityKeys });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await openWorkspace(page);
    await run(page, pageErrors);
    assert.equal(
      pageErrors.some((message) => message.includes("blueprint.setStatus is not a function")),
      false,
      `setStatus regression returned:\n${pageErrors.join("\n")}`,
    );
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  // log44 regression: external Provider merging is off, but Layout is a first-party
  // module and must still render rather than falling back to Workflows.
  await withContext(browser, {
    workflows: 1, nodes: 1, templates: 1, layout: 1, theme: 0, external: 0,
  }, async (page) => {
    await page.waitForSelector('[data-workspace2-module-id="workspacekit.layout"]');
    assert.equal(await page.locator('[data-workspace2-module-id="workspacekit.theme"]').count(), 0);
    await page.locator('[data-workspace2-module-id="workspacekit.layout"]').click();
    await page.waitForSelector('[data-workspace2-module-id="workspacekit.layout"].is-active');
    await page.waitForSelector(".workspacekit-layout-v2", { timeout: 15_000 });
    assert.equal(await page.locator('[data-workspace2-module-id="workflows"].is-active').count(), 0);

    await page.locator(".workspace2-module-settings").click();
    await page.waitForSelector(".workspace2-settings-backdrop");
    const themeRow = page.locator('[data-workspace2-sidebar-tab-visibility="workspacekit.theme"]');
    const themeInput = themeRow.locator('input[type="checkbox"]');
    assert.equal(await themeRow.count(), 1);
    assert.equal(await themeInput.isChecked(), false);
    assert.equal(await themeInput.isDisabled(), true);
    assert.equal(await themeRow.evaluate((el) => el.classList.contains("is-disabled")), true);
    const externalInput = page.locator('[data-workspace2-sidebar-tab-visibility="external"] input[type="checkbox"]');
    assert.equal(await externalInput.isChecked(), false);
  });

  // Visibility preferences must hide only their own entries. A stale manual
  // Theme value of 1 must not unseal Theme before that product line begins.
  await withContext(browser, {
    workflows: 0, nodes: 1, templates: 0, layout: 1, theme: 1, external: 0,
  }, async (page) => {
    assert.equal(await page.locator('[data-workspace2-module-id="workflows"]').count(), 0);
    assert.equal(await page.locator('[data-workspace2-module-id="nodes"]').count(), 1);
    assert.equal(await page.locator('[data-workspace2-module-id="templates"]').count(), 0);
    assert.equal(await page.locator('[data-workspace2-module-id="workspacekit.layout"]').count(), 1);
    assert.equal(await page.locator('[data-workspace2-module-id="workspacekit.theme"]').count(), 0);
  });

  // Users may hide every currently available module. The Settings gear remains
  // reachable and the host must not secretly render a hidden Workflows panel.
  await withContext(browser, {
    workflows: 0, nodes: 0, templates: 0, layout: 0, theme: 1, external: 0,
  }, async (page) => {
    assert.equal(await page.locator(".workspace2-module-tab").count(), 0);
    assert.equal(await page.locator(".workspace2-module-settings").count(), 1);
    assert.equal(await page.locator(".workspace2-workflow-blueprint").count(), 0);
    await page.locator(".workspace2-module-settings").click();
    await page.waitForSelector(".workspace2-settings-backdrop");
  });

  console.log("L0 sidebar visibility and sealed Theme real-page contract passed.");
} finally {
  await browser.close();
}
