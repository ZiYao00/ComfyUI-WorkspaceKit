// Resolve the visual bounds that a WorkspaceKit group must contain.
//
// Legacy Canvas exposes useful node.size values. Nodes 2.0 keeps that graph
// metadata for compatibility but its DOM node can be taller/wider after Vue
// renders widgets. A narrow, fail-open DOM probe lets group geometry match the
// actual node without changing graph persistence or gesture ownership.

function finiteRect(rect) {
  if (!rect) return null;
  const x = Number(rect.x ?? rect.left);
  const y = Number(rect.y ?? rect.top);
  const width = Number(rect.width ?? rect.w);
  const height = Number(rect.height ?? rect.h);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, w: width, h: height };
}

function graphRectFromDom(node, canvas, documentRef) {
  if (!node?.id || !canvas?.canvas || !documentRef?.querySelector) return null;
  // Nodes 2.0 exposes stable test ids for the node body/header; their closest
  // `.lg-node` is the complete rendered box. This is an optional enhancement
  // only: absent/changed markup falls through to graph metadata below.
  const escapedId = String(node.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const nodeElement = documentRef.querySelector(`[data-testid="node-body-${escapedId}"]`)?.closest?.(".lg-node")
    || documentRef.querySelector(`[data-testid="node-${escapedId}"]`);
  const nodeRect = finiteRect(nodeElement?.getBoundingClientRect?.());
  const canvasRect = finiteRect(canvas.canvas.getBoundingClientRect?.());
  const scale = Number(canvas.ds?.scale);
  const offset = canvas.ds?.offset;
  if (!nodeRect || !canvasRect || !Number.isFinite(scale) || scale <= 0 || !Array.isArray(offset)) return null;
  const offsetX = Number(offset[0]);
  const offsetY = Number(offset[1]);
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return null;
  return {
    x: (nodeRect.x - canvasRect.x) / scale - offsetX,
    y: (nodeRect.y - canvasRect.y) / scale - offsetY,
    w: nodeRect.w / scale,
    h: nodeRect.h / scale,
  };
}

export function resolveNodeVisualBounds({ node, canvas, documentRef, titleHeight = 0 }) {
  const serialized = node?.boundingRect;
  if (Array.isArray(serialized) && serialized.length >= 4 && serialized.every((value) => Number.isFinite(Number(value)))) {
    const rect = {
      x: Number(serialized[0]),
      y: Number(serialized[1]),
      w: Number(serialized[2]),
      h: Number(serialized[3]),
    };
    // Nodes 2.0 currently exposes [0, 0, 0, 0] before DOM layout. It is a
    // placeholder, not a usable visual rectangle.
    if (rect.w > 0 && rect.h > 0) return rect;
  }

  const domRect = graphRectFromDom(node, canvas, documentRef);
  if (domRect) return domRect;

  if (!node?.pos || typeof node.pos[0] !== "number" || typeof node.pos[1] !== "number") return null;
  const width = Number(node.size?.[0]) || 200;
  const height = Number(node.size?.[1]) || 100;
  return { x: node.pos[0], y: node.pos[1] - titleHeight, w: width, h: height + titleHeight };
}
