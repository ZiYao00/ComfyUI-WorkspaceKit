function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function boundsFromRect(left, top, width, height) {
  if (![left, top, width, height].every(finite) || width < 0 || height < 0) return null;
  return Object.freeze({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  });
}

function measuredNodeBounds(node) {
  if (typeof node?.getBounding !== "function") return null;
  try {
    const measured = node.getBounding();
    if (!Array.isArray(measured) && !ArrayBuffer.isView(measured)) return null;
    const [left, top, width, height] = measured;
    return boundsFromRect(Number(left), Number(top), Number(width), Number(height));
  } catch {
    return null;
  }
}

/**
 * Normalize a ComfyUI node into the immutable geometry consumed by Layout.
 * Visual bounds intentionally prefer getBounding() so collapsed nodes align by
 * what the user sees while stored size remains available for size commands.
 */
export function normalizeNodeLayoutTarget(node) {
  const x = Number(node?.pos?.[0]);
  const y = Number(node?.pos?.[1]);
  const width = Number(node?.size?.[0]);
  const height = Number(node?.size?.[1]);
  if (node?.id == null || ![x, y, width, height].every(finite) || width < 0 || height < 0) {
    return null;
  }
  const logicalBounds = boundsFromRect(x, y, width, height);
  const visualBounds = measuredNodeBounds(node) ?? logicalBounds;
  return Object.freeze({
    id: `node:${String(node.id)}`,
    sourceId: String(node.id),
    kind: "node",
    position: Object.freeze({ x, y }),
    size: Object.freeze({ width, height }),
    logicalBounds,
    visualBounds,
    movable: true,
    resizable: true,
    collapsed: Boolean(node.flags?.collapsed),
  });
}

export function normalizeRectLayoutTarget({ id, sourceId = id, kind, x, y, width, height, movable = true, resizable = false }) {
  const numeric = [x, y, width, height].map(Number);
  if (!id || !kind || !numeric.every(finite) || numeric[2] < 0 || numeric[3] < 0) return null;
  const logicalBounds = boundsFromRect(...numeric);
  return Object.freeze({
    id: String(id),
    sourceId: String(sourceId),
    kind: String(kind),
    position: Object.freeze({ x: numeric[0], y: numeric[1] }),
    size: Object.freeze({ width: numeric[2], height: numeric[3] }),
    logicalBounds,
    visualBounds: logicalBounds,
    movable: Boolean(movable),
    resizable: Boolean(resizable),
    collapsed: false,
  });
}

export function visualCenter(target, axis) {
  const bounds = target?.visualBounds;
  if (!bounds) return NaN;
  return axis === "x"
    ? (bounds.left + bounds.right) / 2
    : (bounds.top + bounds.bottom) / 2;
}
