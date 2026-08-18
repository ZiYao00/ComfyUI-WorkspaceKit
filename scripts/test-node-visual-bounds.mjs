import assert from "node:assert/strict";
import { resolveNodeVisualBounds } from "../entry/canvas-groups/node-visual-bounds.js";

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

assert.deepEqual(resolveNodeVisualBounds({ node: { id: 42, pos: [0, 0], size: [20, 20] }, canvas, documentRef }), {
  x: 150,
  y: 175,
  w: 300,
  h: 150,
});
assert.deepEqual(resolveNodeVisualBounds({
  node: { boundingRect: [1, 2, 3, 4], id: 42 }, canvas, documentRef,
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
console.log("node visual bounds contract passed");
