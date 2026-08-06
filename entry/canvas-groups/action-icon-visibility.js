/*
 * T-038 / T-039: when the five title-bar action icons are visible, and how solid
 * the execute icon is.
 *
 * Why this cannot be CSS `:hover`
 * -------------------------------
 * The trigger the user asked for is "the pointer is anywhere inside the frame",
 * not "the pointer is on the title bar". But `.xzg-group-body` is deliberately
 * `pointer-events: none` — that is what keeps the nodes inside a frame
 * clickable, since the overlay sits above every node pixel. So the frame's own
 * middle never receives a mouse event and cannot report hover. Visibility has to
 * be decided geometrically, from the pointer position against the frame bounds,
 * re-evaluated every frame (the graph can move under a stationary pointer during
 * a canvas pan, a node drag, or a zoom).
 *
 * Why `visibility` and not `display`
 * ----------------------------------
 * Hiding the icons with `display:none` would collapse their width and let the
 * title text slide right, so the title would jump every time the pointer crossed
 * the frame edge. `visibility:hidden` keeps the layout box. The user accepted
 * that a short title therefore looks slightly sparse.
 *
 * Why the icons stay visible during a gesture
 * -------------------------------------------
 * While dragging or resizing, the pointer routinely leaves the frame it is
 * acting on (a fast drag outruns the frame; a resize pulls the corner past the
 * cursor). Hiding the icons mid-gesture would make the title bar flicker, so an
 * active gesture pins them visible regardless of pointer position.
 */

export const ACTION_ICON_VISIBILITY = Object.freeze({
    VISIBLE: "visible",
    HIDDEN: "hidden",
});

/**
 * Is a point inside a frame's bounds? Inclusive on all four edges, so the icons
 * do not blink when the pointer rides exactly along the border.
 *
 * The caller passes canvas-space values for both, so this needs no knowledge of
 * zoom or pan.
 */
export function isPointInsideBounds(bounds, point) {
    if (!bounds || typeof bounds !== "object") return false;
    if (!point || typeof point !== "object") return false;
    const x = Number(point.x);
    const y = Number(point.y);
    const bx = Number(bounds.x);
    const by = Number(bounds.y);
    const bw = Number(bounds.w);
    const bh = Number(bounds.h);
    if (![x, y, bx, by, bw, bh].every(Number.isFinite)) return false;
    if (bw <= 0 || bh <= 0) return false;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

/**
 * The visibility of the five action icons for one frame.
 *
 * An open rename box also pins them: the user is typing inside the title bar and
 * may well have moved the mouse away, but the icons vanishing underneath an
 * active text field looks broken.
 */
export function resolveActionIconVisibility(state) {
    const source = state && typeof state === "object" ? state : {};
    if (source.isGesturing || source.isRenaming) return ACTION_ICON_VISIBILITY.VISIBLE;
    return source.pointerInside
        ? ACTION_ICON_VISIBILITY.VISIBLE
        : ACTION_ICON_VISIBILITY.HIDDEN;
}

// T-039: the execute icon dims when the group holds nothing that can produce an
// image. This is the same judgement the click path already makes — it counts the
// group's output nodes and shows a notice when there are none — so a dim icon and
// the notice can never disagree. 0.35 is faint enough to read as unavailable
// while leaving the glyph identifiable.
export const QUEUE_ICON_OPACITY = Object.freeze({
    EXECUTABLE: 1,
    EMPTY: 0.35,
});

/**
 * Opacity for the execute icon, given how many output nodes the group has.
 *
 * A negative or malformed count is treated as "none": a wrong reading should
 * dim an icon, never promise an execution that will then fail.
 */
export function resolveQueueIconOpacity(outputNodeCount) {
    const count = Number(outputNodeCount);
    if (!Number.isFinite(count) || count <= 0) return QUEUE_ICON_OPACITY.EMPTY;
    return QUEUE_ICON_OPACITY.EXECUTABLE;
}
