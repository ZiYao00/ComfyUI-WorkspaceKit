import assert from "node:assert/strict";
import {
  officialWorkflowSnapshot,
  planExecutionDirtyReconciliation,
} from "../entry/workflows/dirty-snapshot.js";

const base = {
  version: 0.4,
  nodes: [
    { id: 2, type: "KSampler", widgets_values: [123, "fixed"] },
    { id: 1, type: "CLIPTextEncode", widgets_values: ["hello"] },
  ],
  extra: {
    ds: { scale: 1, offset: [0, 0] },
    workspace2_groups: [{ id: "g1" }],
  },
  links: [[1, 1, 0, 2, 0, "MODEL"]],
  floatingLinks: [],
  reroutes: [],
  groups: [],
  definitions: {},
  subgraphs: [],
};

const reorderedViewport = {
  ...base,
  version: 0.5,
  nodes: [...base.nodes].reverse(),
  extra: {
    ...base.extra,
    ds: { scale: 1.8, offset: [300, -120] },
  },
};

assert.equal(
  officialWorkflowSnapshot(base),
  officialWorkflowSnapshot(reorderedViewport),
  "node order, viewport extra.ds and unrelated top-level workflow metadata must not create semantic dirty state",
);

const promptEdited = structuredClone(base);
promptEdited.nodes[1].widgets_values = ["changed"];
assert.notEqual(
  officialWorkflowSnapshot(base),
  officialWorkflowSnapshot(promptEdited),
  "node widget edits remain semantic workflow changes",
);

const linkEdited = structuredClone(base);
linkEdited.links = [[1, 1, 0, 2, 1, "MODEL"]];
assert.notEqual(
  officialWorkflowSnapshot(base),
  officialWorkflowSnapshot(linkEdited),
  "links remain part of the semantic snapshot",
);

const before = officialWorkflowSnapshot(base);
const afterExecution = structuredClone(base);
afterExecution.nodes[0].widgets_values = [124, "fixed"];
const after = officialWorkflowSnapshot(afterExecution);

assert.deepEqual(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: after,
    startedClean: true,
  }),
  { absorb: true, changed: true, reason: "execution-only" },
  "a clean queue transaction may advance the effective clean baseline",
);

assert.equal(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: after,
    startedClean: false,
  }).absorb,
  false,
  "running an already-dirty workflow must never clear its save need",
);

assert.equal(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: after,
    startedClean: true,
    tainted: true,
  }).absorb,
  false,
  "an intervening real graph edit must fail closed",
);

assert.equal(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: after,
    startedClean: true,
    sameWorkflow: false,
  }).absorb,
  false,
  "a queue completion must not reconcile a different active workflow",
);

assert.equal(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: after,
    startedClean: true,
    currentDirty: true,
  }).absorb,
  false,
  "a path already known dirty at queue completion must remain dirty",
);

assert.deepEqual(
  planExecutionDirtyReconciliation({
    beforeSnapshot: before,
    afterSnapshot: before,
    startedClean: true,
  }),
  { absorb: true, changed: false, reason: "no-execution-change" },
);

console.log("workflow dirty snapshot contract passed");
