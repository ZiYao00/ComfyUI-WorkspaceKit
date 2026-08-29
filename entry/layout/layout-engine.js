const EPSILON = 1e-9;

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) <= EPSILON;
}

function validTarget(target) {
  const b = target?.visualBounds;
  const l = target?.logicalBounds;
  return Boolean(
    target?.id
    && b
    && l
    && [b.left, b.top, b.right, b.bottom, b.width, b.height, l.left, l.top, l.width, l.height]
      .every((value) => Number.isFinite(Number(value))),
  );
}

function baseChange(target) {
  return {
    id: target.id,
    kind: target.kind,
    sourceId: target.sourceId,
    from: {
      x: target.logicalBounds.left,
      y: target.logicalBounds.top,
      width: target.logicalBounds.width,
      height: target.logicalBounds.height,
    },
    to: {
      x: target.logicalBounds.left,
      y: target.logicalBounds.top,
      width: target.logicalBounds.width,
      height: target.logicalBounds.height,
    },
  };
}

function finalize(changes, operation) {
  const filtered = changes.filter((change) =>
    !nearlyEqual(change.from.x, change.to.x)
    || !nearlyEqual(change.from.y, change.to.y)
    || !nearlyEqual(change.from.width, change.to.width)
    || !nearlyEqual(change.from.height, change.to.height));
  return Object.freeze({
    ok: true,
    operation,
    changes: Object.freeze(filtered.map((change) => Object.freeze({
      ...change,
      from: Object.freeze({ ...change.from }),
      to: Object.freeze({ ...change.to }),
    }))),
  });
}

function fail(operation, reason, extra = {}) {
  return Object.freeze({ ok: false, operation, reason, changes: Object.freeze([]), ...extra });
}

function movableTargets(targets) {
  return targets.filter((target) => validTarget(target) && target.movable !== false);
}

function resizableTargets(targets) {
  return targets.filter((target) => validTarget(target) && target.resizable === true);
}

function translateChange(target, dx = 0, dy = 0) {
  const change = baseChange(target);
  change.to.x += dx;
  change.to.y += dy;
  return change;
}

function align(targets, operation, axis, mode) {
  const items = movableTargets(targets);
  if (items.length < 2) return fail(operation, "minimum-selection", { minimumSelection: 2 });

  let reference;
  if (axis === "x") {
    if (mode === "start") reference = Math.min(...items.map((target) => target.visualBounds.left));
    else if (mode === "end") reference = Math.max(...items.map((target) => target.visualBounds.right));
    else {
      const left = Math.min(...items.map((target) => target.visualBounds.left));
      const right = Math.max(...items.map((target) => target.visualBounds.right));
      reference = (left + right) / 2;
    }
  } else {
    if (mode === "start") reference = Math.min(...items.map((target) => target.visualBounds.top));
    else if (mode === "end") reference = Math.max(...items.map((target) => target.visualBounds.bottom));
    else {
      const top = Math.min(...items.map((target) => target.visualBounds.top));
      const bottom = Math.max(...items.map((target) => target.visualBounds.bottom));
      reference = (top + bottom) / 2;
    }
  }

  const changes = items.map((target) => {
    const b = target.visualBounds;
    let delta;
    if (axis === "x") {
      if (mode === "start") delta = reference - b.left;
      else if (mode === "end") delta = reference - b.right;
      else delta = reference - (b.left + b.right) / 2;
      return translateChange(target, delta, 0);
    }
    if (mode === "start") delta = reference - b.top;
    else if (mode === "end") delta = reference - b.bottom;
    else delta = reference - (b.top + b.bottom) / 2;
    return translateChange(target, 0, delta);
  });
  return finalize(changes, operation);
}

function distribute(targets, operation, axis) {
  const items = movableTargets(targets);
  if (items.length < 3) return fail(operation, "minimum-selection", { minimumSelection: 3 });
  const ordered = [...items].sort((left, right) => {
    const leftStart = axis === "x" ? left.visualBounds.left : left.visualBounds.top;
    const rightStart = axis === "x" ? right.visualBounds.left : right.visualBounds.top;
    if (!nearlyEqual(leftStart, rightStart)) return leftStart - rightStart;
    return String(left.id).localeCompare(String(right.id));
  });
  const first = axis === "x" ? ordered[0].visualBounds.left : ordered[0].visualBounds.top;
  const lastBounds = ordered.at(-1).visualBounds;
  const last = axis === "x" ? lastBounds.right : lastBounds.bottom;
  const totalSize = ordered.reduce((sum, target) =>
    sum + (axis === "x" ? target.visualBounds.width : target.visualBounds.height), 0);
  const gap = (last - first - totalSize) / (ordered.length - 1);
  let cursor = first;
  const changes = [];
  for (const target of ordered) {
    const start = axis === "x" ? target.visualBounds.left : target.visualBounds.top;
    const delta = cursor - start;
    changes.push(translateChange(target, axis === "x" ? delta : 0, axis === "y" ? delta : 0));
    cursor += (axis === "x" ? target.visualBounds.width : target.visualBounds.height) + gap;
  }
  return finalize(changes, operation);
}

