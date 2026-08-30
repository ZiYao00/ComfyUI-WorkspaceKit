import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrlArgIndex = process.argv.indexOf("--base-url");
const BASE_URL = baseUrlArgIndex >= 0 && process.argv[baseUrlArgIndex + 1]
  ? `${process.argv[baseUrlArgIndex + 1].replace(/\/$/, "")}/`
  : "http://127.0.0.1:8190/";
const TEST_PATH = `__WK_TEST__/t058-save-sync-${Date.now()}.json`;
const OFFICIAL_PATH = `workflows/${TEST_PATH}`;
const WORKSPACEKIT_SIDEBAR_SELECTOR = [
  '[data-tab-id="workspace2"]',
  '[data-sidebar-tab-id="workspace2"]',
  '[aria-label="WorkspaceKit"]',
  '.workspace2-tab-button',
].join(', ');

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
    const trashId = moved?.item?.id;
    if (trashId) {
      await postJson(page, "/workspace2/trash/system_delete", { trash_id: trashId });
    }
  } catch {}
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
  await page.waitForFunction(() => Boolean(window.app?.extensionManager?.workflow), null, { timeout: 45_000 });

  await postJson(page, "/workspace2/workflow/save", { path: TEST_PATH, workflow: EMPTY_GRAPH });
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
  await page.waitForFunction((officialPath) => window.app?.extensionManager?.workflow?.activeWorkflow?.path === officialPath, OFFICIAL_PATH, { timeout: 20_000 });

  const openRow = page.locator(".workspace2-current-workflow").filter({
    has: page.locator(`.workspace2-current-workflow-info[title="${TEST_PATH}"]`),
  });
  await openRow.waitFor({ state: "visible", timeout: 15_000 });

  // Opening an official workflow intentionally re-captures its clean baseline
  // once after 300ms so late load-only normalization does not create a false
  // dirty marker. Mutate only after that settle window has passed.
  await page.waitForTimeout(450);

  await page.evaluate(() => {
    const graph = window.app.graph;
    const workflow = window.app?.extensionManager?.workflow?.activeWorkflow;
    const tracker = workflow?.changeTracker;
    const node = window.LiteGraph?.createNode?.("Workspace2Title");
    if (!node) throw new Error("Workspace2Title test node is unavailable");
    node.pos = [120, 120];
    tracker?.beforeChange?.();
    graph.add(node);
    tracker?.afterChange?.();
  });
  await page.waitForFunction(() => Boolean(window.app?.extensionManager?.workflow?.activeWorkflow?.isModified), null, { timeout: 15_000 });

  await page.waitForFunction((testPath) => {
    const row = [...document.querySelectorAll(".workspace2-current-workflow")]
      .find((item) => item.querySelector(`.workspace2-current-workflow-info[title="${testPath}"]`));
    return Boolean(row?.querySelector(".workspace2-current-workflow-dirty-dot"));
  }, TEST_PATH, { timeout: 15_000 });

  const topbarSave = page.locator(".workspacekit-topbar-save-button");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });
  const actionsBefore = await openRow.locator(".workspace2-actions button").count();
  assert.ok(actionsBefore >= 3, "dirty active workflow should include Save plus rename/close actions");

  await topbarSave.click();

  await page.waitForFunction((testPath) => {
    const row = [...document.querySelectorAll(".workspace2-current-workflow")]
      .find((item) => item.querySelector(`.workspace2-current-workflow-info[title="${testPath}"]`));
    return Boolean(row) && !row.querySelector(".workspace2-current-workflow-dirty-dot");
  }, TEST_PATH, { timeout: 20_000 });

  const actionsAfter = await openRow.locator(".workspace2-actions button").count();
  assert.equal(actionsAfter, actionsBefore - 1, "top-bar save should remove the Open-section Save action after the workflow becomes clean");
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false", "top-bar Save should also return to its clean treatment");
  assert.deepEqual(wkErrors, [], `Unexpected WorkspaceKit errors:\n${wkErrors.join("\n")}`);
  console.log(`T-058-R1 real-page save synchronization passed: ${TEST_PATH}`);
} finally {
  await cleanup(page);
  await context.close();
  await browser.close();
}
