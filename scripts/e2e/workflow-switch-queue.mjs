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

async function workflowUiSnapshot() {
  return page.evaluate(() => {
    const app = window.app || window.comfyAPI?.app?.app;
    const pathFromInfo = (row) => row?.querySelector?.(".workspace2-current-workflow-info")?.getAttribute("title") || "";
    return {
      activePath: app?.extensionManager?.workflow?.activeWorkflow?.path || "",
      pendingOpenPaths: [...document.querySelectorAll(".workspace2-current-workflow.is-pending")].map(pathFromInfo),
      activeOpenPaths: [...document.querySelectorAll(".workspace2-current-workflow.is-selected")].map(pathFromInfo),
      activeBrowsePaths: [...document.querySelectorAll(".workspace2-row.is-active-workflow")]
        .map((row) => row.getAttribute("data-workspace2-item-path") || ""),
      activeBrowseFolders: [...document.querySelectorAll(".workspace2-row.is-active-workflow-path")]
        .map((row) => row.getAttribute("data-workspace2-item-path") || ""),
    };
  });
}

async function waitForWorkflowUiSettled(timeoutMs = 5_000) {
  const startedAt = Date.now();
  let first = null;
  let last = null;
  while (Date.now() - startedAt <= timeoutMs) {
    last = await workflowUiSnapshot();
    first ??= last;
    if (last.pendingOpenPaths.length === 0) {
      return { settled: true, elapsedMs: Date.now() - startedAt, first, last };
    }
    await page.waitForTimeout(25);
  }
  return { settled: false, elapsedMs: Date.now() - startedAt, first, last };
}

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

  const uiSettle = await waitForWorkflowUiSettled();
  if (!uiSettle.settled) {
    console.log(JSON.stringify({ workflowUiSettle: uiSettle }, null, 2));
  }
  assert.equal(uiSettle.settled, true, "pending UI must clear after the official queue drains");
  assert.equal(uiSettle.last?.activePath, lastPath, "settled UI snapshot must match the official active workflow");
  assert.deepEqual(
    uiSettle.last?.activeOpenPaths,
    [relativeTargets.at(-1)],
    "Open section must highlight only the official active workflow",
  );

  const finalRelativePath = relativeTargets.at(-1);
  const expectedRootFolder = finalRelativePath?.split("/")[0] || "";
  if (expectedRootFolder && finalRelativePath?.includes("/")) {
    assert.ok(
      uiSettle.last?.activeBrowseFolders.includes(expectedRootFolder),
      "Browse must highlight the visible ancestor folder of the official active workflow",
    );

    const fileAlreadyVisible = uiSettle.last?.activeBrowsePaths.includes(finalRelativePath);
    if (!fileAlreadyVisible) {
      await page.evaluate((folderPath) => {
        const folder = [...document.querySelectorAll(".workspace2-row.is-folder")]
          .find((row) => row.getAttribute("data-workspace2-item-path") === folderPath);
        if (!folder) throw new Error("Missing active workflow ancestor folder: " + folderPath);
        folder.click();
      }, expectedRootFolder);
      await page.waitForFunction((expectedPath) => (
        [...document.querySelectorAll(".workspace2-row.is-active-workflow")]
          .some((row) => row.getAttribute("data-workspace2-item-path") === expectedPath)
      ), finalRelativePath, { timeout: 5_000 });
    }

    const activeBrowsePaths = await page.locator(".workspace2-row.is-active-workflow")
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-workspace2-item-path") || ""));
    assert.deepEqual(
      activeBrowsePaths,
      [finalRelativePath],
      "Browse must highlight the official active workflow file once its folder is visible",
    );
  }

  console.log(JSON.stringify({
    rounds: ROUNDS,
    clickCount: ROUNDS * relativeTargets.length + 2,
    targets: relativeTargets,
    activePath: lastPath,
  }, null, 2));
} finally {
  await browser.close();
}
