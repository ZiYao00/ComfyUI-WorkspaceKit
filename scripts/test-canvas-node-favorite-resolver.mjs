import assert from "node:assert/strict";
import { resolveCanvasNodeDefinition } from "../entry/nodes/canvas-favorite-resolver.js";

const sampler = { type: "KSampler", title: "KSampler" };
const custom = { type: "Vendor.CustomNode", title: "Custom Node" };
const definitions = new Map([
  [sampler.type, sampler],
  [custom.type, custom],
]);

assert.equal(resolveCanvasNodeDefinition({ comfyClass: "KSampler" }, definitions), sampler);
assert.equal(resolveCanvasNodeDefinition({ constructor: { comfyClass: "Vendor.CustomNode" } }, definitions), custom);
assert.equal(resolveCanvasNodeDefinition({ type: "KSampler" }, definitions), sampler);
assert.equal(resolveCanvasNodeDefinition({ comfyClass: "Missing", type: "KSampler" }, definitions), sampler);
assert.equal(resolveCanvasNodeDefinition({ comfyClass: "Missing" }, definitions), null);
assert.equal(resolveCanvasNodeDefinition(null, definitions), null);

console.log("canvas node favorite resolver tests passed");
