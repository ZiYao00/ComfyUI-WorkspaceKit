// Shared graph-space visual bounds resolver for ComfyUI nodes.
//
// Layout, Canvas Groups and any future canvas feature must agree on the rectangle
// the user actually sees. Prefer the runtime measurement contract first (it is
// collapse-aware), then the live Nodes 2.0 DOM, then compatibility metadata, and
// finally the persisted pos/size rectangle.

function finiteRect(x, y, width, height) {
  const values = [x, y, width, height].map(Number);
  if (!values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) return null;
  return { x: values[0], y: values[1], w: values[2], h: values[3] };
}

function rectFromSequence(value) {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return null;
  if (value.length < 4) return null;
  return finiteRect(value[0], value[1], value[2], value[3]);
}

function measuredGraphRect(node) {
  if (typeof node?.getBounding !== "function") return null;
  try {
    return rectFromSequence(node.getBounding());
  } catch {
    return null;
  }
}

function graphRectFromDom(node, canvas, documentRef) {
  if (node?.id == null || !canvas?.canvas || !documentRef?.querySelector) return null;
  const escapedId = String(node.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const nodeElement = documentRef.querySelector(`[data-testid="node-body-${escapedId}"]`)?.closest?.(".lg-node")
    || documentRef.querySelector(`[data-testid="node-${escapedId}"]`);
  const nodeRect = nodeElement?.getBoundingClientRect?.();
  const canvasRect = canvas.canvas.getBoundingClientRect?.();
  const nodeBox = nodeRect && finiteRect(nodeRect.x ?? nodeRect.left, nodeRect.y ?? nodeRect.top, nodeRect.width, nodeRect.height);
  const canvasBox = canvasRect && finiteRect(canvasRect.x ?? canvasRect.left, canvasRect.y ?? canvasRect.top, canvasRect.width, canvasRect.height);
  const scale = Number(canvas.ds?.scale);
  const offset = canvas.ds?.offset;
  if (!nodeBox || !canvasBox || !Number.isFinite(scale) || scale <= 0 || !Array.isArray(offset)) return null;
  const offsetX = Number(offset[0]);
  const offsetY = Number(offset[1]);
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
  return {
    x: (nodeBox.x - canvasBox.x) / scale - offsetX,
    y: (nodeBox.y - canvasBox.y) / scale - offsetY,
    w: nodeBox.w / scale,
    h: nodeBox.h / scale,
  };
}

function compatibilityBoundingRect(node) {
  return rectFromSequence(node?.boundingRect);
}

function logicalGraphRect(node, titleHeight = 0) {
  const x = Number(node?.pos?.[0]);
  const y = Number(node?.pos?.[1]);
  const width = Number(node?.size?.[0]);
  const height = Number(node?.size?.[1]);
  const title = Math.max(0, Number(titleHeight) || 0);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y: y - title, w: width, h: height + title };
}

/**
 * Resolve the graph-space rectangle that represents the node as currently shown.
 *
 * Priority is intentionally visual-first:
 * 1. node.getBounding() - native runtime measurement; collapse-aware.
 * 2. Nodes 2.0 DOM box - live rendered dimensions.
 * 3. node.boundingRect - compatibility metadata when no live measurement exists.
 * 4. node.pos/node.size - persistence fallback.
 */
export function resolveNodeVisualBounds({ node, canvas = null, documentRef = null, titleHeight = 0 } = {}) {
  return measuredGraphRect(node)
    || graphRectFromDom(node, canvas, documentRef)
    || compatibilityBoundingRect(node)
    || logicalGraphRect(node, titleHeight);
}
