/*
 * T-038: whole-frame visuals for a group in "ignore" (bypass) or "disable"
 * (mute) state.
 *
 * The values are not invented — they are ComfyUI's own node-level visual
 * language, copied so a group and the nodes inside it never disagree. From the
 * frontend (recorded with source snippets in docs/NATIVE_BEHAVIOR_REFERENCE.md
 * §4):
 *
 *   getNodeModeAlpha(n) { ... n.mode === BYPASS ? .2 : n.mode === NEVER ? .4 ... }
 *   NODE_DEFAULT_BYPASS_COLOR = '#FF00FF'
 *
 * So: magenta means "ignored", faded means "deactivated", and ignore is fainter
 * than disable (.2 < .4). Before this, a bypassed WorkspaceKit frame used a
 * purple 280° border of its own invention while its member nodes went magenta —
 * the frame and its contents told the user two different stories.
 *
 * The magenta is theme-overridable (`NODE_BYPASS_BGCOLOR` is part of the theme
 * colour-palette schema), so the caller reads the live value and passes it in;
 * `resolveBypassColor` only normalises it and supplies the fallback. Hardcoding
 * would make the frame clash with its nodes under any theme that overrides it.
 *
 * Deliberately not modelled here: the border. Nodes have no border analogue, so
 * native says nothing about it. Leaving it at the old purple while the title bar
 * turned magenta looked like a bug, so the caller tints the border with the same
 * colour — an extension of the native language, not a contradiction of it.
 */

export const GROUP_MODE_STATE = Object.freeze({
    BYPASS: "bypass",
    MUTE: "mute",
    NORMAL: "normal",
});

// Straight from getNodeModeAlpha. NORMAL is 1 rather than `editor_alpha`
// because the frame is a DOM overlay: it is not drawn through the canvas
// context that editor_alpha multiplies.
export const GROUP_MODE_ALPHA = Object.freeze({
    [GROUP_MODE_STATE.BYPASS]: 0.2,
    [GROUP_MODE_STATE.MUTE]: 0.4,
    [GROUP_MODE_STATE.NORMAL]: 1,
});

export const FALLBACK_BYPASS_COLOR = "#FF00FF";

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Normalise a runtime `NODE_BYPASS_BGCOLOR` (or equivalent) into a 6-digit hex
 * string. Anything unusable — missing, malformed, a non-string — falls back to
 * ComfyUI's own default rather than throwing or yielding an invalid colour that
 * the browser would silently drop.
 */
export function resolveBypassColor(runtimeValue) {
    const raw = typeof runtimeValue === "string" ? runtimeValue.trim() : "";
    const match = raw.match(HEX_PATTERN);
    if (!match) return FALLBACK_BYPASS_COLOR;
    const body = match[1];
    const full = body.length === 3
        ? body.split("").map(ch => ch + ch).join("")
        : body;
    return `#${full.toUpperCase()}`;
}

/** 6-digit or 3-digit hex → {r,g,b}. Invalid input yields the fallback magenta. */
export function hexToRgbTriplet(hex) {
    const normalized = resolveBypassColor(hex);
    return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
    };
}

/**
 * Decide the frame's whole-box treatment.
 *
 * `bypassed` is the older per-group flag that predates `executionMode`; both
 * mechanisms still exist and both mean "ignored", so either one selects the
 * bypass treatment. Bypass wins over mute when somehow both are set, matching
 * the native alpha table's ordering.
 *
 * Returns `tintColor: null` for mute and normal because native replaces the
 * background colour only for bypass — disable is a pure opacity change.
 */
export function resolveGroupModeVisuals(state) {
    const source = state && typeof state === "object" ? state : {};
    const mode = typeof source.executionMode === "string" ? source.executionMode : "";
    const isBypass = Boolean(source.bypassed) || mode === GROUP_MODE_STATE.BYPASS;
    const resolved = isBypass
        ? GROUP_MODE_STATE.BYPASS
        : mode === GROUP_MODE_STATE.MUTE
            ? GROUP_MODE_STATE.MUTE
            : GROUP_MODE_STATE.NORMAL;
    return {
        state: resolved,
        alpha: GROUP_MODE_ALPHA[resolved],
        tintColor: resolved === GROUP_MODE_STATE.BYPASS
            ? resolveBypassColor(source.bypassColor)
            : null,
    };
}

/**
 * The paint for the canvas-drawn body fill under the same mode.
 *
 * The fill lives on the canvas (beneath the nodes) while the border and title
 * bar are DOM, so the DOM `opacity` that dims the box cannot reach it. Without
 * multiplying the alpha here, a bypassed frame with background fill enabled
 * would show a full-strength body under a 20%-opacity border, which reads as a
 * rendering fault rather than a state.
 *
 * `rgb`/`alpha` are passed in already parsed so this module needs no colour
 * string parsing of its own — the caller owns the rgba() format.
 */
export function resolveGroupFillPaint(input) {
    const source = input && typeof input === "object" ? input : {};
    const visuals = source.visuals && typeof source.visuals === "object"
        ? source.visuals
        : resolveGroupModeVisuals(null);
    const baseRgb = source.rgb && typeof source.rgb === "object" ? source.rgb : { r: 0, g: 0, b: 0 };
    const channel = value => {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(255, Math.round(n)));
    };
    const baseAlpha = Number(source.alpha);
    const safeAlpha = Number.isFinite(baseAlpha) ? Math.max(0, Math.min(1, baseAlpha)) : 0;
    const modeAlpha = Number.isFinite(visuals.alpha) ? visuals.alpha : 1;
    const rgb = visuals.tintColor ? hexToRgbTriplet(visuals.tintColor) : baseRgb;
    return {
        r: channel(rgb.r),
        g: channel(rgb.g),
        b: channel(rgb.b),
        alpha: Math.max(0, Math.min(1, safeAlpha * modeAlpha)),
    };
}
