/*
 * T-044: how a native group colour is shown versus how it is stored.
 *
 * LiteGraph's `node_colors[*].groupcolor` palette is the source of truth for
 * colour *identity* — rgthree's `matchColors` filter and WK ⇄ native conversion
 * both compare that exact hex.  But five of the nine entries are decade-old
 * three-digit shorthands whose channels all sit between 0x88 and 0xAA:
 *
 *   red   #A88 → #aa8888      green #8A8 → #88aa88
 *   blue  #88A → #8888aa      cyan  #8AA → #88aaaa
 *   black #444 → #444444
 *
 * Measured live (2026-08-06).  Side by side with the four modern entries
 * (brown #b06634, pale_blue #3f789e, purple #a1309b, yellow #b58b2a) the row
 * reads as half-vivid half-grey, and red/green/blue/cyan are nearly
 * indistinguishable from one another.
 *
 * So display and storage are split:
 *
 *   - the swatch and the frame paint a brightened colour
 *   - the workflow stores the untouched native hex
 *
 * which keeps rgthree's colour filter and native conversion agreeing on
 * identity while the canvas stops looking muddy.
 *
 * Two rules this module must keep:
 *
 *   1. HUE IS NEVER TOUCHED.  Only saturation and lightness move.  A shifted
 *      hue would make "red" not read as red after a native round-trip, which
 *      is exactly the mismatch this split exists to avoid.
 *   2. Only the muddy entries are adjusted.  The four modern hexes already
 *      have usable saturation; brightening them too would drag the whole
 *      palette off-tone.
 *
 * `black` is a deliberate exception, per the user's own measurement: it stays
 * dark rather than becoming mid-grey, because a dark swatch carries the
 * "low priority / done" meaning a brightened one would lose.
 */

// Native hex → display treatment. Keyed by the normalized six-digit form of
// LiteGraph's `groupcolor`, so a palette change upstream simply stops matching
// and the native hex shows through unmodified.
const DISPLAY_OVERRIDES = Object.freeze({
    // The four low-saturation shorthands. Saturation is raised far enough to
    // tell them apart at swatch size; lightness is pulled down slightly so the
    // colour reads on a dark canvas.
    "#aa8888": Object.freeze({ sat: 62, lit: 58 }),
    "#88aa88": Object.freeze({ sat: 46, lit: 54 }),
    "#8888aa": Object.freeze({ sat: 52, lit: 60 }),
    "#88aaaa": Object.freeze({ sat: 46, lit: 52 }),
    // black: the user's measured values — a true black title bar at the 50%
    // opacity cap, with a mid-grey font so the title stays legible. Kept dark
    // on purpose; no saturation treatment (a grey has no hue to saturate).
    "#444444": Object.freeze({ hex: "#000000", titleColor: "#828282" }),
});

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const expandHex = (value) => {
    const match = String(value || "").trim().toLowerCase().match(HEX_PATTERN);
    if (!match) return null;
    const body = match[1].length === 3
        ? [...match[1]].map((channel) => channel + channel).join("")
        : match[1];
    return `#${body}`;
};

const hexToRgb = (hex) => {
    const expanded = expandHex(hex);
    if (!expanded) return null;
    return {
        r: parseInt(expanded.slice(1, 3), 16),
        g: parseInt(expanded.slice(3, 5), 16),
        b: parseInt(expanded.slice(5, 7), 16),
    };
};

