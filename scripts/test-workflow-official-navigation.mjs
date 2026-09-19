import assert from "node:assert/strict";
import {
  closeOfficialWorkflow,
  openOfficialWorkflowThroughService,
} from "../entry/workflows/official-adapter.js";

function workflow(path) {
  return { path, filename: path.split("/").at(-1) };
}

function createHarness({ open = ["workflows/A.json"], active = "workflows/A.json" } = {}) {
  const catalog = new Map([
    ["workflows/A.json", workflow("workflows/A.json")],
    ["workflows/B.json", workflow("workflows/B.json")],
    ["workflows/C.json", workflow("workflows/C.json")],
  ]);
  const listeners = new Set();
  const store = {
    openWorkflows: open.map((path) => catalog.get(path)),
    activeWorkflow: catalog.get(active),
    get modifiedWorkflows() {
      return [];
    },
    getWorkflowByPath(path) {
      return catalog.get(path) || null;
    },
    isActive(target) {
      return this.activeWorkflow?.path === target?.path;
    },
    createTemporary(_path, graphState) {
      const path = "workflows/Unsaved Workflow.json";
      const target = {
        ...workflow(path),
        isTemporary: true,
        isPersisted: false,
        isLoaded: true,
        activeState: graphState,
      };
      catalog.set(path, target);
      return target;
    },
    async openWorkflow(target) {
      if (!this.openWorkflows.some((entry) => entry?.path === target?.path)) {
        this.openWorkflows.push(target);
      }
      this.activate(target);
      return target;
    },
    openWorkflowsInBackground({ left = [], right = [] } = {}) {
      for (const path of [...left].reverse()) {
        if (!this.openWorkflows.some((entry) => entry?.path === path)) {
          const target = catalog.get(path);
          if (target) this.openWorkflows.unshift(target);
        }
      }
      for (const path of right) {
        if (!this.openWorkflows.some((entry) => entry?.path === path)) {
          const target = catalog.get(path);
          if (target) this.openWorkflows.push(target);
        }
      }
    },
    reorderWorkflows(from, to) {
      const [item] = this.openWorkflows.splice(from, 1);
      this.openWorkflows.splice(to, 0, item);
    },
    async closeWorkflow(target) {
      this.openWorkflows = this.openWorkflows.filter((entry) => entry?.path !== target?.path);
    },
    openedWorkflowIndexShift(shift) {
      const index = this.openWorkflows.findIndex((entry) => entry?.path === this.activeWorkflow?.path);
      if (index < 0 || !this.openWorkflows.length) return undefined;
      const next = (index + shift + this.openWorkflows.length) % this.openWorkflows.length;
      return this.openWorkflows[next];
    },
    $subscribe(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    activate(target) {
      this.activeWorkflow = target;
      for (const callback of [...listeners]) callback();
    },
  };

  const pending = [];
  const captured = [];
  const command = {
    execute(commandId) {
      assert.equal(commandId, "Workspace.NextOpenedWorkflow");
      const target = store.openedWorkflowIndexShift(1);
      captured.push(target?.path || "");
      return new Promise((resolve) => {
        pending.push({
          target,
          resolve() {
            if (target) store.activate(target);
            resolve();
          },
        });
      });
    },
  };

  return {
    app: {
      graph: {
        serialize: () => ({ version: 0.4, nodes: [], links: [], groups: [], extra: {} }),
      },
      extensionManager: { workflow: store, command },
    },
    store,
    catalog,
    captured,
    pending,
    paths: () => store.openWorkflows.filter(Boolean).map((entry) => entry.path),
  };
}

{
  const harness = createHarness({ open: [], active: null });
  const opening = openOfficialWorkflowThroughService(
    harness.app,
    harness.catalog.get("workflows/B.json"),
  );

  // The adapter first registers the already-painted canvas as an official
  // temporary tab, then routes B through the official Next command.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.store.activeWorkflow?.path, "workflows/Unsaved Workflow.json");
  assert.deepEqual(
    harness.paths(),
    ["workflows/Unsaved Workflow.json", "workflows/B.json"],
    "empty official startup must gain a temporary navigation anchor before routing the first persisted workflow",
  );
  assert.deepEqual(
    harness.captured,
    ["workflows/B.json"],
    "first persisted open from active=null must still be captured by the official command",
  );

  harness.pending[0].resolve();
  const result = await opening;
  assert.equal(result.opened, true);
  assert.equal(result.initializeCleanState, true);
  assert.equal(harness.store.activeWorkflow?.path, "workflows/B.json");
}

{
  const harness = createHarness({ open: [], active: "workflows/A.json" });
  const opening = openOfficialWorkflowThroughService(
    harness.app,
    harness.catalog.get("workflows/B.json"),
  );
  assert.deepEqual(
    harness.paths(),
    ["workflows/A.json", "workflows/B.json"],
    "an active workflow missing from openWorkflows must be re-anchored through the official background-tab API",
  );
  assert.deepEqual(harness.captured, ["workflows/B.json"]);
  harness.pending[0].resolve();
  assert.equal((await opening).opened, true);
}

{
  const harness = createHarness();
  const openB = openOfficialWorkflowThroughService(harness.app, harness.catalog.get("workflows/B.json"));
  assert.deepEqual(harness.paths(), ["workflows/A.json", "workflows/B.json"], "routing must restore visible tab order before the official load settles");
  assert.deepEqual(harness.captured, ["workflows/B.json"], "first request must synchronously capture B");

  const openC = openOfficialWorkflowThroughService(harness.app, harness.catalog.get("workflows/C.json"));
  assert.deepEqual(harness.paths(), ["workflows/A.json", "workflows/B.json", "workflows/C.json"], "second routing must also restore the normal tab order immediately");
  assert.deepEqual(harness.captured, ["workflows/B.json", "workflows/C.json"], "rapid requests must independently capture B then C without a WorkspaceKit load queue");

  harness.pending[0].resolve();
  const resultB = await openB;
  assert.equal(resultB.opened, true);
  assert.equal(resultB.initializeCleanState, true);
  assert.equal(harness.store.activeWorkflow.path, "workflows/B.json");

  harness.pending[1].resolve();
  const resultC = await openC;
  assert.equal(resultC.opened, true);
  assert.equal(resultC.initializeCleanState, true);
  assert.equal(harness.store.activeWorkflow.path, "workflows/C.json", "the last official request must finish as the active workflow");
  assert.deepEqual(harness.paths(), ["workflows/A.json", "workflows/B.json", "workflows/C.json"]);
}

{
  const harness = createHarness({ open: ["workflows/A.json", "workflows/B.json"] });
  const opening = openOfficialWorkflowThroughService(harness.app, harness.catalog.get("workflows/B.json"));
  assert.deepEqual(harness.captured, ["workflows/B.json"]);
  harness.pending[0].resolve();
  const result = await opening;
  assert.equal(result.opened, true);
  assert.equal(result.initializeCleanState, false, "revisiting an existing official tab must not reset its WK dirty baseline");
}

{
  const harness = createHarness();
  const result = await openOfficialWorkflowThroughService(harness.app, harness.catalog.get("workflows/A.json"));
  assert.deepEqual(result, {
    opened: true,
    initializeCleanState: false,
    reason: "already-active",
  });
  assert.deepEqual(harness.captured, [], "already-active workflow is an official no-op");
}

{
  const a = workflow("workflows/A.json");
  const b = workflow("workflows/B.json");
  let activeCloseCommands = 0;
  const store = {
    activeWorkflow: a,
    openWorkflows: [a, b],
    modifiedWorkflows: [],
    getWorkflowByPath(path) {
      return this.openWorkflows.find((entry) => entry.path === path) || null;
    },
    isActive(target) {
      return this.activeWorkflow?.path === target?.path;
    },
    openWorkflow: async () => {},
    async closeWorkflow(target) {
      this.openWorkflows = this.openWorkflows.filter((entry) => entry.path !== target.path);
      if (this.activeWorkflow?.path === target.path) this.activeWorkflow = null;
    },
  };
  const app = {
    extensionManager: {
      workflow: store,
      command: {
        async execute(commandId) {
          assert.equal(commandId, "Workspace.CloseWorkflow");
          activeCloseCommands += 1;
          await store.closeWorkflow(store.activeWorkflow);
        },
      },
    },
  };

  assert.equal(await closeOfficialWorkflow(app, a), true);
  assert.equal(activeCloseCommands, 1, "active close must delegate to the official Workspace.CloseWorkflow command");
  assert.deepEqual(store.openWorkflows.map((entry) => entry.path), ["workflows/B.json"]);
}

{
  const a = workflow("workflows/A.json");
  const b = workflow("workflows/B.json");
  let commandCalls = 0;
  const store = {
    activeWorkflow: a,
    openWorkflows: [a, b],
    modifiedWorkflows: [],
    getWorkflowByPath(path) {
      return this.openWorkflows.find((entry) => entry.path === path) || null;
    },
    isActive(target) {
      return this.activeWorkflow?.path === target?.path;
    },
    openWorkflow: async () => {},
    async closeWorkflow(target) {
      this.openWorkflows = this.openWorkflows.filter((entry) => entry.path !== target.path);
    },
  };
  const app = {
    extensionManager: {
      workflow: store,
      command: {
        async execute() {
          commandCalls += 1;
        },
      },
    },
  };

  assert.equal(await closeOfficialWorkflow(app, b), true);
  assert.equal(commandCalls, 0, "inactive close must not activate or reload the workflow just to detach its tab");
  assert.deepEqual(store.openWorkflows.map((entry) => entry.path), ["workflows/A.json"]);
}

console.log("official workflow navigation delegation contract passed");
