import assert from "node:assert/strict";
import { buildMultiGroupDragPlan, hasNodePosition } from "../entry/canvas-groups/multi-drag-plan.js";

const groups = {
  parent: { bounds: { x: 0, y: 0, w: 500, h: 500 }, nodeIds: [1, 2] },
  child: { bounds: { x: 100, y: 100, w: 120, h: 120 }, nodeIds: [2] },
  peer: { bounds: { x: 600, y: 0, w: 200, h: 200 }, nodeIds: [3] },
  legacy: { bounds: { x: 880, y: 0, w: 160, h: 120 }, nodeIds: [] },
};
const nodes = [
  { id: 1, pos: [20, 20], size: [80, 40] },
  { id: 2, pos: [110, 110], size: [80, 40] },
  { id: 3, pos: [620, 20], size: [80, 40] },
  { id: 4, pos: [900, 20], size: [80, 40] },
];

const plan = buildMultiGroupDragPlan({ groups, nodes, selectedGroupIds: ["parent", "child", "peer"] });
assert.deepEqual(new Set(plan.groupIds), new Set(["parent", "child", "peer"]));
assert.deepEqual(new Set(plan.nodeIds), new Set(["1", "2", "3"]));

const parentAndPeer = buildMultiGroupDragPlan({ groups, nodes, selectedGroupIds: ["parent", "peer"] });
assert.deepEqual(new Set(parentAndPeer.groupIds), new Set(["parent", "child", "peer"]));
assert.deepEqual(new Set(parentAndPeer.nodeIds), new Set(["1", "2", "3"]));

const memberWinsOverBounds = buildMultiGroupDragPlan({
  groups,
  nodes,
  selectedGroupIds: ["child", "peer"],
});
assert.deepEqual(new Set(memberWinsOverBounds.nodeIds), new Set(["2", "3"]));

const legacyFallback = buildMultiGroupDragPlan({
  groups,
  nodes,
  selectedGroupIds: ["peer", "legacy"],
});
assert.deepEqual(new Set(legacyFallback.nodeIds), new Set(["3", "4"]));

assert.equal(hasNodePosition({ pos: new Float64Array([12, 34]) }), true);
assert.equal(hasNodePosition({ pos: [12, 34] }), true);
assert.equal(hasNodePosition({ pos: null }), false);

console.log("Canvas group multi-drag plan contract passed.");
