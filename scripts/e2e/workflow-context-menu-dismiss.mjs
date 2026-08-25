// Real-page regression for Browse file-menu density and dismissal. It only
// opens a context menu in an isolated browser context; it invokes no workflow
// operation and does not write user data.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:8190/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector(".workspace2-tab-button"), null, { timeout: 45_000, polling: 250 });
  await page.locator(".workspace2-tab-button").first().click();
  await page.waitForSelector(".workspace2-row.is-file", { timeout: 20_000 });

  const row = page.locator(".workspace2-row.is-file").first();
  await row.click({ button: "right" });
  await page.waitForSelector(".workspace2-context");
  const labels = await page.locator(".workspace2-context button").evaluateAll(buttons => buttons.map(button => button.textContent.trim()));
  assert.equal(labels.length, 5, `expected five file-menu actions, got ${JSON.stringify(labels)}`);
  assert.match(labels[1], /打开工作流位置|Show workflow in folder/);

  await page.keyboard.press("Escape");
  await page.waitForSelector(".workspace2-context", { state: "detached" });
  await row.click({ button: "right" });
  await page.waitForSelector(".workspace2-context");
  await page.mouse.click(900, 400);
  await page.waitForSelector(".workspace2-context", { state: "detached" });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ labels, errors }));
} finally {
  await browser.close();
}
