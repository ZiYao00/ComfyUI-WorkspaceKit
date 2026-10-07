// Persisted-workflow acceptance for WK Video Resolution / Video Duration.
// Creates exactly one __WK_TEST__ workflow, refreshes it, verifies clean restore,
// then removes only that test file through WorkspaceKit trash APIs.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const TEST_PATH = `__WK_TEST__/wk-utility-save-reload-${Date.now()}.json`;
const OFFICIAL_PATH = `workflows/${TEST_PATH}`;
const WORKSPACEKIT_SIDEBAR_SELECTOR = [
  '[data-tab-id="workspace2"]',
  '[data-sidebar-tab-id="workspace2"]',
  '[aria-label="WorkspaceKit"]',
  '.workspace2-tab-button',
].join(", ");

const EMPTY_GRAPH = Object.freeze({
  last_node_id: 0,
  last_link_id: 0,
  nodes: [],
  links: [],
  groups: [],
  config: {},
  extra: {},
  version: 0.4,
});

async function postJson(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `${response.status} ${response.statusText}`);
    }
    return payload;
  }, { path, body });
}

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph
    && window.app?.extensionManager?.workflow
    && window.LiteGraph?.createNode, null, { timeout: 45_000, polling: 250 });
  await page.waitForTimeout(500);
}

async function openWorkspaceWorkflows(page) {
  const sidebarButton = page.locator(WORKSPACEKIT_SIDEBAR_SELECTOR).first();
  await sidebarButton.waitFor({ state: "visible", timeout: 45_000 });
  if (!(await sidebarButton.evaluate((el) => el.classList.contains("side-bar-button-selected")))) {
    await sidebarButton.click();
  }
  await page.waitForSelector('[data-workspace2-module-id="workflows"]', { timeout: 15_000 });
  await page.locator('[data-workspace2-module-id="workflows"]').click();
  await page.waitForSelector(".workspace2-module-frame.workspace2-workflow-blueprint", { timeout: 15_000 });
}

async function openTestWorkflow(page) {
  await page.evaluate(async () => window.app.extensionManager.workflow.syncWorkflows?.());
  await openWorkspaceWorkflows(page);

  const folderRow = page.locator('[data-workspace2-item-path="__WK_TEST__"]');
  if (await folderRow.count()) {
    const disclosure = folderRow.locator(".workspace2-disclosure");
    if (await disclosure.count() && !(await disclosure.evaluate((el) => el.classList.contains("is-open")))) {
      await disclosure.click();
    }
  }

  const browseRow = page.locator(`[data-workspace2-item-path="${TEST_PATH}"]`);
  await browseRow.waitFor({ state: "visible", timeout: 15_000 });
  await browseRow.click();
  await page.waitForFunction(
    (officialPath) => window.app?.extensionManager?.workflow?.activeWorkflow?.path === officialPath,
    OFFICIAL_PATH,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(350);
}

async function utilityState(page) {
  return page.evaluate(() => {
    const wanted = new Set(["WKVideoResolution", "WKVideoDuration"]);
    return (window.app?.graph?._nodes || [])
      .filter((node) => wanted.has(node.type))
      .map((node) => ({
        type: node.type,
        values: Object.fromEntries((node.widgets || []).map((widget) => [widget.name, widget.value])),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  });
}

async function cleanup(page) {
  try {
    await page.evaluate(async (officialPath) => {
      const store = window.app?.extensionManager?.workflow;
      const workflow = store?.getWorkflowByPath?.(officialPath);
      if (workflow && store?.activeWorkflow === workflow) {
        await window.app?.loadGraphData?.();
      }
      if (workflow && store?.openWorkflows?.includes?.(workflow)) {
        await store.closeWorkflow?.(workflow);
      }
    }, OFFICIAL_PATH);
  } catch {}

  try {
    const moved = await postJson(page, "/workspace2/trash/move", { path: TEST_PATH });
    if (moved?.item?.id) {
      await postJson(page, "/workspace2/trash/system_delete", { trash_id: moved.item.id });
    }
  } catch {}
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => {
  if (/workspacekit|workspace2|WKResolutionPreset|WKVideoResolution|WKVideoDuration|WKFrameCount/i.test(error.message || "")) {
    errors.push(error.message);
  }
});

try {
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
  await waitForApp(page);

  await postJson(page, "/workspace2/workflow/save", { path: TEST_PATH, workflow: EMPTY_GRAPH });
  await openTestWorkflow(page);

  await page.evaluate(() => {
    const app = window.app;
    const workflow = app?.extensionManager?.workflow?.activeWorkflow;
    const tracker = workflow?.changeTracker;
    const resolution = window.LiteGraph.createNode("WKVideoResolution");
    const duration = window.LiteGraph.createNode("WKVideoDuration");
    if (!resolution || !duration) throw new Error("Utility nodes unavailable");

    resolution.pos = [80, 100];
    duration.pos = [500, 100];
    resolution.widgets.find((w) => w.name === "aspect_ratio").value = "▯ 2:3";
    resolution.widgets.find((w) => w.name === "megapixels").value = 2.0;
    resolution.widgets.find((w) => w.name === "multiple").value = 32;
    resolution.widgets.find((w) => w.name === "scale").value = "8.0";
    duration.widgets.find((w) => w.name === "profile").value = "MiniMax H3 Local · 17n+5";
    duration.widgets.find((w) => w.name === "duration_seconds").value = 15;

    tracker?.beforeChange?.();
    app.graph.add(resolution);
    app.graph.add(duration);
    tracker?.afterChange?.();
  });

  const topbarSave = page.locator(".workspacekit-topbar-save-button");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === true, null, { timeout: 15_000 });
  await topbarSave.click();
  await page.waitForFunction(() => window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === false, null, { timeout: 20_000 });
  await page.waitForTimeout(250);

  assert.equal(await topbarSave.getAttribute("data-dirty"), "false", "saved utility workflow must be clean");
  const beforeReload = await utilityState(page);
  assert.equal(beforeReload.length, 2);

  await page.reload({ waitUntil: "load", timeout: 45_000 });
  await waitForApp(page);
  if (await page.evaluate((path) => window.app?.extensionManager?.workflow?.activeWorkflow?.path !== path, OFFICIAL_PATH)) {
    await openTestWorkflow(page);
  }
  await page.waitForTimeout(350);

  const afterReload = await utilityState(page);
  assert.deepEqual(afterReload, beforeReload, "utility nodes and values must survive persisted reload");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false", "reloaded saved utility workflow must remain clean");
  assert.deepEqual(errors, []);

  console.log(JSON.stringify({ testPath: TEST_PATH, beforeReload, afterReload, dirty: false }, null, 2));
} finally {
  await cleanup(page);
  await context.close();
  await browser.close();
}
