import assert from "node:assert/strict";
import { buildGroupContentsSelectionPlan } from "../entry/canvas-groups/contents-selection-plan.js";

const groups = {
  parent: { bounds: { x: 0, y: 0, w: 500, h: 500 }, nodeIds: [1, 3] },
  childA: { bounds: { x: 40, y: 80, w: 180, h: 180 }, nodeIds: [1] },
  childB: { bounds: { x: 260, y: 80, w: 180, h: 180 }, nodeIds: [2] },
  grandchild: { bounds: { x: 70, y: 110, w: 80, h: 80 }, nodeIds: [4] },
  outside: { bounds: { x: 560, y: 0, w: 120, h: 120 }, nodeIds: [5] },
  legacy: { bounds: { x: 40, y: 300, w: 140, h: 120 }, nodeIds: [] },
};
const nodes = [
  { id: 1, pos: [60, 100], size: [40, 40] }, { id: 2, pos: [280, 100], size: [40, 40] },
  { id: 3, pos: [420, 400], size: [40, 40] }, { id: 4, pos: [90, 125], size: [40, 40] },
  { id: 5, pos: [580, 20], size: [40, 40] }, { id: 6, pos: [70, 320], size: [40, 40] },
];

const parentPlan = buildGroupContentsSelectionPlan({ groups, nodes, groupId: "parent" });
assert.deepEqual(new Set(parentPlan.groupIds), new Set(["childA", "childB", "grandchild", "legacy"]));
assert.deepEqual(new Set(parentPlan.nodeIds), new Set(["1", "2", "3", "4", "6"]));
const childPlan = buildGroupContentsSelectionPlan({ groups, nodes, groupId: "childA" });
assert.deepEqual(new Set(childPlan.groupIds), new Set(["grandchild"]));
assert.deepEqual(new Set(childPlan.nodeIds), new Set(["1", "4"]));
assert.deepEqual(buildGroupContentsSelectionPlan({ groups, nodes, groupId: "missing" }), { groupIds: [], nodeIds: [] });
console.log("Canvas group contents selection plan contract passed.");
