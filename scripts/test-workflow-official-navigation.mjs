import assert from "node:assert/strict";
import {
  closeOfficialWorkflow,
  openOfficialWorkflowThroughService,
} from "../entry/workflows/official-adapter.js";

function workflow(path, { loaded = false } = {}) {
  return {
    path,
    filename: path.split("/").at(-1),
    isLoaded: loaded,
    activeState: loaded ? { id: path, nodes: [], links: [], groups: [], extra: {} } : null,
    loadCalls: 0,
    async load() {
      this.loadCalls += 1;
      this.isLoaded = true;
      this.activeState = { id: path, nodes: [], links: [], groups: [], extra: {} };
      return this;
    },
  };
}

function createHarness({
  open = ["workflows/A.json"],
  active = "workflows/A.json",
  failPath = "",
} = {}) {
  const catalog = new Map([
    ["workflows/A.json", workflow("workflows/A.json", { loaded: true })],
    ["workflows/B.json", workflow("workflows/B.json")],
    ["workflows/C.json", workflow("workflows/C.json")],
  ]);

  const store = {
    openWorkflows: open.map((path) => catalog.get(path)).filter(Boolean),
    activeWorkflow: active ? catalog.get(active) : null,
    modifiedWorkflows: [],
    getWorkflowByPath(path) {
      return catalog.get(path) || null;
    },
    isActive(target) {
      return this.activeWorkflow?.path === target?.path;
    },
    // Store.openWorkflow is intentionally not the canvas transition API. Any
    // use here means the adapter regressed to the misleading public store call.
    async openWorkflow() {
      throw new Error("store.openWorkflow must not drive WorkspaceKit switching");
    },
    openWorkflowsInBackground() {
      throw new Error("legacy background-tab bridge must not run");
    },
    reorderWorkflows() {
      throw new Error("legacy tab-reorder bridge must not run");
    },
    async closeWorkflow(target) {
      this.openWorkflows = this.openWorkflows.filter((entry) => entry?.path !== target?.path);
      if (this.activeWorkflow?.path === target?.path) this.activeWorkflow = null;
    },
  };

  const loadCalls = [];
  const app = {
    extensionManager: {
      workflow: store,
      command: {
        async execute(commandId) {
          if (commandId === "Workspace.CloseWorkflow") {
            await store.closeWorkflow(store.activeWorkflow);
            return;
          }
          throw new Error("legacy navigation command must not run: " + commandId);
        },
      },
    },
    async loadGraphData(data, clean, restoreView, target, options) {
      loadCalls.push({ data, clean, restoreView, target, options });
      if (target?.path === failPath) return false;
      if (!store.openWorkflows.some((entry) => entry?.path === target?.path)) {
        store.openWorkflows.push(target);
      }
      store.activeWorkflow = target;
      return target;
    },
  };

  return { app, store, catalog, loadCalls };
}

{
  const harness = createHarness();
  const result = await openOfficialWorkflowThroughService(
    harness.app,
    harness.catalog.get("workflows/A.json"),
  );
  assert.deepEqual(result, {
    opened: true,
    initializeCleanState: false,
    reason: "already-active",
  });
  assert.equal(harness.loadCalls.length, 0, "already-active official workflow must be a no-op");
}

{
  const harness = createHarness();
  const target = harness.catalog.get("workflows/B.json");
  const result = await openOfficialWorkflowThroughService(harness.app, target);

  assert.equal(target.loadCalls, 1, "cold official workflow must load its ComfyWorkflow object once");
  assert.equal(harness.loadCalls.length, 1);
  assert.equal(harness.loadCalls[0].target, target);
  assert.equal(harness.loadCalls[0].clean, true);
  assert.equal(harness.loadCalls[0].restoreView, true);
  assert.deepEqual(harness.loadCalls[0].options, {
    checkForRerouteMigration: false,
    deferWarnings: false,
    skipAssetScans: false,
    silentAssetErrors: false,
  });
  assert.deepEqual(result, {
    opened: true,
    initializeCleanState: true,
    reason: "opened",
  });
  assert.equal(harness.store.activeWorkflow, target);
}

{
  const harness = createHarness({ open: ["workflows/A.json", "workflows/B.json"] });
  const target = harness.catalog.get("workflows/B.json");
  await target.load();
  target.loadCalls = 0;

  const result = await openOfficialWorkflowThroughService(harness.app, target);
  assert.equal(target.loadCalls, 0, "warm switch must reuse the loaded official workflow state");
  assert.equal(harness.loadCalls.length, 1);
  assert.equal(harness.loadCalls[0].options.skipAssetScans, true, "warm switch must mirror native asset-scan skipping");
  assert.equal(harness.loadCalls[0].options.silentAssetErrors, true);
  assert.equal(result.opened, true);
  assert.equal(result.initializeCleanState, false, "revisiting an open tab must retain its WorkspaceKit baseline");
}

{
  const harness = createHarness({ failPath: "workflows/B.json" });
  const previous = harness.catalog.get("workflows/A.json");
  const target = harness.catalog.get("workflows/B.json");
  const result = await openOfficialWorkflowThroughService(harness.app, target);

  assert.deepEqual(result, {
    opened: false,
    initializeCleanState: false,
    reason: "official-load-failed",
  });
  assert.equal(harness.loadCalls.length, 2, "failed target load must repaint the retained official workflow");
  assert.equal(harness.loadCalls[0].target, target);
  assert.equal(harness.loadCalls[1].target, previous);
  assert.equal(harness.loadCalls[1].options.skipAssetScans, true);
  assert.equal(harness.store.activeWorkflow, previous);
}

{
  const harness = createHarness();
  delete harness.app.loadGraphData;
  const result = await openOfficialWorkflowThroughService(
    harness.app,
    harness.catalog.get("workflows/B.json"),
  );
  assert.equal(result.opened, false);
  assert.equal(result.reason, "official-load-unavailable");
}

{
  const harness = createHarness({ open: ["workflows/A.json", "workflows/B.json"] });
  const a = harness.catalog.get("workflows/A.json");
  assert.equal(await closeOfficialWorkflow(harness.app, a), true);
  assert.deepEqual(harness.store.openWorkflows.map((entry) => entry.path), ["workflows/B.json"]);
}

{
  const harness = createHarness({ open: ["workflows/A.json", "workflows/B.json"] });
  const b = harness.catalog.get("workflows/B.json");
  let commandCalls = 0;
  harness.app.extensionManager.command.execute = async () => { commandCalls += 1; };
  assert.equal(await closeOfficialWorkflow(harness.app, b), true);
  assert.equal(commandCalls, 0, "inactive close must stay a lightweight official Store detach");
  assert.deepEqual(harness.store.openWorkflows.map((entry) => entry.path), ["workflows/A.json"]);
}

console.log("official workflow direct-native navigation contract passed");
