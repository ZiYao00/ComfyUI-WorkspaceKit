// Distinct official workflow A/B round-trip: shared node IDs must not
// leak WorkspaceKit groups between independently saved workflows.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.COMFY_BASE_URL || "http://127.0.0.1:8190/";
const prefix = "__WK_TEST__/wk-group-switch-" + Date.now();
const paths = { A: prefix + "-A.json", B: prefix + "-B.json" };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const created = [];
let succeeded = false;
const log = [];

const post = (path, workflow) => page.evaluate(async ({ path, workflow }) => {
  const r = await fetch("/workspace2/workflow/save", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, workflow }),
  });
  const body = await r.json();
  if (!r.ok || body?.ok === false) throw new Error("Test fixture save failed: " + JSON.stringify(body));
  return body;
}, { path, workflow });

async function selectWorkflow(path) {
  await page.evaluate(async () => window.app.extensionManager.workflow.syncWorkflows?.());
  const sidebar = page.locator('[aria-label="WorkspaceKit"], .workspace2-tab-button').first();
  await sidebar.waitFor({ state: "visible", timeout: 30_000 });
  if (!(await sidebar.evaluate(el => el.classList.contains("side-bar-button-selected")))) await sidebar.click();
  await page.locator('[data-workspace2-module-id="workflows"]').click();
  const folder = page.locator('[data-workspace2-item-path="__WK_TEST__"]');
  if (await folder.count()) {
    const disclosure = folder.locator(".workspace2-disclosure");
    if (await disclosure.count() && !(await disclosure.evaluate(el => el.classList.contains("is-open")))) {
      await disclosure.click();
    }
  }
  await page.locator('[data-workspace2-item-path="' + path + '"]').click();
  await page.waitForFunction(path => window.app?.extensionManager?.workflow?.activeWorkflow?.path === "workflows/" + path,
    path, { timeout: 30_000, polling: 150 });
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?._restoreReady), null, { timeout: 15_000 });
  const s = await page.evaluate(() => ({
    path: window.app?.extensionManager?.workflow?.activeWorkflow?.path,
    groups: Object.keys(window.Workspace2CanvasGroups?.groups || {}),
    extraIds: Object.keys(window.app.rootGraph?.extra?.xzgGroups || {}),
    overlayCount: document.querySelectorAll(".xzg-group-box").length,
  }));
  log.push(s);
  return s;
}

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.app?.rootGraph && window.Workspace2CanvasGroups?.initialized
    && window.Workspace2CanvasGroups?._restoreReady && window.app?.extensionManager?.workflow), null, {
    timeout: 65_000, polling: 250,
  });
  const fixture = await page.evaluate(async () => {
    const app = window.app, groups = window.Workspace2CanvasGroups;
    const graph = app.rootGraph;
    if (graph._nodes.length < 2) {
      for (const pos of [[150, 180], [500, 340]]) {
        const n = window.LiteGraph.createNode("Workspace2Title");
        if (!n) throw new Error("Cannot create test node");
        n.pos = pos; graph.add(n);
      }
    }
    for (const id of Object.keys(groups.groups)) groups.killGroup(id);
    groups.groups = {};
    groups.syncGroupsToExtra();
    app.canvas.deselectAllNodes?.();
    app.canvas.selectItems?.(graph._nodes.slice(0, 2));
    await groups.createGroupFromSelection();
    const id = Object.keys(groups.groups)[0];
    if (!id) throw new Error("Could not create test group");
    const A = structuredClone(graph.serialize());
    const B = structuredClone(A);
    B.extra ||= {};
    B.extra.xzgGroups = {};
    delete B._xzgGroups;
    for (const node of B.nodes || []) {
      delete node._xzgGroup;
      delete node._xzgGroupId;
      if (node.properties) delete node.properties._xzgGroup;
    }
    return { A, B, id };
  });
  assert.ok(fixture.A.extra.xzgGroups[fixture.id]);
  assert.equal(Object.keys(fixture.B.extra.xzgGroups).length, 0);
  await post(paths.A, fixture.A); created.push(paths.A);
  await post(paths.B, fixture.B); created.push(paths.B);

  for (const label of ["B", "A", "B", "A"]) {
    const actual = await selectWorkflow(paths[label]);
    assert.equal(actual.path, "workflows/" + paths[label]);
    assert.deepEqual(actual.groups, label === "A" ? [fixture.id] : [], label + " live groups");
    assert.deepEqual(actual.extraIds, label === "A" ? [fixture.id] : [], label + " graph groups");
    assert.equal(actual.overlayCount, label === "A" ? 1 : 0);
  }
  succeeded = true;
  console.log(JSON.stringify({ result: "PASS", testPaths: paths, groupId: fixture.id, transitions: log }, null, 2));
} finally {
  if (succeeded) {
    for (const path of created) {
      try {
        const moved = await page.evaluate(async path => {
          const r = await fetch("/workspace2/trash/move", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          return r.json();
        }, path);
        console.log("Fixture moved to trash:", path, moved?.ok === true);
      } catch (error) {
        console.warn("Fixture retained:", path, error.message);
      }
    }
  } else {
    console.warn("Test fixtures retained for diagnosis:", created.join(", "));
  }
  await context.close();
  await browser.close();
}
