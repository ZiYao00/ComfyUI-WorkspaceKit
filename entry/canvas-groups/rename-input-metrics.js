// Pixel metrics for the transient rename `<input>` that replaces a group's
// title text.
//
// Two things were wrong before T-036 and both come from the same cause: the
// input is created in `startRename`, outside the per-frame `updatePositions()`
// loop, so nothing re-derived its size from the canvas scale.
//
//   1. Width was a hardcoded `120px`. At a small zoom that overflowed the
//      title area; at a large zoom it occupied a sliver of it.
//   2. Font size was the raw `group.fontSize`, so the text stayed at screen
//      size while the frame around it shrank or grew.
//
// Width is deliberately NOT returned here. It is solved in CSS by making the
// input a flex child (`flex: 1 1 auto; min-width: 0`) of the header's title
// wrapper, which already sits left of the action-icon group — the browser then
// fits it to the space actually available at any zoom, with no arithmetic to
// drift out of sync with the icons.
const MIN_DEVICE_PX = 1;

export function resolveRenameInputMetrics(state) {
  const source = state && typeof state === "object" ? state : {};
  const scale = Number(source.scale);
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const baseFont = Number(source.fontSize);
  const safeFont = Number.isFinite(baseFont) && baseFont > 0 ? baseFont : 14;

  // Match the title span exactly — updatePositions() sets it to
  // `(fontSize || 14) * scale`. No floor is applied: a clamp would diverge from
  // the span at small zooms and make the title visibly jump when edit mode
  // opens, which is worse than a small box the user zoomed out to get. The
  // remaining metrics keep a 1-pixel floor so the border never vanishes.
  const fontSize = safeFont * safeScale;
  return {
    fontSize,
    paddingV: Math.max(MIN_DEVICE_PX, 1 * safeScale),
    paddingH: Math.max(MIN_DEVICE_PX, 4 * safeScale),
    borderRadius: Math.max(MIN_DEVICE_PX, 3 * safeScale),
    borderWidth: Math.max(MIN_DEVICE_PX, 1 * safeScale),
  };
}
