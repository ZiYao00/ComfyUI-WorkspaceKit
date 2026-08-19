// T-056 R6 / T-602: real-page acceptance for the two WK family Providers.
//
// It verifies the boundaries that static Provider contracts cannot prove:
// - Theme and Layout both register with the live WorkspaceKit host;
// - switching Theme -> Layout -> core tabs leaves no duplicate Provider DOM;
// - disabling WK integrations before startup retains two independent sidebar
//   fallbacks and each one can mount/unmount with its bundled Vendor UI.
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

async function activateOverflowProvider(page, label) {
  await page.locator(".workspace2-module-overflow-caret").click();
  await page.locator(".workspace2-module-overflow-open").filter({ hasText: label }).click();
  await page.waitForTimeout(150);
}

async function verifyHosted(page) {
  tsLog("hosted_open_workspace");
  await page.locator(".workspace2-tab-button").click();
  await page.waitForSelector(".workspace2-module-tab", { timeout: 10_000 });
  tsLog("hosted_workspace_open");

  const registered = await page.evaluate(() => window.WorkspaceKitPanelAPI?.getProviders?.().map((provider) => provider.id) ?? []);
  if (!registered.includes("workspacekit.theme") || !registered.includes("workspacekit.layout")) {
    throw new Error(`host missing family providers: ${JSON.stringify(registered)}`);
  }

  tsLog("hosted_open_theme");
  await page.locator(".workspace2-module-tab").nth(3).click();
  await page.waitForSelector(".wkt-toolbar", { timeout: 10_000 });
  tsLog("hosted_theme_open");
  const themeFirst = await page.evaluate(slotReport);
  if (themeFirst.themeToolbar !== 1 || themeFirst.layoutGrid !== 0 || themeFirst.header !== 1 || themeFirst.content !== 1) {
    throw new Error(`Theme hosted slot mismatch: ${JSON.stringify(themeFirst)}`);
  }

  tsLog("hosted_open_layout");
  await activateOverflowProvider(page, "WK 版式");
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

  tsLog("hosted_remount_theme");
  // Selecting Layout from the overflow menu pins Layout into the fourth tab.
  // Theme therefore moves into the overflow list; exercise that real path
  // instead of assuming the previous pinned tab remains in the strip.
  await activateOverflowProvider(page, "WK 主题");
  await page.waitForSelector(".wkt-toolbar", { timeout: 10_000 });
  tsLog("hosted_theme_remounted");
  const themeAgain = await page.evaluate(slotReport);
  if (themeAgain.themeToolbar !== 1 || themeAgain.layoutGrid !== 0) {
    throw new Error(`Theme remount mismatch: ${JSON.stringify(themeAgain)}`);
  }
  return { registered, themeFirst, layout, core, themeAgain };
}

async function verifyIndependentFallback(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript((key) => localStorage.setItem(key, "0"), INTEGRATIONS_KEY);
  await page.goto(BASE_URL_DEFAULT, { waitUntil: "load", timeout: 30_000 });
  tsLog("fallback_page_loaded");
  await waitForWorkspaceKitReady(page);
  tsLog("fallback_ready");

  const result = await page.evaluate(() => {
    const providers = window.WorkspaceKitPanelAPI?.getProviders?.().map((provider) => provider.id) ?? [];
    const tabs = window.app?.extensionManager?.getSidebarTabs?.() ?? [];
    const ids = tabs.map((tab) => tab.id);
    const renderOnce = (id, expected) => {
      const tab = tabs.find((item) => item.id === id);
      if (!tab || typeof tab.render !== "function") return { found: false };
      const host = document.createElement("div");
      const dispose = tab.render(host);
      const mounted = Boolean(host.querySelector(expected));
      if (typeof dispose === "function") dispose();
      // The ComfyUI sidebar owns the outer host/shell and may retain it for a
      // future render. The Provider's responsibility is to remove its own
      // mounted panel, not to erase that host-managed wrapper.
      return { found: true, mounted, panelRemovedAfterDispose: !host.querySelector(expected) };
    };
    return {
      providers,
      sidebarIds: ids.filter((id) => /workspacekit-(theme-lab|layout-panel)/.test(id)),
      theme: renderOnce("workspacekit-theme-lab", ".wkt-theme-lab, .wkt-theme-root, .wkt-content"),
      layout: renderOnce("workspacekit-layout-panel", ".workspacekit-layout-shell, .workspacekit-ui-command-grid"),
    };
  });
  await context.close();
  const fallbackIds = new Set(result.sidebarIds);
  if (result.providers.length !== 0
    || !fallbackIds.has("workspacekit-theme-lab") || !fallbackIds.has("workspacekit-layout-panel")
    || !result.theme.found || !result.theme.mounted || !result.theme.panelRemovedAfterDispose
    || !result.layout.found || !result.layout.mounted || !result.layout.panelRemovedAfterDispose) {
    throw new Error(`independent fallback mismatch: ${JSON.stringify(result)}`);
  }
  return result;
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
    const fallback = await verifyIndependentFallback(browser);
    tsLog("independent_fallback", JSON.stringify(fallback));
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
