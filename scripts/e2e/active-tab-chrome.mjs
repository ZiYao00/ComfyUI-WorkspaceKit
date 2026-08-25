// Real-page visual-structure regression for the shared active module tab. It
// checks both transparent and frosted modes in isolated browser contexts and
// does not invoke workflows, settings APIs, or file operations.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  for (const mode of ["transparent", "glass"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((selectedMode) => {
      localStorage.setItem("workspace2.panelBackgroundMode", selectedMode);
      localStorage.setItem("workspace2.panelBlur", "55");
      localStorage.setItem("workspace2.panelBlurScaleVersion", "2");
    }, mode);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:8190/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector(".workspace2-tab-button"), null, { timeout: 45_000, polling: 250 });
    await page.locator(".workspace2-tab-button").first().click();
    await page.waitForSelector(".workspace2-module-tab.is-active", { timeout: 15_000 });
    const metrics = await page.evaluate(() => {
      const tab = document.querySelector(".workspace2-module-tab.is-active");
      const frame = document.querySelector(".workspace2-module-frame");
      return {
        activeGradient: getComputedStyle(tab).backgroundImage,
        activeBorder: getComputedStyle(tab).borderTopColor,
        arc: getComputedStyle(tab, "::before").backgroundImage,
        frameLine: getComputedStyle(frame, "::before").backgroundColor,
      };
    });
    assert.match(metrics.activeGradient, /linear-gradient/);
    assert.notEqual(metrics.activeBorder, "rgba(0, 0, 0, 0)");
    assert.match(metrics.arc, /radial-gradient/);
    assert.notEqual(metrics.frameLine, "rgba(0, 0, 0, 0)");
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
  }
  console.log("Active module-tab visual structure passed.");
} finally {
  await browser.close();
}
