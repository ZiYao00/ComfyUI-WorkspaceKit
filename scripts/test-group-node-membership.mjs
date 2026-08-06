import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  containsNodeCentre,
  isNodeInsideGroup,
  resolveGroupMemberIds,
} from "../entry/canvas-groups/node-membership.js";

// T-037 (2026-08-05): node membership must match native ComfyUI's
// `containsCentre` — a node belongs to a group iff its CENTRE POINT is inside the
// group bounds. See docs/NATIVE_BEHAVIOR_REFERENCE.md §2. The previous rule
// required full four-edge containment plus a 20% retained-overlap anti-jitter
// clause; both are gone.

const group = { x: 100, y: 100, w: 400, h: 300 }; // centre (300, 250)
const node = (x, y, w = 200, h = 80) => ({ x, y, w, h });

// ── 1. Centre inside with edges hanging out → member ──
// This is the case the old full-containment rule wrongly refused.
assert.equal(
  isNodeInsideGroup(group, node(60, 200)), // left edge 40 outside, centre at x=160
  true,
  "a node whose centre is inside must be a member even with a corner outside"
);
assert.equal(
  isNodeInsideGroup(group, node(420, 200)), // centre x=520, past the right edge (500)
  false,
  "centre beyond the right edge is not a member"
);
assert.equal(
  isNodeInsideGroup(group, node(380, 200)), // centre x=480 <= 500, y=240 inside
  true,
  "centre just inside the right edge is a member"
);

// ── 2. Overlap percentage is irrelevant in both directions ──
// A node spanning the whole group but centred exactly on its right edge is in,
// because the edge test is inclusive — area played no part in the decision.
assert.equal(
  containsNodeCentre(group, node(150, 200, 700, 80)), // centre x=500 == right edge
  true,
  "a node far wider than the group is still decided by its centre alone"
);
// Mostly inside, centre outside → not a member.
assert.equal(
  isNodeInsideGroup(group, node(460, 200)), // centre x=560, outside
  false,
  "a node overlapping heavily but centred outside is not a member"
);
// Barely overlapping in area, centre inside → member.
assert.equal(
  isNodeInsideGroup(group, node(110, 210, 20, 20)), // tiny node well inside
  true,
  "a small node centred inside is a member regardless of area"
);

// ── 3. Edges are inclusive, matching LiteGraph's isInRect ──
assert.equal(containsNodeCentre(group, node(0, 210, 200, 80)), true, "centre exactly on the left edge (x=100) counts");
assert.equal(containsNodeCentre(group, node(-1, 210, 200, 80)), false, "one pixel past the left edge does not");
assert.equal(containsNodeCentre({ x: 0, y: 0, w: 10, h: 10 }, node(5, 5, 10, 10)), true, "centre on the far corner counts");

// ── 4. Degenerate rects can never contain ──
for (const bad of [{ x: 0, y: 0, w: 0, h: 10 }, { x: 0, y: 0, w: 10, h: 0 }, { x: 0, y: 0, w: -5, h: -5 }]) {
  assert.equal(containsNodeCentre(bad, node(0, 0, 2, 2)), false, "a zero/negative-size group contains nothing");
}

// ── 5. Malformed input is safe and never throws ──
for (const bad of [null, undefined, 0, "", [], {}, { x: 1 }, { x: NaN, y: 0, w: 1, h: 1 }]) {
  assert.equal(typeof containsNodeCentre(bad, node(0, 0)), "boolean");
  assert.equal(typeof containsNodeCentre(group, bad), "boolean");
  assert.equal(containsNodeCentre(bad, node(0, 0)), false);
  assert.equal(containsNodeCentre(group, bad), false);
}

// ── 6. Membership does not depend on prior membership ──
// The removed anti-jitter rule retained a node at >=20% overlap once persisted.
// A centre point cannot jitter across an edge, and retaining would produce
// "dragged out but still stuck", so the rule takes no history argument at all.
assert.equal(isNodeInsideGroup.length, 2, "membership is a pure function of geometry only");

// ── 7. resolveGroupMemberIds preserves input order and skips invalid nodes ──
assert.deepEqual(
  resolveGroupMemberIds(group, [
    { id: "a", bounds: node(150, 200) },   // in
    { id: "b", bounds: node(900, 900) },   // out
    { id: "c", bounds: node(60, 200) },    // in, corner outside
    { id: null, bounds: node(150, 200) },  // skipped: no id
    null,                                   // skipped
    { id: "d" },                            // skipped: no bounds
  ]),
  ["a", "c"]
);
assert.deepEqual(resolveGroupMemberIds(group, []), []);
assert.deepEqual(resolveGroupMemberIds(group, null), []);
// id 0 is a legitimate LiteGraph node id and must not be dropped as falsy.
assert.deepEqual(resolveGroupMemberIds(group, [{ id: 0, bounds: node(150, 200) }]), [0]);

// ── 8. Purity ──
// Strip comments first: the module cites native symbol names (LiteGraph,
// containsCentre) in its rationale, which is documentation, not a dependency.
const moduleSource = await readFile(
  new URL("../entry/canvas-groups/node-membership.js", import.meta.url),
  "utf8"
);
const moduleCode = moduleSource
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
for (const forbidden of ["document", "window", "app.", "localStorage", "addEventListener", "querySelector", "LiteGraph"]) {
  assert.ok(!moduleCode.includes(forbidden), `node-membership.js must stay pure (found ${forbidden})`);
}

// ── 9. Call-site contract inside the groups file ──
const groups = await readFile(
  new URL("../entry/workspace2_canvas_groups.js", import.meta.url),
  "utf8"
);

assert.match(
  groups,
  /import \{ isNodeInsideGroup \} from "\.\/canvas-groups\/node-membership\.js/,
  "the groups file must consume the pure rule rather than reimplementing it"
);

// syncNodeMembership must use the shared rule and must no longer carry the
// anti-jitter threshold or the two count-based guards that masked area jitter.
const syncMatch = groups.match(/syncNodeMembership\(group, bounds\) \{([\s\S]*?)\n    \},/);
assert.ok(syncMatch, "syncNodeMembership body found");
const syncBody = syncMatch[1];
assert.match(syncBody, /isNodeInsideGroup\(bounds, nodeBounds\)/, "membership must use the shared centre-point rule");
assert.doesNotMatch(syncBody, /retainedOverlapThreshold/, "the 20% anti-jitter rule must be gone");
assert.doesNotMatch(syncBody, /_getOverlapRatio/, "membership must not consult area overlap");
assert.doesNotMatch(syncBody, /_isFullyContained/, "membership must not require full containment");
assert.doesNotMatch(syncBody, /newCount < prevCount \* 0\.3/, "the count-drop guard must be gone");

// Every node-controlled-by-group test must use the same rule: no inline
// four-edge arithmetic may survive anywhere in the file.
assert.doesNotMatch(
  groups,
  /n\.pos\[0\] >= b\.x && n\.pos\[0\] \+ nw <= b\.x \+ b\.w/,
  "no inline full-containment node test may remain"
);
assert.equal(
  (groups.match(/isNodeInsideGroup\(/g) || []).length,
  6,
  "one import plus the five node-membership/control call sites"
);

// Group-in-group nesting must KEEP full containment: native nesting uses
// containsRect, not containsCentre.
assert.match(
  groups,
  /_isFullyContained\(parentBounds, childBounds\)/,
  "the full-containment helper must survive for group nesting"
);
assert.ok(
  (groups.match(/this\._isFullyContained\(/g) || []).length >= 5,
  "group-in-group nesting call sites must be untouched"
);

console.log("Group node-membership (centre point) contract passed.");
