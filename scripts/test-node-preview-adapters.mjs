import assert from "node:assert/strict";
import { resolveNodePreviewAdapter } from "../entry/nodes/preview-adapters.js";

assert.deepEqual(resolveNodePreviewAdapter({ type: "LoadImage" }), {
  archetype: "media",
  kind: "image",
  labelKey: "nodes.previewKindImage",
  surface: "image",
});
assert.deepEqual(resolveNodePreviewAdapter({ type: "PreviewAudio" }), {
  archetype: "media",
  kind: "audio",
  labelKey: "nodes.previewKindAudio",
  surface: "audio",
});
assert.deepEqual(resolveNodePreviewAdapter({ type: "LoadVideo" }), {
  archetype: "media",
  kind: "video",
  labelKey: "nodes.previewKindVideo",
  surface: "video",
});
assert.deepEqual(resolveNodePreviewAdapter({ type: "CLIPTextEncode" }), {
  archetype: "text",
  kind: "text",
  labelKey: "nodes.previewKindText",
  surface: "text",
});
assert.equal(resolveNodePreviewAdapter({ type: "An image-looking third-party node" }), null);
assert.equal(resolveNodePreviewAdapter({ type: "" }), null);
console.log("node preview adapter tests passed");
