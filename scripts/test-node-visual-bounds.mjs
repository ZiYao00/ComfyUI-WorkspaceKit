import assert from "node:assert/strict";
import { resolveNodeVisualBounds } from "../entry/canvas-groups/node-visual-bounds.js";
import { resolveNodeVisualBounds as resolveSharedNodeVisualBounds } from "../entry/core/node-visual-bounds.js";

const canvas = {
  canvas: { getBoundingClientRect: () => ({ left: 100, top: 40, width: 1000, height: 600 }) },
  ds: { scale: 0.8, offset: [50, 25] },
};
const documentRef = {
  querySelector(selector) {
    assert.equal(selector, '[data-testid="node-body-42"]');
    return {
      closest: (candidate) => {
        assert.equal(candidate, ".lg-node");
        return { getBoundingClientRect: () => ({ left: 260, top: 200, width: 240, height: 120 }) };
      },
    };
  },
};

assert.equal(resolveNodeVisualBounds, resolveSharedNodeVisualBounds, "Canvas Groups compatibility export must use the shared resolver");

assert.deepEqual(resolveNodeVisualBounds({ node: { id: 42, pos: [0, 0], size: [20, 20] }, canvas, documentRef }), {
  x: 150,
  y: 175,
  w: 300,
  h: 150,
});

// Live DOM geometry is more authoritative than compatibility metadata when the
// runtime measurement API is unavailable.
assert.deepEqual(resolveNodeVisualBounds({
  node: { boundingRect: [1, 2, 3, 4], id: 42 }, canvas, documentRef,
}), { x: 150, y: 175, w: 300, h: 150 });

// getBounding() wins over both a stale expanded boundingRect and a larger DOM
// rectangle. This is the collapse-aware path shared with Layout.
assert.deepEqual(resolveNodeVisualBounds({
  node: {
    id: 42,
    pos: [100, 100],
    size: [320, 180],
    boundingRect: [100, 80, 320, 200],
    getBounding: () => [100, 80, 120, 34],
  },
  canvas,
  documentRef,
}), { x: 100, y: 80, w: 120, h: 34 });

assert.deepEqual(resolveNodeVisualBounds({
  node: { boundingRect: [1, 2, 3, 4], id: 42 }, canvas: null, documentRef: null,
}), { x: 1, y: 2, w: 3, h: 4 });

assert.deepEqual(resolveNodeVisualBounds({
  node: { boundingRect: [0, 0, 0, 0], id: 42, pos: [0, 0], size: [20, 20] }, canvas, documentRef,
}), { x: 150, y: 175, w: 300, h: 150 });
assert.deepEqual(resolveNodeVisualBounds({
  node: { id: 1, pos: [10, 20], size: [30, 40] },
  canvas: null,
  documentRef: null,
  titleHeight: 12,
}), { x: 10, y: 8, w: 30, h: 52 });
console.log("shared node visual bounds contract passed");
