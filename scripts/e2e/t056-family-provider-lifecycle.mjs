// T-056 successor: real-page acceptance for built-in Layout and retired Theme.
//
// It verifies the boundaries that static Provider contracts cannot prove:
// - Layout remains registered, Theme does not;
// - Layout -> core -> Layout mounts and cleans up its own DOM.
//
// Safety: each browser context is disposable. It never invokes a workflow,
// template, group, queue, save, or settings API. A request-abort guard is
// intentionally not installed: normal ComfyUI startup may persist its own
// node-cache snapshot, and aborting that unrelated startup path can prevent
// the extension registry from becoming ready.

import { chromium } from "playwright";
import {
  BASE_URL_DEFAULT, tsLog, attachErrorCollector,
  waitForWorkspaceKitReady,
} from "./lib/wk-runtime.mjs";

const INTEGRATIONS_KEY = "workspace2.panelIntegrations.enabled";

function slotReport() {
  const count = (selector) => document.querySelectorAll(selector).length;
  return {
    header: count(".workspace2-module-header-host > *"),
    toolbar: count(".workspace2-module-context-host > *"),
    controls: count(".workspace2-module-controls-host > *"),
    content: count(".workspace2-module-body > *"),
    themeToolbar: count(".wkt-toolbar"),
    layoutGrid: count(".workspacekit-ui-command-grid"),
  };
}

async function verifyHosted(page) {
  tsLog("hosted_open_workspace");
  await page.locator(".workspace2-tab-button").click();
  await page.waitForSelector(".workspace2-module-tab", { timeout: 10_000 });
  tsLog("hosted_workspace_open");

  const registered = await page.evaluate(() => window.WorkspaceKitPanelAPI?.getProviders?.().map((provider) => provider.id) ?? []);
  if (registered.includes("workspacekit.theme") || !registered.includes("workspacekit.layout")) {
    throw new Error(`host missing family providers: ${JSON.stringify(registered)}`);
  }

  tsLog("hosted_open_layout");
  await page.locator('[data-workspace2-module-id="workspacekit.layout"]').click();
  await page.waitForSelector(".workspacekit-ui-command-grid", { timeout: 10_000 });
  tsLog("hosted_layout_open");
  const layout = await page.evaluate(slotReport);
  if (layout.themeToolbar !== 0 || layout.layoutGrid !== 1 || layout.header !== 1 || layout.content !== 1) {
    throw new Error(`Layout hosted cleanup mismatch: ${JSON.stringify(layout)}`);
  }

  tsLog("hosted_open_nodes");
  await page.locator(".workspace2-module-tab").filter({ hasText: "节点" }).click();
  await page.waitForSelector(".workspace2-node-blueprint", { timeout: 10_000 });
  tsLog("hosted_nodes_open");
  const core = await page.evaluate(slotReport);
  if (core.themeToolbar !== 0 || core.layoutGrid !== 0) {
    throw new Error(`Provider DOM remained after core switch: ${JSON.stringify(core)}`);
  }

  await page.locator('[data-workspace2-module-id="workspacekit.layout"]').click();
  await page.waitForSelector(".workspacekit-ui-command-grid", { timeout: 10_000 });
  const layoutAgain = await page.evaluate(slotReport);
  if (layoutAgain.themeToolbar !== 0 || layoutAgain.layoutGrid !== 1) {
    throw new Error("Layout remount mismatch: " + JSON.stringify(layoutAgain));
  }
  return { registered, layout, core, layoutAgain };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  const failures = [];
  try {
    tsLog("navigate", BASE_URL_DEFAULT);
    await page.goto(BASE_URL_DEFAULT, { waitUntil: "load", timeout: 30_000 });
    tsLog("page_loaded");
    await waitForWorkspaceKitReady(page);
    tsLog("ready");
    const hosted = await verifyHosted(page);
    tsLog("hosted", JSON.stringify(hosted));
    const wkErrors = errors.workspacekitRelated();
    tsLog("errs_workspace", String(wkErrors.length));
    if (wkErrors.length) failures.push(`WorkspaceKit console errors: ${wkErrors.length}`);
  } catch (error) {
    failures.push(error?.stack || String(error));
  } finally {
    await context.close();
    await browser.close();
  }
  if (failures.length) {
    tsLog("result", "fail");
    failures.forEach((failure) => tsLog("  failure", failure));
    process.exitCode = 1;
  } else {
    tsLog("result", "ok");
  }
}

main();
