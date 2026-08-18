import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GROUP_HIT_REGION_SELECTOR,
  shouldPassThroughGroupHitRegions,
} from "../entry/canvas-groups/hit-region-passthrough.js";

// T-041 (2026-08-05): the group frame's drag strips must yield to a node
// underneath, mirroring native ComfyUI's node-before-group hit-test order
// (docs/NATIVE_BEHAVIOR_REFERENCE.md §3).

// ── Region selector ──

// The three drag strips are the only yielding regions. The explicit resize
// control must remain usable when a Vue node overlaps a group corner.
for (const cls of ["xzg-border-left", "xzg-border-right", "xzg-border-bottom"]) {
  assert.ok(
    GROUP_HIT_REGION_SELECTOR.includes(`.${cls}`),
    `${cls} must be able to yield to a node`
  );
}
assert.ok(
  !GROUP_HIT_REGION_SELECTOR.includes("xzg-resize-handle"),
  "the explicit resize handle must never yield to a node"
);

// The title bar must never yield: it carries the rename input and the action
// buttons, which stay clickable even when a node overlaps them.
assert.ok(
  !GROUP_HIT_REGION_SELECTOR.includes("xzg-group-header"),
  "the title bar must never yield to a node"
);
// The body already sets pointer-events:none in markup and needs no toggling.
assert.ok(
  !GROUP_HIT_REGION_SELECTOR.includes("xzg-group-body"),
  "the group body is permanently transparent to pointer input"
);

// ── Decision rules ──

// 1. A node under an idle pointer → yield.
assert.equal(
  shouldPassThroughGroupHitRegions({ hasPointer: true, nodeUnderPointer: true, buttons: 0 }),
  true,
  "a node under an idle pointer must receive the click"
);

// 2. Empty canvas under the pointer → keep intercepting so the frame stays
//    draggable and resizable.
assert.equal(
  shouldPassThroughGroupHitRegions({ hasPointer: true, nodeUnderPointer: false, buttons: 0 }),
  false,
  "blank space must still start a group drag/resize"
);

// 3. No known pointer position → nothing to yield to.
assert.equal(
  shouldPassThroughGroupHitRegions({ hasPointer: false, nodeUnderPointer: false, buttons: 0 }),
  false
);
assert.equal(
  shouldPassThroughGroupHitRegions({ hasPointer: false, nodeUnderPointer: true, buttons: 0 }),
  false,
  "a stale node hit must not yield once the pointer has left"
);

// 4. Mid-gesture (any button held) → never re-target. Whoever received the
//    pointerdown owns the drag until release; flipping pointer-events under an
//    in-flight group drag would strand it.
for (const buttons of [1, 2, 4, 3]) {
  assert.equal(
    shouldPassThroughGroupHitRegions({ hasPointer: true, nodeUnderPointer: true, buttons }),
    false,
    `an in-flight gesture (buttons=${buttons}) must not be re-targeted`
  );
}

// 5. Malformed input must not throw and must default to intercepting, so a
//    failure can never leave the frame permanently undraggable.
for (const bad of [null, undefined, 0, "", [], { hasPointer: true, nodeUnderPointer: "yes" }]) {
  assert.equal(typeof shouldPassThroughGroupHitRegions(bad), "boolean");
}
assert.equal(shouldPassThroughGroupHitRegions(null), false);
assert.equal(
  shouldPassThroughGroupHitRegions({ hasPointer: true, nodeUnderPointer: "yes", buttons: 0 }),
  true,
  "a truthy node hit still yields"
);

// ── Purity: no DOM, canvas, graph or persistence access ──
const moduleSource = await readFile(
  new URL("../entry/canvas-groups/hit-region-passthrough.js", import.meta.url),
  "utf8"
);
for (const forbidden of ["document", "window", "app.", "localStorage", "addEventListener", "querySelector"]) {
  assert.ok(
    !moduleSource.includes(forbidden),
    `hit-region-passthrough.js must stay pure (found ${forbidden})`
  );
}

// ── Call-site contract inside the groups file ──
const groups = await readFile(
  new URL("../entry/workspace2_canvas_groups.js", import.meta.url),
  "utf8"
);

assert.match(
  groups,
  /import \{ GROUP_HIT_REGION_SELECTOR, shouldPassThroughGroupHitRegions \} from "\.\/canvas-groups\/hit-region-passthrough\.js/,
  "the groups file must consume the pure module rather than reimplementing it"
);

// The node probe must use LiteGraph's own hit test in canvas coordinates, not
// document.elementFromPoint: nodes are canvas pixels, not DOM
// (docs/NATIVE_BEHAVIOR_REFERENCE.md §5).
assert.match(
  groups,
  /_syncHitRegionPassThrough\(\) \{[\s\S]*?getCanvasPointFromPointerEvent\(point\)[\s\S]*?getNodeOnPos\?\.\(canvasPoint\.x, canvasPoint\.y, graph\._nodes, 5\)/,
  "the node probe must convert to canvas coordinates and use getNodeOnPos"
);

// It must run every frame, because the graph can move under a stationary
// pointer (canvas pan, node drag, zoom) with no pointer event to react to.
assert.match(
  groups,
  /updatePositions\(\) \{[\s\S]*?this\._syncHitRegionPassThrough\(\);/,
  "pass-through must be re-evaluated in the per-frame sync loop"
);

// A newly built frame carries the markup default, so the cached state must be
// invalidated when a frame is created or after the middle-click restore.
assert.equal(
  (groups.match(/_hitRegionsPassThrough = null;/g) || []).length,
  3,
  "cached pass-through state must be invalidated on frame build and both middle-click restores"
);

console.log("Group hit-region pass-through contract passed.");