function fixedSpacing(targets, operation, axis, spacing) {
  const items = movableTargets(targets);
  if (items.length < 2) return fail(operation, "minimum-selection", { minimumSelection: 2 });
  const numericSpacing = Number(spacing);
  if (!Number.isFinite(numericSpacing) || numericSpacing < 0) return fail(operation, "invalid-spacing");
  const ordered = [...items].sort((left, right) => {
    const leftStart = axis === "x" ? left.visualBounds.left : left.visualBounds.top;
    const rightStart = axis === "x" ? right.visualBounds.left : right.visualBounds.top;
    if (!nearlyEqual(leftStart, rightStart)) return leftStart - rightStart;
    return String(left.id).localeCompare(String(right.id));
  });
  let cursor = axis === "x" ? ordered[0].visualBounds.left : ordered[0].visualBounds.top;
  const changes = [];
  for (const target of ordered) {
    const start = axis === "x" ? target.visualBounds.left : target.visualBounds.top;
    const delta = cursor - start;
    changes.push(translateChange(target, axis === "x" ? delta : 0, axis === "y" ? delta : 0));
    cursor += (axis === "x" ? target.visualBounds.width : target.visualBounds.height) + numericSpacing;
  }
  return finalize(changes, operation);
}

function resize(targets, operation, widthMode = null, heightMode = null) {
  const all = targets.filter(validTarget);
  if (all.length < 2) return fail(operation, "minimum-selection", { minimumSelection: 2 });
  const items = resizableTargets(all);
  if (items.length < 2) return fail(operation, "minimum-resizable-selection", { minimumSelection: 2 });

  const widths = items.map((target) => target.logicalBounds.width);
  const heights = items.map((target) => target.logicalBounds.height);
  const nextWidth = widthMode === "max" ? Math.max(...widths)
    : widthMode === "min" ? Math.min(...widths)
      : null;
  const nextHeight = heightMode === "max" ? Math.max(...heights)
    : heightMode === "min" ? Math.min(...heights)
      : null;

  const changes = items.map((target) => {
    const change = baseChange(target);
    if (nextWidth != null) change.to.width = nextWidth;
    if (nextHeight != null) change.to.height = nextHeight;
    return change;
  });
  return finalize(changes, operation);
}

export const LAYOUT_OPERATIONS = Object.freeze({
  ALIGN_LEFT: "align-left",
  ALIGN_CENTER_X: "align-center-x",
  ALIGN_RIGHT: "align-right",
  ALIGN_TOP: "align-top",
  ALIGN_CENTER_Y: "align-center-y",
  ALIGN_BOTTOM: "align-bottom",
  DISTRIBUTE_HORIZONTAL: "distribute-horizontal",
  DISTRIBUTE_VERTICAL: "distribute-vertical",
  SPACING_HORIZONTAL: "spacing-horizontal",
  SPACING_VERTICAL: "spacing-vertical",
  SIZE_MAX_WIDTH: "size-max-width",
  SIZE_MIN_WIDTH: "size-min-width",
  SIZE_MAX_HEIGHT: "size-max-height",
  SIZE_MIN_HEIGHT: "size-min-height",
  SIZE_MAX_BOTH: "size-max-both",
});

/** Pure Layout Engine: normalized targets in, immutable ChangeSet out. */
export function calculateLayout(targets, operation, options = {}) {
  const source = Array.isArray(targets) ? targets : [];
  switch (operation) {
    case LAYOUT_OPERATIONS.ALIGN_LEFT:
      return align(source, operation, "x", "start");
    case LAYOUT_OPERATIONS.ALIGN_CENTER_X:
      return align(source, operation, "x", "center");
    case LAYOUT_OPERATIONS.ALIGN_RIGHT:
      return align(source, operation, "x", "end");
    case LAYOUT_OPERATIONS.ALIGN_TOP:
      return align(source, operation, "y", "start");
    case LAYOUT_OPERATIONS.ALIGN_CENTER_Y:
      return align(source, operation, "y", "center");
    case LAYOUT_OPERATIONS.ALIGN_BOTTOM:
      return align(source, operation, "y", "end");
    case LAYOUT_OPERATIONS.DISTRIBUTE_HORIZONTAL:
      return distribute(source, operation, "x");
    case LAYOUT_OPERATIONS.DISTRIBUTE_VERTICAL:
      return distribute(source, operation, "y");
    case LAYOUT_OPERATIONS.SPACING_HORIZONTAL:
      return fixedSpacing(source, operation, "x", options.spacing ?? 32);
    case LAYOUT_OPERATIONS.SPACING_VERTICAL:
      return fixedSpacing(source, operation, "y", options.spacing ?? 32);
    case LAYOUT_OPERATIONS.SIZE_MAX_WIDTH:
      return resize(source, operation, "max", null);
    case LAYOUT_OPERATIONS.SIZE_MIN_WIDTH:
      return resize(source, operation, "min", null);
    case LAYOUT_OPERATIONS.SIZE_MAX_HEIGHT:
      return resize(source, operation, null, "max");
    case LAYOUT_OPERATIONS.SIZE_MIN_HEIGHT:
      return resize(source, operation, null, "min");
    case LAYOUT_OPERATIONS.SIZE_MAX_BOTH:
      return resize(source, operation, "max", "max");
    default:
      return fail(operation, "unknown-operation");
  }
}
