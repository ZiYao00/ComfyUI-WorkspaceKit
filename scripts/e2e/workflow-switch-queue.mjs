// Real-page stress regression: rapid WorkspaceKit Open-row clicks must be
// delegated to ComfyUI's official workflow queue and settle on the last target.
// All server-side workflow mutations are blocked.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  attachErrorCollector,
  installReadOnlyGuard,
  waitForWorkspaceKitReady,
} from "./lib/wk-runtime.mjs";

const BASE_URL = process.env.COMFY_BASE_URL || "http://127.0.0.1:8190/";
const ROUNDS = Number(process.env.WK_SWITCH_STRESS_ROUNDS || 12);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = attachErrorCollector(page);

try {
  await installReadOnlyGuard(page);
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
  await waitForWorkspaceKitReady(page);

  // Test-only fixture setup: make one real workflow active, then expose two
  // additional persisted workflows as official background tabs without loading
  // them. User-facing switching below goes exclusively through WorkspaceKit.
  const prepared = await page.evaluate(async () => {
    const app = window.app || window.comfyAPI?.app?.app;
    const store = app?.extensionManager?.workflow;
    await store?.syncWorkflows?.();
    const targets = (store?.workflows || [])
      .filter((workflow) => workflow && typeof workflow.path === "string" && workflow.path.startsWith("workflows/"))
      .slice(0, 3);
    if (targets.length < 3) return [];

    const first = targets[0];
    const loadFromRemote = !first.isLoaded;
    const loaded = first.isLoaded ? first : await first.load();
    await app.loadGraphData(loaded.activeState, true, true, first, {
      checkForRerouteMigration: false,
      deferWarnings: true,
      skipAssetScans: !loadFromRemote,
    });
    store.openWorkflowsInBackground?.({ right: targets.slice(1).map((workflow) => workflow.path) });
    return targets.map((workflow) => workflow.path);
  });
  assert.equal(prepared.length, 3, "The test runtime did not expose three persisted workflows.");

  await page.locator(".workspace2-tab-button").first().click();
  await page.locator('[data-workspace2-module-id="workflows"]').first().click();
  await page.waitForSelector(".workspace2-current-workflow-info", { timeout: 20_000 });

  const relativeTargets = prepared.map((path) => path.replace(/^workflows\//, ""));
  for (const path of relativeTargets) {
    const present = await page.locator(".workspace2-current-workflow-info")
      .evaluateAll((items, expected) => items.some((item) => item.getAttribute("title") === expected), path);
    assert.equal(present, true, "Open section is missing " + path);
  }

  // No per-click workflow wait: repeatedly cycle the same three tabs to model
  // the real failure mode that used to strand the panel after enough switches.
  for (let round = 0; round < ROUNDS; round += 1) {
    for (const path of relativeTargets) {
      await page.evaluate((expected) => {
        const row = [...document.querySelectorAll(".workspace2-current-workflow-info")]
          .find((item) => item.getAttribute("title") === expected);
        if (!row) throw new Error("Missing WorkspaceKit Open row: " + expected);
        row.click();
      }, path);
    }
  }

  const lastPath = prepared.at(-1);
  await page.waitForFunction((expectedPath) => {
    const app = window.app || window.comfyAPI?.app?.app;
    return app?.extensionManager?.workflow?.activeWorkflow?.path === expectedPath;
  }, lastPath, { timeout: 60_000 });

  const activePath = await page.evaluate(() => {
    const app = window.app || window.comfyAPI?.app?.app;
    return app?.extensionManager?.workflow?.activeWorkflow?.path || "";
  });
  assert.equal(activePath, lastPath);

  // The switcher must still work after the stress burst, not merely end on the
  // expected tab once. Switch away and back through the same WorkspaceKit rows.
  for (const expected of [relativeTargets[0], relativeTargets[2]]) {
    await page.evaluate((path) => {
      const row = [...document.querySelectorAll(".workspace2-current-workflow-info")]
        .find((item) => item.getAttribute("title") === path);
      if (!row) throw new Error("Missing WorkspaceKit Open row after stress: " + path);
      row.click();
    }, expected);
  }
  await page.waitForFunction((expectedPath) => {
    const app = window.app || window.comfyAPI?.app?.app;
    return app?.extensionManager?.workflow?.activeWorkflow?.path === expectedPath;
  }, lastPath, { timeout: 30_000 });

  assert.deepEqual(
    errors.all().filter((message) => /Cannot read properties of undefined \(reading ['"]path['"]\)/i.test(message)),
    [],
  );
  assert.equal(
    await page.locator(".workspace2-current-workflow.is-pending").count(),
    0,
    "pending UI must clear after the official queue drains",
  );

  console.log(JSON.stringify({
    rounds: ROUNDS,
    clickCount: ROUNDS * relativeTargets.length + 2,
    targets: relativeTargets,
    activePath: lastPath,
  }, null, 2));
} finally {
  await browser.close();
}
