import assert from "node:assert/strict";
import { createWorkspaceKitGroupConversionArchive } from "../entry/canvas-groups/conversion-archive.js";
import { createNativeToWorkspaceKitConversionPlan } from "../entry/canvas-groups/reverse-conversion-plan.js";

const original = [{
  id: "wk-one",
  title: "Old title",
  nodeIds: ["1"],
  bounds: { x: 10, y: 20, w: 300, h: 150 },
  fontSize: 18,
  headerBgColor: "#222222",
  backgroundFillEnabled: true,
}];
const archive = createWorkspaceKitGroupConversionArchive(original, (group) => group, "2026-07-27T00:00:00.000Z");
const plan = createNativeToWorkspaceKitConversionPlan({
  archive,
  nativeGroupIds: { "wk-one": 7 },
  nativeGroups: [
    { id: 7, title: "Edited native title", bounding: [30, 40, 330, 180], color: "#ff0000", nodeIds: ["1", "2"] },
    { id: 8, title: "New native group", bounding: [50, 60, 200, 100], color: "#00ff00", nodeIds: [] },
  ],
});

assert.deepEqual(plan.restoredGroupIds, ["wk-one"]);
assert.deepEqual(plan.newGroupIds, ["native_8"]);
assert.equal(plan.groups["wk-one"].title, "Edited native title");
assert.deepEqual(plan.groups["wk-one"].bounds, { x: 30, y: 40, w: 330, h: 180 });
assert.deepEqual(plan.groups["wk-one"].nodeIds, ["1", "2"]);
assert.equal(plan.groups["wk-one"].fontSize, 18);
assert.equal(plan.groups["wk-one"].headerBgColor, "#ff0000");
assert.equal(plan.groups.native_8.allowEmpty, true);
assert.equal(plan.groups.native_8.headerBgColor, "#00ff00");
assert.equal(plan.groups.native_8.fontSize, 14);
assert.deepEqual(plan.archivedGroupIdsWithoutNativeMatch, []);

const noArchivePlan = createNativeToWorkspaceKitConversionPlan({
  nativeGroups: [{ id: 12, title: "Original native", bounding: [1, 2, 120, 80], color: "#abcdef", nodeIds: ["9"] }],
});
assert.deepEqual(noArchivePlan.newGroupIds, ["native_12"]);
assert.equal(noArchivePlan.groups.native_12.headerBgColor, "#abcdef");

assert.throws(() => createNativeToWorkspaceKitConversionPlan({ archive, nativeGroupIds: {}, nativeGroups: [] }), /no native groups exist/);
assert.throws(() => createNativeToWorkspaceKitConversionPlan({ archive: {}, nativeGroupIds: {}, nativeGroups: [{ id: 1, bounding: [0, 0, 10, 10] }] }), /Cannot restore WorkspaceKit groups/);

// T-206: mixed-state reverse conversion. reservedIds are the ids of the live
// WorkspaceKit groups already on the canvas. A fresh native group must never
// take one of those ids, and a mapped archive id that collides with a live id
// must fall back to a fresh native_<id> instead of overwriting it.
const reservedPlan = createNativeToWorkspaceKitConversionPlan({
  nativeGroups: [{ id: 12, title: "Native to merge", bounding: [1, 2, 120, 80], color: "#abcdef", nodeIds: [] }],
  reservedIds: ["native_12"],
});
// native_12 is reserved (an existing WK group), so the new group gets native_12_2.
assert.deepEqual(reservedPlan.newGroupIds, ["native_12_2"]);
assert.ok(reservedPlan.groups.native_12_2, "expected a non-colliding fresh id");
assert.equal(reservedPlan.groups.native_12, undefined, "must not overwrite the reserved id");

// A mapped archive id that is also a live WorkspaceKit id must not be reused.
const collidingArchive = createWorkspaceKitGroupConversionArchive(
  [{ id: "wk-live", title: "Archived", nodeIds: [], bounds: { x: 0, y: 0, w: 100, h: 80 } }],
  (group) => group,
  "2026-07-27T00:00:00.000Z",
);
const collisionPlan = createNativeToWorkspaceKitConversionPlan({
  archive: collidingArchive,
  nativeGroupIds: { "wk-live": 5 },
  nativeGroups: [{ id: 5, title: "Native five", bounding: [0, 0, 100, 80], color: "#123456", nodeIds: [] }],
  reservedIds: ["wk-live"],
});
assert.deepEqual(collisionPlan.restoredGroupIds, [], "mapped id collided with a live group, so no restore");
assert.deepEqual(collisionPlan.newGroupIds, ["native_5"], "falls back to a fresh id");

console.log("Native-to-WorkspaceKit conversion plan contract passed.");
