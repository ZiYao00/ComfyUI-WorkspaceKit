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
assert.equal(plan.groups["wk-one"].headerBgColor, "rgba(255,0,0,0.5)");
assert.equal(plan.groups["wk-one"].nativeGroupColor, "#ff0000");
assert.equal(plan.groups.native_8.allowEmpty, true);
assert.equal(plan.groups.native_8.headerBgColor, "rgba(0,255,0,0.5)");
assert.equal(plan.groups.native_8.nativeGroupColor, "#00ff00");
assert.equal(plan.groups.native_8.fontSize, 16);
assert.deepEqual(plan.archivedGroupIdsWithoutNativeMatch, []);

const noArchivePlan = createNativeToWorkspaceKitConversionPlan({
  nativeGroups: [{ id: 12, title: "Original native", bounding: [1, 2, 120, 80], color: "#abcdef", nodeIds: ["9"] }],
});
assert.deepEqual(noArchivePlan.newGroupIds, ["native_12"]);
assert.equal(noArchivePlan.groups.native_12.headerBgColor, "rgba(171,205,239,0.5)");
assert.equal(noArchivePlan.groups.native_12.nativeGroupColor, "#abcdef");

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

/*
 * T-044: a converted native group gets its title bar at the opacity cap.
 *
 * A native group paints one solid colour across its whole body, so at WK's
 * default 0.25 the converted frame looks washed out next to what the user had.
 */
const alphaOf = (rgba) => Number(String(rgba).match(/,\s*([\d.]+)\)$/)?.[1]);
for (const [label, group] of [
  ["restored", plan.groups["wk-one"]],
  ["fresh", plan.groups.native_8],
  ["no-archive", noArchivePlan.groups.native_12],
  ["collision fallback", collisionPlan.groups.native_5],
]) {
  assert.equal(alphaOf(group.headerBgColor), 0.5,
    `${label}: a converted group's title bar must sit at the 0.5 opacity cap`);
  assert.match(group.headerBgColor, /^rgba\(\d+,\d+,\d+,[\d.]+\)$/,
    `${label}: WK renders a translucent rgba title bar, not native's solid hex`);
}

// The native hex itself must survive untouched: rgthree's colour filter and the
// forward conversion both compare that exact value, so folding the opacity into
// nativeGroupColor would break colour identity.
assert.equal(plan.groups["wk-one"].nativeGroupColor, "#ff0000");
assert.equal(collisionPlan.groups.native_5.nativeGroupColor, "#123456");

// Three-digit native shorthands must expand, not be pasted into rgba() raw.
const shorthandPlan = createNativeToWorkspaceKitConversionPlan({
  nativeGroups: [{ id: 21, title: "Shorthand", bounding: [0, 0, 100, 80], color: "#A88", nodeIds: [] }],
});
assert.equal(shorthandPlan.groups.native_21.headerBgColor, "rgba(170,136,136,0.5)",
  "#A88 must expand to its six-digit channels before becoming rgba()");

// An unusable native colour falls through to the default rather than producing
// a malformed rgba() string.
const colorlessPlan = createNativeToWorkspaceKitConversionPlan({
  nativeGroups: [
    { id: 31, title: "No colour", bounding: [0, 0, 100, 80], nodeIds: [] },
    { id: 32, title: "Junk colour", bounding: [0, 0, 100, 80], color: "not-a-colour", nodeIds: [] },
  ],
});
assert.equal(colorlessPlan.groups.native_31.headerBgColor, "rgba(0,0,0,0.25)",
  "a native group with no colour keeps the default title bar");
assert.equal(colorlessPlan.groups.native_32.headerBgColor, "rgba(0,0,0,0.25)",
  "an unparseable native colour must not yield a malformed rgba()");

/*
 * T-040/T-045: a native-origin group lands on the approved neutral WK look.
 *
 * A native group carries only a colour, title and geometry — no font colour,
 * border or effect to preserve. WK's generic default (gold text on a 2px gold
 * border) is tuned for a group the user built themselves, so a converted group
 * gets near-white text with a matching 2px near-white border at 40% opacity.
 *
 * `useUnifiedColor` is load-bearing: it is what makes the border follow the
 * title colour. Setting the font white without it leaves a gold border, which is
 * exactly the half-applied state reported after the first attempt.
 */
for (const [label, group] of [
  ["fresh", plan.groups.native_8],
  ["no-archive", noArchivePlan.groups.native_12],
  ["collision fallback", collisionPlan.groups.native_5],
  ["shorthand", shorthandPlan.groups.native_21],
  ["colourless", colorlessPlan.groups.native_31],
]) {
  assert.equal(group.fontSize, 16, `${label}: converted title uses the 16px WK default`);
  assert.equal(group.titleColor, "#F2F2F2", `${label}: converted title text must be near-white`);
  assert.equal(group.useUnifiedColor, true,
    `${label}: unified colour is what carries the title colour through to the border`);
  assert.equal(group.borderWidth, 2, `${label}: converted border must be 2px`);
  assert.equal(group.borderOpacity, 0.4, `${label}: converted border opacity must be 40%`);
  assert.equal(group.colorSat, 0, `${label}: border saturation 0 is how near-white is stored`);
  assert.equal(group.colorLit, 95, `${label}: border lightness 95 is how near-white is stored`);
  assert.equal(group.backgroundFillEnabled, false, `${label}: converted groups start without a body fill`);
  assert.equal(group.shadowSize, 0, `${label}: converted groups start without a shadow`);
  assert.equal(group.cornerRadius, 8, `${label}: converted groups keep the WK 8px radius`);
  assert.equal(group.contentPadding, 12, `${label}: converted groups keep the WK 12px padding`);
  assert.equal(group.effect, "none", `${label}: converted groups start without an animation`);
}

// A group that was WorkspaceKit before must get its OWN saved style back — that
// round trip is the point of the archive, and the converted look must not
// overwrite it.
assert.equal(plan.groups["wk-one"].fontSize, 18, "a restored group keeps its archived font size");
assert.notEqual(plan.groups["wk-one"].titleColor, "#F2F2F2",
  "a restored group must not be repainted with the converted-group look");

console.log("Native-to-WorkspaceKit conversion plan contract passed.");