const rgbToHex = ({ r, g, b }) => `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;

// sRGB → HSL with H in [0,360), S/L in [0,100].
export function hexToHsl(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const l = (max + min) / 2;
    if (delta === 0) return { h: 0, s: 0, l: l * 100 };
    const s = delta / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
    return { h, s: s * 100, l: l * 100 };
}

// HSL → sRGB hex. Mirrors the main module's own conversion so a display colour
// derived here matches one derived there.
export function hslToHex(h, s, l) {
    const hue = ((Number(h) % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(1, Number(s) / 100));
    const lit = Math.max(0, Math.min(1, Number(l) / 100));
    const a = sat * Math.min(lit, 1 - lit);
    const channel = (n) => {
        const k = (n + hue / 30) % 12;
        return Math.round(255 * (lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
    };
    return rgbToHex({ r: channel(0), g: channel(8), b: channel(4) });
}

/**
 * The colour to PAINT for a stored native hex.
 *
 * Returns the input unchanged when the hex is not one of the muddy entries, so
 * a user's custom colour and the four modern native entries pass straight
 * through. Hue is preserved for every adjusted entry.
 */
export function displayColorForNativeHex(nativeHex) {
    const expanded = expandHex(nativeHex);
    if (!expanded) return null;
    const override = DISPLAY_OVERRIDES[expanded];
    if (!override) return expanded;
    if (override.hex) return expanded === override.hex ? expanded : override.hex;
    const hsl = hexToHsl(expanded);
    if (!hsl) return expanded;
    return hslToHex(hsl.h, override.sat, override.lit);
}

/**
 * The title colour a preset dictates, or null to let the usual
 * luminance-based choice apply.
 *
 * Only `black` pins its own font colour: brightening is off the table for it,
 * so the readable-font rule would pick white on near-black and lose the
 * "muted" look the dark swatch exists for.
 */
export function titleColorForNativeHex(nativeHex) {
    const expanded = expandHex(nativeHex);
    if (!expanded) return null;
    return DISPLAY_OVERRIDES[expanded]?.titleColor || null;
}

/**
 * The header alpha a preset dictates, or null for "keep the current alpha".
 *
 * `black` needs the cap: at the default 25% a near-black title bar is barely
 * distinguishable from the canvas.
 */
export function headerOpacityForNativeHex(nativeHex, maxOpacity) {
    const expanded = expandHex(nativeHex);
    if (!expanded) return null;
    if (!DISPLAY_OVERRIDES[expanded]?.titleColor) return null;
    const max = Number(maxOpacity);
    return Number.isFinite(max) && max > 0 ? max : null;
}

/*
 * The tenth swatch.
 *
 * LiteGraph exposes nine group colours, so WK adds one. The previous filler
 * was #cfafaf — a washed pink one step from red's #aa8888, which is part of
 * why the row looked shuffled rather than ordered.
 *
 * Measured hues of the nine native entries: red 0°, brown 25°, yellow 45°,
 * green 120°, cyan 180°, pale_blue 202°, blue 240°, purple 303°, black (none).
 * The widest gap is the 57° between purple and red, so the tenth sits at ~330°
 * — a rose that collides with nothing and is the palette's only warm pink.
 *
 * It has NO native colour name. rgthree's `matchColors` looks a word up in
 * `LGraphCanvas.node_colors` and, failing that, treats it as a hex — so a made
 * up name like "other" becomes the colour `#other`, matches nothing, and fails
 * silently. Double-clicking this swatch must therefore copy the hex.
 */
export const CUSTOM_PRESET_COLOR = Object.freeze({
    key: "rose",
    hex: "#e0508f",
    hasNativeName: false,
});

/**
 * What double-clicking a swatch puts on the clipboard.
 *
 * Native entries copy their colour NAME (`red`, `pale_blue`) because that is
 * what a user would type into rgthree's filter and it survives a palette
 * retune. WK's own swatch has no name, so it copies its hex — which rgthree
 * also accepts.
 */
export function clipboardValueForPreset(preset) {
    if (!preset || typeof preset !== "object") return null;
    const key = typeof preset.key === "string" ? preset.key.trim() : "";
    if (preset.source === "litegraph" && key) return key;
    const hex = expandHex(preset.hex);
    return hex || (key || null);
}

/**
 * Whether a preset copies a name (true) or a raw hex (false).
 * Drives which hover hint the swatch shows.
 */
export function presetCopiesNativeName(preset) {
    return clipboardValueForPreset(preset) === (typeof preset?.key === "string" ? preset.key.trim() : null)
        && preset?.source === "litegraph";
}

/*
 * T-045: bring style presets saved before the 1px default forward.
 *
 * A stored preset overrides the built-in style, so a user who had ever saved one
 * kept getting the old 2px border no matter what the built-in default said.
 * That is how "new groups are still not 1px" was reported after the default had
 * in fact been changed — the default was right and the stored preset was
 * winning.
 *
 * The rewrite is deliberately narrow:
 *
 *   - only `borderWidth`, never any other field
 *   - only when the stored value is exactly the legacy one
 *   - runs once, gated by a flag the caller persists
 *
 * so a width the user deliberately chose — 0, 3, 4, 5 — survives. A user who
 * had picked 2 on purpose loses that one value; that is the unavoidable cost of
 * not being able to distinguish it from the old default, and it is recoverable
 * with one slider drag.
 */
export function migrateLegacyPresetBorderWidth(presets, { from, to }) {
    if (!Array.isArray(presets)) return { presets, changed: false };
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
        return { presets, changed: false };
    }
    let changed = false;
    const migrated = presets.map((preset) => {
        if (!preset || typeof preset !== "object") return preset;
        if (preset.borderWidth !== from) return preset;
        changed = true;
        return { ...preset, borderWidth: to };
    });
    return { presets: changed ? migrated : presets, changed };
}
