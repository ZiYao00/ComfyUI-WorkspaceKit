// 8190 real official Save -> disk -> refresh -> official Open regression.
// Creates only a uniquely named disposable test workflow; never overwrites a user file.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.COMFY_BASE_URL || "http://127.0.0.1:8190/";
const TEST_PATH = "__WK_TEST__/wk-group-official-save-" + Date.now() + ".json";
const OFFICIAL_PATH = "workflows/" + TEST_PATH;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let created = false;
let passed = false;

async function requestJson(url, body) {
  return page.evaluate(async ({ url, body }) => {
    const opts = body === undefined ? undefined : {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const res = await fetch(url, opts);
    const response = await res.json();
    if (!res.ok || response?.ok === false) throw new Error(JSON.stringify({ status: res.status, response }));
    return response;
  }, { url, body });
}

async function waitForRuntime() {
  try {
    await page.waitForFunction(() => {
      const app = window.app, groups = window.Workspace2CanvasGroups;
      return Boolean(app?.extensionManager?.workflow && app?.rootGraph
        && groups?.initialized && groups?.overlay);
    }, null, { timeout: 45_000, polling: 250 });
  } catch (error) {
    console.error("Startup snapshot:", JSON.stringify(await page.evaluate(() => ({
      app: Boolean(window.app), graph: Boolean(window.app?.rootGraph),
      nodes: window.app?.rootGraph?._nodes?.length ?? -1,
      groupsLoaded: Boolean(window.Workspace2CanvasGroups),
      initialized: Boolean(window.Workspace2CanvasGroups?.initialized),
      restoreReady: Boolean(window.Workspace2CanvasGroups?._restoreReady),
      active: window.app?.extensionManager?.workflow?.activeWorkflow?.path || "",
    }))));
    throw error;
  }
}

async function openFixture() {
  await page.evaluate(async () => window.app.extensionManager.workflow.syncWorkflows?.());
  const sidebar = page.locator('[aria-label="WorkspaceKit"], .workspace2-tab-button').first();
  await sidebar.waitFor({ state: "visible", timeout: 35_000 });
  if (!(await sidebar.evaluate(el => el.classList.contains("side-bar-button-selected")))) await sidebar.click();
  const workflowsTab = page.locator('[data-workspace2-module-id="workflows"]');
  await workflowsTab.waitFor({ state: "visible", timeout: 20_000 });
  await workflowsTab.click();
  const folder = page.locator('[data-workspace2-item-path="__WK_TEST__"]');
  if (await folder.count()) {
    const disclosure = folder.locator(".workspace2-disclosure");
    if (await disclosure.count() && !(await disclosure.evaluate(el => el.classList.contains("is-open")))) {
      await disclosure.click();
    }
  }
  const row = page.locator('[data-workspace2-item-path="' + TEST_PATH + '"]');
  await row.waitFor({ state: "visible", timeout: 20_000 });
  await row.click();
  await page.waitForFunction(
    path => window.app?.extensionManager?.workflow?.activeWorkflow?.path === path,
    OFFICIAL_PATH, { timeout: 35_000 });
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?._restoreReady), null, { timeout: 15_000 });
}

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForRuntime();
  const cleanWorkflow = await page.evaluate(() => {
    const graph = window.app.rootGraph;
    if (graph._nodes.length < 2) {
      const first = window.LiteGraph.createNode("Workspace2Title");
      const second = window.LiteGraph.createNode("Workspace2Title");
      if (!first || !second) throw new Error("Unable to create fixture nodes");
      first.pos = [160, 180];
      second.pos = [490, 320];
      graph.add(first);
      graph.add(second);
    }
    const source = graph.serialize();
    const workflow = JSON.parse(JSON.stringify(source));
    workflow.extra ||= {};
    workflow.extra.xzgGroups = {};
    delete workflow._xzgGroups;
    for (const node of workflow.nodes || []) {
      delete node._xzgGroupId;
      delete node._xzgGroup;
      if (node.properties) delete node.properties._xzgGroup;
    }
    return workflow;
  });
  await requestJson("/workspace2/workflow/save", { path: TEST_PATH, workflow: cleanWorkflow });
  created = true;
  await openFixture();
  await page.waitForTimeout(450);

  const beforeSave = await page.evaluate(async () => {
    const app = window.app, groups = window.Workspace2CanvasGroups;
    if (Object.keys(groups.groups || {}).length !== 0) throw new Error("Fixture unexpectedly has groups");
    app.canvas.deselectAllNodes?.();
    app.canvas.selectItems?.(app.graph._nodes.slice(0, 2));
    await groups.createGroupFromSelection();
    const id = Object.keys(groups.groups)[0];
    if (!id) throw new Error("Group creation failed");
    groups.groups[id].title = "WK official Save F5";
    groups.syncGroupsToExtra();
    app.graph.change?.();
    return { id, title: groups.groups[id].title, count: Object.keys(app.graph.extra?.xzgGroups || {}).length,
      path: app.extensionManager.workflow.activeWorkflow?.path };
  });
  assert.equal(beforeSave.path, OFFICIAL_PATH);
  assert.equal(beforeSave.count, 1);
  await page.waitForFunction(() => Boolean(window.app?.extensionManager?.workflow?.activeWorkflow?.isModified),
    null, { timeout: 12_000 });

  const saveButton = page.locator(".workspacekit-topbar-save-button");
  await saveButton.waitFor({ state: "visible", timeout: 20_000 });
  await saveButton.click();
  await page.waitForFunction(() => !window.app?.extensionManager?.workflow?.activeWorkflow?.isModified,
    null, { timeout: 20_000 });

  const disk = await requestJson("/workspace2/workflow/read?path=" + encodeURIComponent(TEST_PATH));
  const stored = disk.workflow?.extra?.xzgGroups?.[beforeSave.id] || null;
  assert.ok(stored, "Official Save must persist the group to disk");
  assert.equal(stored.title, beforeSave.title, "Official Save must persist its title");

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForRuntime();
  await openFixture();
  await page.waitForFunction(id => Boolean(window.Workspace2CanvasGroups?.groups?.[id]),
    beforeSave.id, { timeout: 15_000 });
  const afterReload = await page.evaluate(id => {
    const groups = window.Workspace2CanvasGroups;
    return { id, title: groups.groups[id]?.title, count: Object.keys(groups.groups).length,
      graphCount: Object.keys(window.app.graph.extra?.xzgGroups || {}).length,
      domCount: document.querySelectorAll(".xzg-group-box").length,
      path: window.app.extensionManager.workflow.activeWorkflow?.path };
  }, beforeSave.id);
  assert.equal(afterReload.path, OFFICIAL_PATH);
  assert.equal(afterReload.title, beforeSave.title);
  assert.equal(afterReload.count, 1);
  assert.equal(afterReload.graphCount, 1);
  assert.equal(afterReload.domCount, 1);

  // A real rename must enter official ChangeTracker history, and undo/redo
  // must restore the loaded workflow snapshot rather than outgoing UI state.
  await page.evaluate(id => {
    const groups = window.Workspace2CanvasGroups;
    const label = groups.groupEls[id]?.querySelector(".xzg-group-title-text");
    if (!label) throw new Error("Rename control not available");
    groups.startRename(id, label);
  }, beforeSave.id);
  const renameInput = page.locator(".xzg-group-title-input");
  await renameInput.waitFor({ state: "visible", timeout: 12_000 });
  await renameInput.fill("WK renamed via UI");
  await renameInput.press("Enter");
  await page.waitForFunction(() => Boolean(window.app?.extensionManager?.workflow?.activeWorkflow?.isModified),
    null, { timeout: 12_000 });
  const renamed = await page.evaluate(id => window.Workspace2CanvasGroups.groups[id]?.title, beforeSave.id);
  assert.equal(renamed, "WK renamed via UI");

  await page.evaluate(async () => {
    const tracker = window.app.extensionManager.workflow.activeWorkflow?.changeTracker;
    if (!tracker?.undo) throw new Error("Official undo not available");
    await tracker.undo();
  });
  await page.waitForFunction(({ id, title }) => window.Workspace2CanvasGroups?.groups?.[id]?.title === title,
    { id: beforeSave.id, title: beforeSave.title }, { timeout: 15_000 });
  await page.evaluate(async () => {
    const tracker = window.app.extensionManager.workflow.activeWorkflow?.changeTracker;
    if (!tracker?.redo) throw new Error("Official redo not available");
    await tracker.redo();
  });
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });

  // The WK -> native conversion is an official history entry. Undo must
  // restore WK groups, redo must show only native groups, and the next undo
  // must restore the same WK ID and title without leaking a DOM overlay.
  const native = await page.evaluate(() => window.Workspace2CanvasGroups.convertCurrentWorkflowToNative());
  assert.equal(native.converted, 1);
  await page.waitForFunction(() =>
    window.app?.rootGraph?.extra?.workspacekit?.groupRepresentation === "native"
    && Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 0
    && (window.app?.rootGraph?._groups?.length || 0) === 1,
    null, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.redo());
  await page.waitForFunction(() =>
    window.app?.rootGraph?.extra?.workspacekit?.groupRepresentation === "native"
    && Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 0,
    null, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });

  // Ungroup is separate from Delete; it must also create an official
  // snapshot and undo/redo cleanly before testing explicit deletion.
  const ungrouped = await page.evaluate(id => {
    const groups = window.Workspace2CanvasGroups;
    groups.selectOnlyGroup(id);
    return groups.ungroupSelection();
  }, beforeSave.id);
  assert.equal(ungrouped, true);
  await page.waitForFunction(() => Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 0,
    null, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.redo());
  await page.waitForFunction(() => Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 0,
    null, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });

  // Delete -> undo -> redo -> official Save -> full reload. Intentional empty
  // canonical group metadata must win over stale node-level migration fields.
  const deleted = await page.evaluate(id => {
    const groups = window.Workspace2CanvasGroups;
    if (!groups.removeGroup(id)) return null;
    return { groups: Object.keys(groups.groups).length,
      extra: Object.keys(window.app.rootGraph.extra?.xzgGroups || {}).length };
  }, beforeSave.id);
  assert.deepEqual(deleted, { groups: 0, extra: 0 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
  await page.waitForFunction(id => window.Workspace2CanvasGroups?.groups?.[id]?.title === "WK renamed via UI",
    beforeSave.id, { timeout: 15_000 });
  await page.evaluate(async () => window.app.extensionManager.workflow.activeWorkflow.changeTracker.redo());
  await page.waitForFunction(() => Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 0,
    null, { timeout: 15_000 });

  await page.waitForFunction(() => Boolean(window.app?.extensionManager?.workflow?.activeWorkflow?.isModified),
    null, { timeout: 12_000 });
  await saveButton.click();
  await page.waitForFunction(() => !window.app?.extensionManager?.workflow?.activeWorkflow?.isModified,
    null, { timeout: 20_000 });
  const emptyDisk = await requestJson("/workspace2/workflow/read?path=" + encodeURIComponent(TEST_PATH));
  assert.equal(Object.keys(emptyDisk.workflow?.extra?.xzgGroups || {}).length, 0,
    "Official Save of deletion must persist an explicitly empty group map");

  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForRuntime();
  await openFixture();
  const afterDeleteRefresh = await page.evaluate(() => ({
    groups: Object.keys(window.Workspace2CanvasGroups?.groups || {}).length,
    graphGroups: Object.keys(window.app?.rootGraph?.extra?.xzgGroups || {}).length,
    dom: document.querySelectorAll(".xzg-group-box").length,
  }));
  assert.deepEqual(afterDeleteRefresh, { groups: 0, graphGroups: 0, dom: 0 });

  passed = true;
  console.log(JSON.stringify({ testPath: TEST_PATH, beforeSave,
    diskGroupCount: Object.keys(disk.workflow.extra.xzgGroups).length,
    afterReload, renamed, deleted, afterDeleteRefresh, result: "PASS" }, null, 2));
} finally {
  // Only move the uniquely created test file to WK trash after complete PASS.
  // A failed assertion keeps the fixture for diagnosis; no permanent deletion.
  if (created && passed) {
    try {
      const moved = await requestJson("/workspace2/trash/move", { path: TEST_PATH });
      console.log("Test fixture moved to trash:", Boolean(moved?.ok), TEST_PATH);
    } catch (error) {
      console.warn("Test fixture retained:", TEST_PATH, error.message);
    }
  }
  await context.close();
  await browser.close();
}
