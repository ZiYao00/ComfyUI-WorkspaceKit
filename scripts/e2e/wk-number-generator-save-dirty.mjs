import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const TEST_PATH = `__WK_TEST__/wk-number-generator-save-dirty-${Date.now()}.json`;
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
const promptBodies = [];

page.on("pageerror", (error) => {
  if (/workspacekit|workspace2|WKIntegerGenerator|wk_number_control/i.test(error.message || "")) {
    wkErrors.push(error.message);
  }
});
page.on("console", (message) => {
  if (message.type() === "error" && /workspacekit|workspace2|WKIntegerGenerator|wk_number_control/i.test(message.text())) {
    wkErrors.push(message.text());
  }
});
page.on("request", (request) => {
  if (request.method() !== "POST") return;
  if (new URL(request.url()).pathname.endsWith("/prompt")) {
    promptBodies.push(request.postDataJSON());
  }
});

try {
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
  await page.waitForFunction(() => Boolean(
    window.app?.extensionManager?.workflow
      && window.app?.graph
      && window.LiteGraph?.createNode
  ), null, { timeout: 45_000 });

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
  await page.waitForFunction(
    (officialPath) => window.app?.extensionManager?.workflow?.activeWorkflow?.path === officialPath,
    OFFICIAL_PATH,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(450);

  const topbarSave = page.locator(".workspacekit-topbar-save-button");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });

  const openRow = page.locator(".workspace2-current-workflow").filter({
    has: page.locator(`.workspace2-current-workflow-info[title="${TEST_PATH}"]`),
  });
  await openRow.waitFor({ state: "visible", timeout: 15_000 });

  await page.evaluate(() => {
    const app = window.app;
    const workflow = app?.extensionManager?.workflow?.activeWorkflow;
    const tracker = workflow?.changeTracker;
    const generator = window.LiteGraph.createNode("WKIntegerGenerator");
    const showText = window.LiteGraph.createNode("ShowText|pysssss");
    if (!generator || !showText) throw new Error("Required queue-probe nodes are unavailable");
    generator.pos = [100, 100];
    showText.pos = [420, 100];
    generator.widgets.find((item) => item.name === "value").value = 0;
    generator.widgets.find((item) => item.name === "control_before_generate").value = "increment";
    tracker?.beforeChange?.();
    app.graph.add(generator);
    app.graph.add(showText);
    generator.connect(1, showText, 0);
    tracker?.afterChange?.();
  });

  await page.waitForFunction(() => window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === true, null, { timeout: 15_000 });
  await topbarSave.click();
  await page.waitForFunction(() => window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === false, null, { timeout: 20_000 });
  await page.waitForTimeout(250);
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false", "saved number-generator workflow should start clean");
  assert.equal(await openRow.locator(".workspace2-current-workflow-dirty-dot").count(), 0, "saved workflow should have no dirty dot");

  const promptStart = promptBodies.length;
  await page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.app.api.removeEventListener("promptQueued", onQueued);
      reject(new Error("Timed out waiting for promptQueued"));
    }, 20_000);
    function onQueued(event) {
      clearTimeout(timeout);
      window.app.api.removeEventListener("promptQueued", onQueued);
      resolve(event.detail);
    }
    window.app.api.addEventListener("promptQueued", onQueued);
    window.app.queuePrompt(0);
  }));
  await page.waitForTimeout(150);

  const submittedValues = promptBodies.slice(promptStart)
    .map((body) => Object.values(body.prompt || {}).find((item) => item.class_type === "WKIntegerGenerator")?.inputs?.value)
    .filter((value) => value !== undefined);

  assert.deepEqual(submittedValues, [1], "first saved-workflow queue should submit the incremented value");
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false", "queue-time number update must not mark saved workflow dirty");
  assert.equal(await openRow.locator(".workspace2-current-workflow-dirty-dot").count(), 0, "queue-time number update must not add dirty dot");
  assert.deepEqual(wkErrors, [], `Unexpected WorkspaceKit errors:\n${wkErrors.join("\n")}`);

  console.log(JSON.stringify({ testPath: TEST_PATH, submittedValues, dirty: false }, null, 2));
} finally {
  await cleanup(page);
  await context.close();
  await browser.close();
}
