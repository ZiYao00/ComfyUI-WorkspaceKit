// Focused real-page smoke test for WorkspaceKit Settings input bindings.
//
// The browser context is ephemeral. This test may change localStorage inside the
// headless context to verify reassignment, but it never mutates workflow,
// template, group, or server data and the context is destroyed at the end.

import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const TIMEOUT = 20_000;

const EXPECTED_DEFAULTS = Object.freeze({
  "workspace.openWorkflows": "Shift + 1",
  "workspace.openNodes": "Shift + 2",
  "workspace.openTemplates": "Shift + 3",
  "workspace.openLayout": "Shift + 4",
  "workspace.openTheme": "Shift + 5",
  "template.saveSelection": "Alt + C",
  "group.create": "Ctrl + G",
  "group.ungroup": "Shift + G",
});

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const wkErrors = [];
  page.on("pageerror", (error) => {
    if (/workspacekit|workspace2/i.test(error.message || "")) wkErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /workspacekit|workspace2/i.test(message.text())) wkErrors.push(message.text());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await page.waitForSelector("canvas", { timeout: TIMEOUT });
    await page.waitForFunction(() => Boolean(window.app?.extensionManager && window.WorkspaceKitPanelAPI), null, { timeout: TIMEOUT });

    const root = page.locator('[data-tab-id="workspace2"], [data-sidebar-tab-id="workspace2"], [aria-label="WorkspaceKit"], .workspace2-tab-button').first();
    await root.click();
    await page.waitForSelector(".workspace2-module-tabs", { timeout: TIMEOUT });

    // Default keyboard routing must target the two newly first-class modules.
    await page.keyboard.press("Shift+4");
    await page.waitForFunction(() => document.querySelector('.workspace2-module-tab.is-active')?.dataset.workspace2ModuleId === "workspacekit.layout", null, { timeout: TIMEOUT });
    await page.keyboard.press("Shift+5");
    await page.waitForFunction(() => document.querySelector('.workspace2-module-tab.is-active')?.dataset.workspace2ModuleId === "workspacekit.theme", null, { timeout: TIMEOUT });

    await page.locator(".workspace2-module-settings").click();
    await page.waitForSelector(".workspace2-settings-dialog", { timeout: TIMEOUT });
    await page.locator('[data-workspace2-settings-page="shortcuts"]').click();
    await page.waitForFunction(() => {
      const pageElement = document.querySelector('[data-workspace2-settings-page-content="shortcuts"]');
      return pageElement && !pageElement.hidden;
    }, null, { timeout: TIMEOUT }).catch(async () => {
      // Page content currently exposes hidden state rather than a required data
      // attribute; the active nav button plus visible keybinding controls is the
      // public smoke boundary.
      await page.waitForSelector('.workspace2-settings-keybinding[data-workspace2-command-binding="workspace.openWorkflows"]', { timeout: TIMEOUT });
    });

    const report = await page.evaluate(() => {
      const bindings = Object.fromEntries([...document.querySelectorAll(".workspace2-settings-keybinding[data-workspace2-command-binding]")].map((button) => [
        button.dataset.workspace2CommandBinding,
        button.textContent?.trim() || "",
      ]));
      const pointerRows = [...document.querySelectorAll("[data-workspace2-group-pointer-action]")].map((row) => ({
        action: row.dataset.workspace2GroupPointerAction,
        values: [...row.querySelectorAll("select")].map((select) => select.value),
      }));
      const activeNav = document.querySelector('.workspace2-settings-nav-button.is-active')?.dataset.workspace2SettingsPage || "";
      const pageTitle = [...document.querySelectorAll(".workspace2-settings-page")].find((element) => !element.hidden)?.querySelector(".workspace2-settings-page-title")?.textContent?.trim() || "";
      return { bindings, pointerRows, activeNav, pageTitle };
    });

    assert.equal(report.activeNav, "shortcuts");
    assert.equal(Object.keys(report.bindings).length, 8);
    assert.deepEqual(report.bindings, EXPECTED_DEFAULTS);
    assert.deepEqual(report.pointerRows, [
      { action: "group.toggleIgnore", values: ["control", "left"] },
      { action: "group.toggleDisable", values: ["alt", "left"] },
      { action: "group.toggleSelection", values: ["shift", "left"] },
    ]);

    // Internal conflict: assigning Theme to Shift+4 must name the existing
    // Layout binding and, after confirmation, clear Layout atomically.
    const themeBinding = page.locator('[data-workspace2-command-binding="workspace.openTheme"]');
    await themeBinding.click();
    await page.keyboard.press("Shift+4");
    const internalDialog = page.locator(".workspace2-confirm-dialog");
    await internalDialog.waitFor({ state: "visible", timeout: TIMEOUT });
    const internalMessage = await internalDialog.locator(".workspace2-confirm-message").textContent();
    assert.match(internalMessage || "", /Shift \+ 4/);
    assert.match(internalMessage || "", /排版|Layout/i);
    await internalDialog.locator(".workspace2-confirm-button:not(.is-secondary)").click();
    await page.waitForFunction(() => {
      const layout = document.querySelector('[data-workspace2-command-binding="workspace.openLayout"]');
      const theme = document.querySelector('[data-workspace2-command-binding="workspace.openTheme"]');
      return /未设置|Unassigned/.test(layout?.textContent || "") && (theme?.textContent || "").includes("Shift + 4");
    }, null, { timeout: TIMEOUT });

    // ComfyUI conflict: Ctrl+S must produce a warning. Canceling leaves the
    // accepted Theme binding untouched.
    await themeBinding.click();
    await page.keyboard.press("Control+S");
    const comfyDialog = page.locator(".workspace2-confirm-dialog");
    await comfyDialog.waitFor({ state: "visible", timeout: TIMEOUT });
    const comfyMessage = await comfyDialog.locator(".workspace2-confirm-message").textContent();
    assert.match(comfyMessage || "", /Ctrl \+ S/);
    assert.match(comfyMessage || "", /ComfyUI/);
    await comfyDialog.locator(".workspace2-confirm-button.is-secondary").click();
    assert.equal((await themeBinding.textContent())?.trim(), "Shift + 4");

    assert.deepEqual(wkErrors, []);
    console.log("WorkspaceKit real-page Settings input bindings smoke passed.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
