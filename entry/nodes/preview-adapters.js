// Explicit media-family hints for the node hover preview.
//
// These are deliberately exact type matches. A node title/category can be
// translated or misleading, and an IMAGE port alone does not prove that a node
// renders an image. Unknown and third-party nodes therefore keep the generic
// structural card until they can provide an explicit, safe adapter.

const ADAPTERS_BY_TYPE = new Map([
  ["LoadImage", { archetype: "media", kind: "image", labelKey: "nodes.previewKindImage", surface: "image" }],
  ["LoadImageMask", { archetype: "media", kind: "image", labelKey: "nodes.previewKindImage", surface: "image" }],
  ["LoadImageOutput", { archetype: "media", kind: "image", labelKey: "nodes.previewKindImage", surface: "image" }],
  ["PreviewImage", { archetype: "media", kind: "image", labelKey: "nodes.previewKindImage", surface: "image" }],
  ["SaveImage", { archetype: "media", kind: "image", labelKey: "nodes.previewKindImage", surface: "image" }],
  ["LoadAudio", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["PreviewAudio", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["SaveAudio", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["SaveAudioMP3", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["SaveAudioOpus", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["SaveAudioAdvanced", { archetype: "media", kind: "audio", labelKey: "nodes.previewKindAudio", surface: "audio" }],
  ["LoadVideo", { archetype: "media", kind: "video", labelKey: "nodes.previewKindVideo", surface: "video" }],
  ["PreviewVideo", { archetype: "media", kind: "video", labelKey: "nodes.previewKindVideo", surface: "video" }],
  ["SaveVideo", { archetype: "media", kind: "video", labelKey: "nodes.previewKindVideo", surface: "video" }],
  ["PrimitiveStringMultiline", { archetype: "text", kind: "text", labelKey: "nodes.previewKindText", surface: "text" }],
  ["CLIPTextEncode", { archetype: "text", kind: "text", labelKey: "nodes.previewKindText", surface: "text" }],
  ["CLIPTextEncodeSDXL", { archetype: "text", kind: "text", labelKey: "nodes.previewKindText", surface: "text" }],
  ["Load3D", { archetype: "threeD", kind: "threeD", labelKey: "nodes.previewKind3d" }],
  ["SaveGLB", { archetype: "threeD", kind: "threeD", labelKey: "nodes.previewKind3d" }],
]);

export function resolveNodePreviewAdapter(node) {
  const type = String(node?.type || "").trim();
  return type ? ADAPTERS_BY_TYPE.get(type) || null : null;
}
