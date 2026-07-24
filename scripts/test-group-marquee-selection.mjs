import assert from "node:assert/strict";
import {
  groupIdsIntersectingMarquee,
  hasMeaningfulMarqueeDrag,
  marqueeRectFromPoints,
  shouldStartGroupMarquee,
} from "../entry/canvas-groups/marquee-selection.js";

const canvas = {};
const event = (overrides = {}) => ({
  button: 0,
  ctrlKey: true,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  target: canvas,
  composedPath: () => [canvas],
  ...overrides,
});

assert.equal(shouldStartGroupMarquee(event(), canvas), true);
assert.equal(shouldStartGroupMarquee(event({ ctrlKey: false, metaKey: false }), canvas), false);
assert.equal(shouldStartGroupMarquee(event({ shiftKey: true }), canvas), false);
assert.equal(shouldStartGroupMarquee(event({ altKey: true }), canvas), false);
assert.equal(shouldStartGroupMarquee(event({ button: 2 }), canvas), false);
assert.equal(hasMeaningfulMarqueeDrag({ x: 10, y: 10 }, { x: 13, y: 13 }), true);
assert.equal(hasMeaningfulMarqueeDrag({ x: 10, y: 10 }, { x: 12, y: 12 }), false);

const marquee = marqueeRectFromPoints({ x: 100, y: 100 }, { x: 20, y: 40 });
assert.deepEqual(marquee, { left: 20, top: 40, right: 100, bottom: 100 });
const makeElement = (left, top, right, bottom) => ({ getBoundingClientRect: () => ({ left, top, right, bottom }) });
assert.deepEqual(groupIdsIntersectingMarquee({ inside: makeElement(50, 50, 90, 90), edge: makeElement(100, 60, 120, 80), outside: makeElement(101, 60, 140, 90) }, marquee), ["inside", "edge"]);

console.log("group marquee selection contract passed");
