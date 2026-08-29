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
      const label = tab?.querySelector(".workspace2-module-tab-label");
      const strip = tab?.closest(".workspace2-module-tabs");
      const tabStyle = getComputedStyle(tab);
      const shoulder = getComputedStyle(tab, "::before");
      const stripLine = getComputedStyle(strip, "::after");
      return {
        activeBackgroundImage: tabStyle.backgroundImage,
        activeBackgroundColor: tabStyle.backgroundColor,
        tabOverflow: tabStyle.overflow,
        labelOverflow: label ? getComputedStyle(label).overflow : "missing",
        shoulderBackgroundImage: shoulder.backgroundImage,
        shoulderShadow: shoulder.boxShadow,
        shoulderRadius: shoulder.borderBottomRightRadius,
        stripLine: stripLine.backgroundColor,
        stripLineLeft: stripLine.left,
        stripLineRight: stripLine.right,
      };
    });
    assert.equal(metrics.activeBackgroundImage, "none");
    assert.notEqual(metrics.activeBackgroundColor, "rgba(0, 0, 0, 0)");
    assert.equal(metrics.tabOverflow, "visible", "active tab must not clip its shoulders");
    assert.equal(metrics.labelOverflow, "hidden", "label owns ellipsis clipping");
    assert.equal(metrics.shoulderBackgroundImage, "none", "shoulder uses inverse-radius geometry, not a radial-gradient approximation");
    assert.notEqual(metrics.shoulderShadow, "none");
    assert.notEqual(metrics.shoulderRadius, "0px");
    assert.notEqual(metrics.stripLine, "rgba(0, 0, 0, 0)");
    assert.equal(metrics.stripLineLeft, "0px");
    assert.equal(metrics.stripLineRight, "0px");
    assert.equal(errors.length, 0, errors.join("\n"));
    await context.close();
  }
  console.log("Active module-tab visual structure passed.");
} finally {
  await browser.close();
}
