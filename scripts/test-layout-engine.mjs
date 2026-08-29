import assert from "node:assert/strict";

import {
  LAYOUT_OPERATIONS,
  calculateLayout,
} from "../entry/layout/layout-engine.js";
import {
  normalizeNodeLayoutTarget,
  normalizeRectLayoutTarget,
} from "../entry/layout/geometry-service.js";
import {
  calculateLayoutCommand,
  layoutCommandState,
} from "../entry/layout/command-registry.js";

function node(id, x, y, width, height, measured = null) {
  return {
    id,
    pos: [x, y],
    size: [width, height],
    flags: measured ? { collapsed: true } : {},
    ...(measured ? { getBounding: () => measured } : {}),
  };
}

function rect(id, x, y, width, height, options = {}) {
  return normalizeRectLayoutTarget({
    id,
    sourceId: id,
    kind: options.kind ?? "rect",
    x,
    y,
    width,
    height,
    movable: options.movable ?? true,
    resizable: options.resizable ?? false,
  });
}

{
  const first = normalizeNodeLayoutTarget(node(1, -10.5, 20, 100, 50));
  const collapsed = normalizeNodeLayoutTarget(node(2, 200.25, 80, 300, 120, [200.25, 60, 120, 30]));
  const result = calculateLayout([first, collapsed], LAYOUT_OPERATIONS.ALIGN_TOP);
  assert.equal(result.ok, true);
  assert.equal(result.changes.length, 1);
  // Align-top follows the topmost visible edge of the whole selection, matching
  // PS/Figma-style alignment semantics. The collapsed node therefore moves so
  // its measured visual top reaches y=20; its logical y shifts from 80 to 40.
  assert.equal(result.changes[0].sourceId, "2");
  assert.equal(result.changes[0].to.y, 40);
  assert.equal(collapsed.collapsed, true);
  assert.equal(collapsed.visualBounds.height, 30);
}

{
  const targets = [
    rect("a", 0, 0, 100, 20),
    rect("b", 200, 0, 50, 20),
    rect("c", 400, 0, 100, 20),
  ];
  const result = calculateLayout(targets, LAYOUT_OPERATIONS.DISTRIBUTE_HORIZONTAL);
  assert.equal(result.ok, true);
  assert.deepEqual(result.changes.map((change) => [change.sourceId, change.to.x]), [["b", 225]]);
  const tooFew = calculateLayout(targets.slice(0, 2), LAYOUT_OPERATIONS.DISTRIBUTE_HORIZONTAL);
  assert.equal(tooFew.ok, false);
  assert.equal(tooFew.minimumSelection, 3);
}

{
  const targets = [
    rect("a", 10, 0, 100, 20),
    rect("b", 300, 0, 50, 20),
    rect("c", 500, 0, 25, 20),
  ];
  const zero = calculateLayout(targets, LAYOUT_OPERATIONS.SPACING_HORIZONTAL, { spacing: 0 });
  assert.deepEqual(zero.changes.map((change) => [change.sourceId, change.to.x]), [["b", 110], ["c", 160]]);
  const invalid = calculateLayout(targets, LAYOUT_OPERATIONS.SPACING_HORIZONTAL, { spacing: -1 });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, "invalid-spacing");
}

{
  const targets = [
    rect("node:1", 0, 0, 100, 50, { kind: "node", resizable: true }),
    rect("node:2", 200, 0, 250, 80, { kind: "node", resizable: true }),
    rect("workspacekit-group:g1", 500, 0, 400, 200, { kind: "workspacekit-group", resizable: false }),
  ];
  const maxWidth = calculateLayout(targets, LAYOUT_OPERATIONS.SIZE_MAX_WIDTH);
  assert.equal(maxWidth.ok, true);
  assert.deepEqual(maxWidth.changes.map((change) => [change.sourceId, change.to.width]), [["node:1", 250]]);
  assert.ok(maxWidth.changes.every((change) => change.kind === "node"));
}

{
  const selection = {
    selectedCount: 2,
    movableCount: 2,
    resizableCount: 2,
    targets: [
      rect("node:1", 0, 0, 100, 50, { kind: "node", resizable: true }),
      rect("node:2", 200, 0, 250, 80, { kind: "node", resizable: true }),
    ],
  };
  assert.equal(layoutCommandState("workspacekit.layout.align.left", selection).enabled, true);
  assert.equal(layoutCommandState("workspacekit.layout.distribute.horizontal", selection).enabled, false);
  assert.equal(calculateLayoutCommand("workspacekit.layout.size.equal-width", selection).operation, LAYOUT_OPERATIONS.SIZE_MAX_WIDTH);
  assert.equal(calculateLayoutCommand("workspacekit.layout.size.equal-min-height", selection).operation, LAYOUT_OPERATIONS.SIZE_MIN_HEIGHT);
}

console.log("Layout engine contract passed.");
