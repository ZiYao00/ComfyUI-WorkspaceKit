import { resolveNodePreviewAdapter } from "./preview-adapters.js";

// Resolve a preview from public node-definition structure before considering a
// small, exact adapter list. This intentionally avoids node-title/category
// guesses: translations and third-party naming conventions are not stable API.
export function resolveNodePreviewPresentation({ node, inputs = [], widgets = [], outputs = [] }) {
  const explicit = resolveNodePreviewAdapter(node);
  if (explicit) {
    return { ...explicit, source: "adapter" };
  }

  const inputRows = inputs.length + widgets.length;
  const outputRows = outputs.length;
  const rowCount = Math.max(inputRows, outputRows);

  if (widgets.some((widget) => widget.multiline)) {
    return { archetype: "text", kind: "text", labelKey: "nodes.previewKindText", surface: "text", source: "structure" };
  }
  if (rowCount > 10) {
    return { archetype: "complex", source: "structure" };
  }
  if (widgets.length >= 2) {
    return { archetype: "form", source: "structure" };
  }
  if (inputs.length + outputs.length >= 5) {
    return { archetype: "ports", source: "structure" };
  }
  return { archetype: "structure", source: "fallback" };
}
