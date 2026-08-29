import assert from "node:assert/strict";

import { calculateLayoutCommand } from "../entry/layout/command-registry.js";
import { collectLayoutSelection } from "../entry/layout/selection-service.js";
import { applyLayoutChangeSet } from "../entry/layout/transaction.js";

function makeHarness() {
  const outside = { id: 1, pos: [100, 0], size: [100, 50], flags: {} };
  const member = { id: 2, pos: [320, 20], size: [50, 50], flags: {} };
  const group = {
    id: "g1",
    title: "Group",
    nodeIds: [2],
    bounds: { x: 300, y: 0, w: 200, h: 100 },
  };
  let before = 0;
  let after = 0;
  let graphChanges = 0;
  let syncs = 0;
  const app = {
    graph: {
      _nodes: [outside, member],
      setDirtyCanvas() {},
      change() { graphChanges += 1; },
    },
    canvas: {
      selectedItems: new Set([outside, member]),
      setDirty() {},
    },
    extensionManager: {
      setting: { get: () => false },
      workflow: {
        activeWorkflow: {
          changeTracker: {
            beforeChange() { before += 1; },
            afterChange() { after += 1; },
          },
        },
      },
    },
  };
  const controller = {
    _nativeRepresentation: false,
    _suspendMembershipSync: false,
    selectedGroupIds: new Set(["g1"]),
    groups: { g1: group },
    groupEls: {},
    syncGroupsToExtra() { syncs += 1; },
  };
  const target = { Workspace2CanvasGroups: controller };
  return {
    app, target, controller, group, outside, member,
    counters: () => ({ before, after, graphChanges, syncs }),
  };
}

{
  const harness = makeHarness();
  const selection = collectLayoutSelection(harness.app, { target: harness.target });
  assert.equal(selection.selectedCount, 2);
  assert.deepEqual(selection.targets.map((item) => item.kind).sort(), ["node", "workspacekit-group"]);
  assert.equal(selection.runtimeNodesById.has("1"), true);
  assert.equal(selection.runtimeNodesById.has("2"), false);
  assert.equal(selection.groupControlledNodeIds.has("2"), true);

  const changeSet = calculateLayoutCommand("workspacekit.layout.align.left", selection);
  assert.equal(changeSet.ok, true);
  assert.equal(changeSet.changes.length, 1);
  assert.equal(changeSet.changes[0].kind, "workspacekit-group");
  assert.equal(changeSet.changes[0].to.x, 100);

  const applied = applyLayoutChangeSet({
    app: harness.app,
    selection,
    changeSet,
    target: harness.target,
  });
  assert.equal(applied.ok, true);
  assert.equal(harness.group.bounds.x, 100);
  assert.equal(harness.member.pos[0], 120);
  assert.equal(harness.outside.pos[0], 100);
  assert.deepEqual(harness.counters(), { before: 1, after: 1, graphChanges: 1, syncs: 1 });
}

{
  const harness = makeHarness();
  harness.outside.setSize = () => {
    throw new Error("injected resize failure");
  };
  const selection = collectLayoutSelection(harness.app, { target: harness.target });
  const changeSet = {
    ok: true,
    operation: "injected-rollback",
    changes: [
      {
        id: "workspacekit-group:g1",
        sourceId: "g1",
        kind: "workspacekit-group",
        from: { x: 300, y: 0, width: 200, height: 100 },
        to: { x: 100, y: 0, width: 200, height: 100 },
      },
      {
        id: "node:1",
        sourceId: "1",
        kind: "node",
        from: { x: 100, y: 0, width: 100, height: 50 },
        to: { x: 100, y: 0, width: 150, height: 50 },
      },
    ],
  };
  const originalError = console.error;
  console.error = () => {};
  let result;
  try {
    result = applyLayoutChangeSet({
      app: harness.app,
      selection,
      changeSet,
      target: harness.target,
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(result.ok, false);
  assert.equal(result.reason, "apply-failed");
  assert.equal(harness.group.bounds.x, 300);
  assert.equal(harness.member.pos[0], 320);
  assert.equal(harness.outside.pos[0], 100);
  assert.equal(harness.outside.size[0], 100);
  const counters = harness.counters();
  assert.equal(counters.before, 1);
  assert.equal(counters.after, 1);
  assert.ok(counters.syncs >= 2, "group apply + rollback should both sync persistence");
}

console.log("Layout transaction and mixed Group contract passed.");
