// Read-only real-page acceptance for the Nodes navigation v1 surface.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  attachErrorCollector,
  installReadOnlyGuard,
  tsLog,
  waitForWorkspaceKitReady,
} from "./lib/wk-runtime.mjs";

const BASE_URL = "http://127.0.0.1:8190/";

function labelFor(button) {
  return String(button.textContent || "").trim();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await context.newPage();
const errors = attachErrorCollector(page);

try {
  await installReadOnlyGuard(page);
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
  await waitForWorkspaceKitReady(page);
  await page.locator(".workspace2-tab-button").click();
  await page.locator('[data-workspace2-module-id="nodes"], .workspace2-module-tab').nth(1).click();
  await page.waitForSelector(".workspace2-node-blueprint", { timeout: 20_000 });

  const filters = await page.locator(".workspace2-node-filter-row > button").evaluateAll((buttons) => buttons.map((button) => ({
    label: button.textContent.trim(),
    pressed: button.getAttribute("aria-pressed"),
  })));
  const expected = ["收藏", "蓝图", "Comfy", "合作伙伴", "扩展"];
  assert.deepEqual(filters.map((item) => item.label), expected);
  assert.equal(filters.every((item) => item.pressed === "true"), true);
  tsLog("five_filter_buttons", JSON.stringify(filters));

  const extensionMode = page.locator(".workspace2-node-extension-controls");
  await extensionMode.waitFor({ state: "visible", timeout: 10_000 });
  await extensionMode.getByRole("button", { name: "按插件" }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll(".workspace2-node-extension-controls button"))
    .some((button) => button.textContent.trim() === "按插件" && button.getAttribute("aria-pressed") === "true"));
  const initialCount = await page.locator(".workspace2-node-letter-index button").count();
  assert.ok(initialCount > 0, "Plugin view did not expose any present initial letters.");
  tsLog("plugin_initials", String(initialCount));

  const candidate = await page.evaluate(() => {
    const entries = Object.entries(window.LiteGraph?.registered_node_types || {});
    const match = entries.find(([, ctor]) => String(ctor?.nodeData?.python_module || "").startsWith("custom_nodes."));
    if (!match) return null;
    const [type, ctor] = match;
    return {
      type,
      title: String(ctor?.nodeData?.display_name || ctor?.title || type),
    };
  });
  assert.ok(candidate?.type, "No custom-node runtime definition was available for locate-plugin acceptance.");
  const search = page.locator('input[placeholder="搜索节点"]');
  await search.fill(candidate.title);
  const locate = page.locator('.workspace2-node-row .workspace2-actions button[title="定位插件"]').first();
  await locate.waitFor({ state: "visible", timeout: 15_000 });
  await locate.click();
  await page.getByRole("button", { name: "返回搜索结果" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForSelector(".workspace2-node-row.is-located", { timeout: 10_000 });
  tsLog("locate_plugin", candidate.type);

  await page.getByRole("button", { name: "返回搜索结果" }).click();
  await page.waitForFunction((title) => document.querySelector('input[placeholder="搜索节点"]')?.value === title, candidate.title);
  assert.deepEqual(errors.workspacekitRelated(), []);
  console.log(JSON.stringify({ filters, initialCount, candidate, workspaceKitErrors: errors.workspacekitRelated() }, null, 2));
} finally {
  await browser.close();
}
