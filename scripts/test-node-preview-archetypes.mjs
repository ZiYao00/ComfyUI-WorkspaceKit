import assert from "node:assert/strict";
import { resolveNodePreviewPresentation } from "../entry/nodes/preview-archetypes.js";

const empty = { inputs: [], widgets: [], outputs: [] };

assert.deepEqual(resolveNodePreviewPresentation({ node: { type: "LoadAudio" }, ...empty }), {
  archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio", source: "adapter",
});
assert.deepEqual(resolveNodePreviewPresentation({
  node: { type: "ThirdPartyPrompt" }, inputs: [], outputs: [],
  widgets: [{ name: "prompt", type: "STRING", multiline: true }],
}), {
  archetype: "text", kind: "text", labelKey: "nodes.previewKindText", surface: "text", source: "structure",
});
assert.deepEqual(resolveNodePreviewPresentation({
  node: { type: "ThirdPartyControls" }, inputs: [], outputs: [],
  widgets: [{ type: "FLOAT" }, { type: "BOOLEAN" }],
}).archetype, "form");
assert.equal(resolveNodePreviewPresentation({
  node: { type: "ThirdPartyLarge" },
  inputs: Array.from({ length: 11 }, (_, index) => ({ name: `in${index}` })), widgets: [], outputs: [],
}).archetype, "complex");
assert.equal(resolveNodePreviewPresentation({
  node: { type: "ThirdPartyPorts" },
  inputs: [{}, {}, {}], widgets: [], outputs: [{}, {}],
}).archetype, "ports");
assert.deepEqual(resolveNodePreviewPresentation({ node: { type: "Unknown" }, ...empty }), {
  archetype: "structure", source: "fallback",
});

console.log("node preview archetype tests passed");
