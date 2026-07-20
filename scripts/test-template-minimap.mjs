import assert from "node:assert/strict";
import { createTemplateMinimap } from "../entry/templates/minimap.js";

class FakeContext {
  constructor() { this.calls = []; }
  beginPath() { this.calls.push("beginPath"); }
  moveTo() { this.calls.push("moveTo"); }
  lineTo() { this.calls.push("lineTo"); }
  quadraticCurveTo() { this.calls.push("quadraticCurveTo"); }
  closePath() { this.calls.push("closePath"); }
  scale() { this.calls.push("scale"); }
  clearRect() { this.calls.push("clearRect"); }
  fillRect() { this.calls.push("fillRect"); }
  fillText(value) { this.calls.push(["fillText", value]); }
  save() { this.calls.push("save"); }
  restore() { this.calls.push("restore"); }
  bezierCurveTo() { this.calls.push("bezierCurveTo"); }
  fill() { this.calls.push("fill"); }
  stroke() { this.calls.push("stroke"); }
}
class FakeCanvas {
  constructor(ctx) { this.ctx = ctx; this.style = {}; this.className = ""; }
  getContext() { return this.ctx; }
}

const canvases = [];
const factory = createTemplateMinimap({
  document: { createElement: () => { const canvas = new FakeCanvas(new FakeContext()); canvases.push(canvas); return canvas; } },
  getDevicePixelRatio: () => 3,
  t: (key) => `t:${key}`,
  vectorPair: (value, fallback) => Array.isArray(value) ? value : fallback,
});

const nodes = factory.templatePreviewNodes({ nodes: [
  { id: 1, type: "ImageNode", relPos: [10, 20], size: [240, 100], color: "#112233" },
  { id: 2, type: "LatentNode", pos: [400, 20], size: [200, 80], mode: 4 },
] });
assert.equal(nodes.length, 2);
assert.deepEqual(factory.templatePreviewBounds(nodes), { minX: 10, minY: 20, width: 590, height: 100 });
assert.equal(factory.templatePreviewNodeFill(nodes[0]), "#112233");
assert.equal(factory.templatePreviewNodeFill(nodes[1]), "#45424d");
assert.equal(factory.templatePreviewNodeFill({ type: "TextEncode" }), "#70623e");

const empty = factory.renderTemplateMinimap({ nodes: [] }, { width: 100, height: 60 });
assert.equal(empty.width, 200);
assert.equal(empty.height, 120);
assert.equal(empty.style.aspectRatio, "100 / 60");
assert.deepEqual(empty.ctx.calls.find((call) => Array.isArray(call) && call[0] === "fillText"), ["fillText", "t:templates.empty"]);

const rendered = factory.renderTemplateMinimap({ nodes, links: [{ origin_id: 1, target_id: 2 }] });
assert.equal(rendered.className, "workspace2-template-minimap");
assert.equal(rendered.ctx.calls.includes("bezierCurveTo"), true);
assert.equal(rendered.ctx.calls.includes("fill"), true);
assert.equal(canvases.length, 2);

console.log("Template minimap contract passed.");
