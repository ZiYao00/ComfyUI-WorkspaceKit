import assert from "node:assert/strict";
import { createWorkflowOpenState } from "../entry/workflows/open-state.js";

class FakeApi {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }

  dispatch(type, detail = undefined) {
    const event = { detail };
    for (const callback of [...(this.listeners.get(type) || [])]) {
      callback(event);
    }
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const originalWindow = globalThis.window;
let timerId = 0;
globalThis.window = {
  setTimeout(callback, delay) {
    if (delay === 0) return setTimeout(callback, 0);
    // Load-normalization timers are irrelevant to this unit contract. Keep
    // them inert so they cannot rewrite a baseline halfway through a case.
    timerId += 1;
    return timerId;
  },
  clearTimeout(handle) {
    if (typeof handle === "object") clearTimeout(handle);
  },
};

try {
  const api = new FakeApi();
  let activeWorkflow = {
    path: "workflows/demo.json",
    isModified: false,
  };
  let graph = {
    nodes: [
      { id: 1, type: "CLIPTextEncode", widgets_values: ["hello"] },
      { id: 2, type: "KSampler", widgets_values: [123, "increment"] },
    ],
    extra: { ds: { scale: 1, offset: [0, 0] } },
    links: [],
    floatingLinks: [],
    reroutes: [],
    groups: [],
    definitions: {},
    subgraphs: [],
  };

  const state = {
    isOfficialRoot: true,
    workflowDirty: false,
    workflowSnapshot: "",
    officialWorkflowSnapshots: new Map(),
    officialWorkflowDirtyPaths: new Set(),
    workflowLoadInProgress: false,
    selectedPath: "",
    workflowDirtyCheckTimer: null,
    officialWorkflowRenderTimer: null,
    editingPath: "",
    workflowRenameInProgress: false,
    officialWorkflowRenderPending: false,
    workflowsTarget: null,
  };
  const workspaceState = { activeModule: "nodes" };

  // ComfyUI's ChangeTracker registers its promptQueued listener before
  // extensions. Model that ordering: it captures the changed graph and emits a
  // nested graphChanged before WorkspaceKit receives promptQueued.
  api.addEventListener("promptQueued", () => {
    api.dispatch("graphChanged", graph);
  });

  const openState = createWorkflowOpenState({
    app: { api },
    state,
    workspaceState,
    serializeCurrentWorkflow: () => graph,
    getActiveOfficialWorkflow: () => activeWorkflow,
    getOfficialWorkflowStore: () => ({ openWorkflows: [activeWorkflow] }),
    subscribeOfficialWorkflowStore: () => () => {},
    relativeWorkflowPathFromOfficial: (path) => String(path || "").replace(/^workflows\//, ""),
    renderWorkflowsPanel: () => {},
  });

  openState.setCleanState(graph, "demo.json");
  openState.setupDirtyTracking();

  // Pure queue-time seed mutation: started clean, so the execution-only value
  // becomes the effective clean baseline before graphChanged is observed.
  api.dispatch("promptQueueing", { requestId: 1, batchCount: 1 });
  graph = clone(graph);
  graph.nodes[1].widgets_values[0] = 124;
  api.dispatch("promptQueued", { requestId: 1, batchCount: 1, number: 0 });
  await tick();
  assert.equal(openState.isOfficialWorkflowDirty(activeWorkflow), false, "run-only seed changes stay clean");

  // A real edit made before Run must remain dirty even if execution changes a
  // dynamic seed afterwards.
  graph = clone(graph);
  graph.nodes[0].widgets_values[0] = "manual prompt edit";
  api.dispatch("graphChanged", graph);
  await tick();
  assert.equal(openState.isOfficialWorkflowDirty(activeWorkflow), true);

  api.dispatch("promptQueueing", { requestId: 2, batchCount: 1 });
  graph = clone(graph);
  graph.nodes[1].widgets_values[0] = 125;
  api.dispatch("promptQueued", { requestId: 2, batchCount: 1, number: 0 });
  await tick();
  assert.equal(
    openState.isOfficialWorkflowDirty(activeWorkflow),
    true,
    "manual Prompt -> Run must never be reconciled back to clean",
  );

  // A queue that starts clean but sees a real graphChanged before promptQueued
  // is tainted. This models a user/third-party edit while authentication or a
  // queue request is still in flight.
  openState.setCleanState(graph, "demo.json");
  api.dispatch("promptQueueing", { requestId: 3, batchCount: 1 });
  graph = clone(graph);
  graph.nodes[0].widgets_values[0] = "edited while queueing";
  api.dispatch("graphChanged", graph);
  await tick();
  graph.nodes[1].widgets_values[0] = 126;
  api.dispatch("promptQueued", { requestId: 3, batchCount: 1, number: 0 });
  await tick();
  assert.equal(
    openState.isOfficialWorkflowDirty(activeWorkflow),
    true,
    "an intervening graph edit taints the queue transaction and fails closed",
  );

  // Rapid queue requests may overlap. The first execution reconciliation must
  // not taint the later request when its graphChanged matches the newly
  // advanced effective baseline.
  openState.setCleanState(graph, "demo.json");
  api.dispatch("promptQueueing", { requestId: 4, batchCount: 1 });
  api.dispatch("promptQueueing", { requestId: 5, batchCount: 1 });

  graph = clone(graph);
  graph.nodes[1].widgets_values[0] = 127;
  api.dispatch("promptQueued", { requestId: 4, batchCount: 1, number: 0 });
  await tick();
  assert.equal(openState.isOfficialWorkflowDirty(activeWorkflow), false);

  graph = clone(graph);
  graph.nodes[1].widgets_values[0] = 128;
  api.dispatch("promptQueued", { requestId: 5, batchCount: 1, number: 0 });
  await tick();
  assert.equal(openState.isOfficialWorkflowDirty(activeWorkflow), false, "rapid execution-only queues stay clean");

  // Older frontends without requestId cannot be proven safe. They must fall
  // back to ordinary dirty detection rather than guessing that a change was
  // execution-only.
  openState.setCleanState(graph, "demo.json");
  api.dispatch("promptQueueing", { batchCount: 1 });
  graph = clone(graph);
  graph.nodes[1].widgets_values[0] = 129;
  api.dispatch("promptQueued", { batchCount: 1, number: 0 });
  await tick();
  assert.equal(
    openState.isOfficialWorkflowDirty(activeWorkflow),
    true,
    "missing queue identity falls back to conservative dirty state",
  );

  console.log("workflow queue dirty-state contract passed");
} finally {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
}
