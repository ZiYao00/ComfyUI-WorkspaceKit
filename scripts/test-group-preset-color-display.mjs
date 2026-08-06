import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    CUSTOM_PRESET_COLOR,
    clipboardValueForPreset,
    displayColorForNativeHex,
    headerOpacityForNativeHex,
    hexToHsl,
    hslToHex,
    migrateLegacyPresetBorderWidth,
    presetCopiesNativeName,
    titleColorForNativeHex,
} from "../entry/canvas-groups/preset-color-display.js";

/*
 * T-044: the store-native / paint-bright split for group colour presets.
 *
 * LiteGraph's palette is colour IDENTITY — rgthree's `matchColors` filter and
 * WK ⇄ native conversion both compare the exact hex. But five of nine entries
 * are decade-old three-digit shorthands whose channels all sit between 0x88 and
 * 0xAA, so red/green/blue/cyan are nearly indistinguishable at swatch size.
 *
 * Measured live on 2026-08-06:
 *   red #A88 → #aa8888   green #8A8 → #88aa88   blue #88A → #8888aa
 *   cyan #8AA → #88aaaa  black #444 → #444444
 *   brown #b06634  pale_blue #3f789e  purple #a1309b  yellow #b58b2a
 *
 * So the display colour is brightened while the stored hex stays native.
 */

const NATIVE_PALETTE = Object.freeze({
    red: "#aa8888",
    brown: "#b06634",
    green: "#88aa88",
    blue: "#8888aa",
    pale_blue: "#3f789e",
    cyan: "#88aaaa",
    purple: "#a1309b",
    yellow: "#b58b2a",
    black: "#444444",
});

// ── 1. Hue is never touched ──────────────────────────────────────────────────
//
// The load-bearing rule. A shifted hue would make "red" stop reading as red
// after a native round-trip, which is the exact mismatch this split avoids.

const BRIGHTENED = ["red", "green", "blue", "cyan"];
for (const name of BRIGHTENED) {
    const native = NATIVE_PALETTE[name];
    const display = displayColorForNativeHex(native);
    assert.notEqual(display, native, `${name} is one of the muddy shorthands and must be brightened`);
    const before = hexToHsl(native);
    const after = hexToHsl(display);
    assert.ok(Math.abs(before.h - after.h) < 1.5,
        `${name}: hue must survive brightening (${before.h.toFixed(1)}° → ${after.h.toFixed(1)}°)`);
    assert.ok(after.s > before.s,
        `${name}: saturation must rise (${before.s.toFixed(1)} → ${after.s.toFixed(1)}), that is the whole point`);
}

// ── 2. Only the muddy entries move ───────────────────────────────────────────
//
// The four modern hexes already have usable saturation. Brightening them too
// would drag the palette off-tone, so they must pass through byte-identical.

for (const name of ["brown", "pale_blue", "purple", "yellow"]) {
    const native = NATIVE_PALETTE[name];
    assert.equal(displayColorForNativeHex(native), native,
        `${name} already has usable saturation and must pass through untouched`);
}

// A colour the user picked themselves is not a preset and must never be altered.
for (const custom of ["#e0508f", "#123456", "#ffffff", "#010203"]) {
    assert.equal(displayColorForNativeHex(custom), custom,
        `a custom colour (${custom}) must never be rewritten by the display table`);
}

// Three-digit input is accepted and expanded — LiteGraph ships shorthands.
assert.equal(displayColorForNativeHex("#A88"), displayColorForNativeHex("#aa8888"),
    "shorthand and expanded forms of the same colour must map identically");
assert.equal(displayColorForNativeHex("A88"), displayColorForNativeHex("#aa8888"),
    "a missing leading # must not defeat the lookup");

// Unusable input yields null so callers can fall back rather than paint garbage.
for (const junk of [null, undefined, "", "red", "rgba(1,2,3,1)", "#12", "#1234567", {}, 42]) {
    assert.equal(displayColorForNativeHex(junk), null,
        `unusable input (${JSON.stringify(junk)}) must yield null, not a colour`);
}

// The display treatment must be stable: painting a brightened colour again
// (e.g. a re-render reading back the DOM) must not brighten it a second time.
for (const name of BRIGHTENED) {
    const once = displayColorForNativeHex(NATIVE_PALETTE[name]);
    assert.equal(displayColorForNativeHex(once), once,
        `${name}: brightening must be idempotent or repeated renders would drift`);
}

// ── 3. black is the deliberate exception ─────────────────────────────────────
//
// Per the user's own measurement: it stays dark rather than becoming mid-grey,
// because a dark swatch carries the "low priority / done" meaning a brightened
// one would lose. It pins its own font colour and header opacity instead.

assert.equal(displayColorForNativeHex(NATIVE_PALETTE.black), "#000000",
    "black paints as true black, not a brightened grey");
assert.equal(titleColorForNativeHex(NATIVE_PALETTE.black), "#828282",
    "black pins a mid-grey font so the title stays legible on near-black");
assert.equal(headerOpacityForNativeHex(NATIVE_PALETTE.black, 0.5), 0.5,
    "black pins the opacity cap: at 25% a near-black bar vanishes into the canvas");

// Every other preset leaves both to the usual rules.
for (const name of Object.keys(NATIVE_PALETTE)) {
    if (name === "black") continue;
    assert.equal(titleColorForNativeHex(NATIVE_PALETTE[name]), null,
        `${name} must let the luminance-based font choice apply`);
    assert.equal(headerOpacityForNativeHex(NATIVE_PALETTE[name], 0.5), null,
        `${name} must keep whatever opacity the user configured`);
}
assert.equal(titleColorForNativeHex("#e0508f"), null, "the custom rose pins no font colour");
assert.equal(headerOpacityForNativeHex("#e0508f", 0.5), null, "the custom rose pins no opacity");

// An unusable cap must not produce a broken alpha.
for (const bad of [null, undefined, NaN, 0, -1, "half"]) {
    assert.equal(headerOpacityForNativeHex(NATIVE_PALETTE.black, bad), null,
        `an unusable cap (${JSON.stringify(bad)}) must yield null, not a bad alpha`);
}
for (const junk of [null, "", "red", "#12"]) {
    assert.equal(titleColorForNativeHex(junk), null);
    assert.equal(headerOpacityForNativeHex(junk, 0.5), null);
}

// ── 4. The tenth swatch ──────────────────────────────────────────────────────
//
// LiteGraph ships nine group colours, so WK adds one. Measured native hues:
// red 0°, brown 25°, yellow 45°, green 120°, cyan 180°, pale_blue 202°,
// blue 240°, purple 303°, black (none). The widest gap is the 57° between
// purple and red, so the tenth sits there — the old #cfafaf filler was one step
// from red's #aa8888, which is part of why the row read as shuffled.

assert.equal(CUSTOM_PRESET_COLOR.hex, "#e0508f");
assert.equal(CUSTOM_PRESET_COLOR.hasNativeName, false,
    "the tenth swatch has no LiteGraph colour name; that is what forces a hex copy");
const customHue = hexToHsl(CUSTOM_PRESET_COLOR.hex).h;
assert.ok(customHue > 303 && customHue < 360,
    `the tenth colour must land in the purple→red gap, got ${customHue.toFixed(1)}°`);
for (const [name, hex] of Object.entries(NATIVE_PALETTE)) {
    assert.notEqual(CUSTOM_PRESET_COLOR.hex.toLowerCase(), hex.toLowerCase(),
        `the tenth colour must not duplicate native ${name}`);
    const nativeHsl = hexToHsl(hex);
    if (nativeHsl.s < 5) continue; // black has no meaningful hue
    const gap = Math.min(Math.abs(customHue - nativeHsl.h), 360 - Math.abs(customHue - nativeHsl.h));
    assert.ok(gap > 20,
        `the tenth colour must stay clear of native ${name} (${gap.toFixed(1)}° apart)`);
}

// ── 5. What double-click copies ──────────────────────────────────────────────
//
// rgthree's `matchColors` looks a word up in LGraphCanvas.node_colors and,
// failing that, treats it as a hex. So a native swatch copies its NAME, and
// WK's own swatch copies its HEX — an invented word like "other" would become
// the colour `#other`, match nothing, and fail silently.

for (const [name, hex] of Object.entries(NATIVE_PALETTE)) {
    const preset = { key: name, hex, source: "litegraph" };
    assert.equal(clipboardValueForPreset(preset), name,
        `a native swatch must copy the name rgthree accepts, not its hex`);
    assert.equal(presetCopiesNativeName(preset), true,
        `${name} must show the copy-name hint`);
}
assert.equal(clipboardValueForPreset({ key: "pale_blue", hex: "#3f789e", source: "litegraph" }), "pale_blue",
    "the underscore form must be copied verbatim — it is not a name a user would guess");

const customPreset = { key: CUSTOM_PRESET_COLOR.key, hex: CUSTOM_PRESET_COLOR.hex, source: "workspacekit" };
assert.equal(clipboardValueForPreset(customPreset), "#e0508f",
    "WK's own swatch must copy its hex: rgthree accepts a hex but not an invented name");
assert.equal(presetCopiesNativeName(customPreset), false,
    "the custom swatch must show the copy-hex hint, not the copy-name one");

// A fallback preset (offline frontend, fewer than nine native entries) has no
// native name either, so it copies its hex.
const fallbackPreset = { key: "fallback-h0", hex: "#cfafaf", source: "fallback" };
assert.equal(clipboardValueForPreset(fallbackPreset), "#cfafaf",
    "a fallback preset has no native name and must copy its hex");
assert.equal(presetCopiesNativeName(fallbackPreset), false);

for (const junk of [null, undefined, "red", 42, []]) {
    assert.equal(clipboardValueForPreset(junk), null,
        `unusable preset input (${JSON.stringify(junk)}) must copy nothing`);
    assert.equal(presetCopiesNativeName(junk), false);
}
// A preset that claims LiteGraph provenance but carries no key falls back to hex
// rather than copying an empty string onto the clipboard.
assert.equal(clipboardValueForPreset({ key: "  ", hex: "#112233", source: "litegraph" }), "#112233",
    "a blank key must not become an empty clipboard value");

// ── 6. HSL round-trip ────────────────────────────────────────────────────────
//
// hexToHsl/hslToHex must mirror the main module's own conversion, or a display
// colour derived here would differ from one derived there.

for (const hex of [...Object.values(NATIVE_PALETTE), "#e0508f", "#ffffff", "#000000", "#7f7f7f"]) {
    const hsl = hexToHsl(hex);
    const back = hslToHex(hsl.h, hsl.s, hsl.l);
    const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(back.slice(i, i + 2), 16));
    for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(a[i] - b[i]) <= 1,
            `${hex} must survive an HSL round-trip (got ${back})`);
    }
}
assert.equal(hexToHsl("#nope"), null, "unparseable input must yield null, not NaN-laden HSL");
// Out-of-range HSL is clamped/wrapped rather than producing a malformed hex.
for (const [h, s, l] of [[-30, 50, 50], [400, 50, 50], [0, -10, 50], [0, 150, 50], [0, 50, -5], [0, 50, 130]]) {
    assert.match(hslToHex(h, s, l), /^#[0-9a-f]{6}$/,
        `hslToHex(${h},${s},${l}) must still yield a well-formed hex`);
}

// ── 7. Purity ────────────────────────────────────────────────────────────────
//
// The module must stay a pure rule so it can be asserted without a browser.

const moduleSource = readFileSync(new URL("../entry/canvas-groups/preset-color-display.js", import.meta.url), "utf8");
for (const forbidden of ["document", "window", "app?.", "navigator", "localStorage", "addEventListener"]) {
    assert.equal(moduleSource.includes(forbidden), false,
        `preset-color-display.js must stay pure: found "${forbidden}"`);
}

// ── 8. Call-site wiring ──────────────────────────────────────────────────────

const groupsSource = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");

// The stored value must remain the native RGB. If the display hex were written
// into headerBgColor, rgthree's filter and native conversion would both stop
// matching — the failure this whole split exists to prevent.
assert.match(groupsSource, /group\.headerBgColor = rgba;/,
    "headerBgColor must store the native rgba, never the brightened display form");
assert.match(groupsSource, /group\.nativeGroupColor = normalizeHexColor\(hex\);/,
    "nativeGroupColor must store the picker's native hex verbatim");
assert.doesNotMatch(groupsSource, /headerBgColor = .*displayColorForNativeHex/,
    "the display colour must never be persisted into headerBgColor");
assert.doesNotMatch(groupsSource, /nativeGroupColor = .*displayColorForNativeHex/,
    "the display colour must never be persisted into nativeGroupColor");

// Both paint paths must go through the display table, and no title bar may be
// painted straight from the stored value anymore.
assert.match(groupsSource, /const displayRgbFromStored = /,
    "a shared stored→display helper must exist so the two paint paths cannot diverge");
assert.match(groupsSource, /groupHeaderBackground[\s\S]{0,400}?displayRgbFromStored\(stored\)/,
    "the title bar must paint through the display table");
assert.match(groupsSource, /groupBodyBackground[\s\S]{0,300}?displayRgbFromStored\(group\.headerBgColor\)/,
    "the body fill must paint through the same display table as the title bar");
assert.doesNotMatch(groupsSource, /style\.background = group\.headerBgColor \|\| DEFAULT_HEADER_BG_COLOR/,
    "no paint path may bypass groupHeaderBackground() and use the stored colour raw");
assert.doesNotMatch(groupsSource, /style\.background = targetGroup\.headerBgColor \|\| DEFAULT_HEADER_BG_COLOR/,
    "the rename/restore path must also paint through groupHeaderBackground()");

// The swatch row: ten entries, painted bright, carrying the clipboard value.
assert.match(groupsSource, /readColorPresets\(\)\s*\{/,
    "the ten-swatch list must be built by readColorPresets()");
assert.match(groupsSource, /readNativeGroupColorPresets\(globalThis\.LGraphCanvas\?\.node_colors, GROUP_COLOR_PRESETS, 9\)/,
    "nine come from LiteGraph so the tenth slot is left for WK's own colour");
assert.match(groupsSource, /data-copy="\$\{copyValue\}"/,
    "each swatch must carry the value double-click copies");
assert.match(groupsSource, /background:\$\{displayColorForNativeHex\(sw\.hex\) \|\| sw\.hex\}/,
    "a swatch must show the brightened colour while data-color keeps the native hex");
assert.match(groupsSource, /data-color="\$\{sw\.hex\}"/,
    "data-color must stay the native hex: it is what applying the preset persists");
assert.match(groupsSource, /addEventListener\('dblclick'/,
    "double-click must be wired for the copy gesture");

// The hover hint must distinguish the two copy kinds, or a user cannot tell
// whether they copied a name or a hex.
assert.match(groupsSource, /groups\.colorPresetCopyName/);
assert.match(groupsSource, /groups\.colorPresetCopyHex/);
assert.match(groupsSource, /groups\.colorPresetCopied/);

// black's pinned font/opacity must be applied when the preset is clicked.
assert.match(groupsSource, /titleColorForNativeHex\(nativeHex\)/,
    "a preset's pinned font colour must be honoured");
assert.match(groupsSource, /headerOpacityForNativeHex\(nativeHex, MAX_HEADER_OPACITY\)/,
    "a preset's pinned opacity must be honoured, capped at MAX_HEADER_OPACITY");

// T-044/T-045: a new group starts at PRESET_BORDER_WIDTH with unified colours
// ticked. Only new groups — overwriting an existing group's configured width is
// not recoverable. One constant, because three call sites must agree: the
// built-in style, applying a colour swatch, and native → WK conversion. When
// they disagreed, "the border is 1px" was true in one place and false in two.
assert.match(groupsSource, /getBuiltInStyle\(\)\s*\{[\s\S]*?useUnifiedColor: true/,
    "a new group must default to unified font/border colour");
assert.match(groupsSource, /const PRESET_BORDER_WIDTH = 1;/,
    "the shared preset border width must be 1px");
assert.match(groupsSource, /getBuiltInStyle\(\)\s*\{[\s\S]*?borderWidth: PRESET_BORDER_WIDTH,/,
    "a new group must take its border width from the shared constant, not a literal");
assert.match(groupsSource, /const applyColorPreset = hex => \{[\s\S]*?group\.borderWidth = PRESET_BORDER_WIDTH;/,
    "applying a colour preset must also set the border width — a preset is a complete look");
assert.match(groupsSource, /const applyColorPreset = hex => \{[\s\S]*?bwR\.value = String\(PRESET_BORDER_WIDTH\)/,
    "the width slider must move with the preset or the dialog shows a stale value");

/*
 * T-045: the legacy-preset migration.
 *
 * A stored preset overrides the built-in style, so changing the built-in default
 * alone left every user who had ever saved a preset still on 2px — which is how
 * "new groups are still not 1px" was reported after the default had in fact been
 * changed. The migration must be gated so it runs once and cannot fight a user
 * who deliberately picks 2px afterwards.
 */
assert.match(groupsSource, /const LEGACY_PRESET_BORDER_WIDTH = 2;/);
assert.match(groupsSource, /const PRESET_BORDER_MIGRATION_KEY = /,
    "the migration must be gated by a persisted flag so it runs exactly once");
assert.match(groupsSource, /_migratePresetBorderWidth\(presets\)\s*\{[\s\S]*?PRESET_BORDER_MIGRATION_KEY\) === '1'/,
    "the migration must check its flag before rewriting anything");
assert.match(groupsSource, /readStylePresets\(\)\s*\{[\s\S]*?this\._migratePresetBorderWidth\(merged\)/,
    "presets read from storage must pass through the migration");

// The migration rule itself: narrow on purpose.
const legacyPresets = [
    { borderWidth: 2, titleColor: "#FFD700" },
    { borderWidth: 4 },
    { borderWidth: 0 },
    { borderWidth: 2, fontSize: 18 },
];
const migrated = migrateLegacyPresetBorderWidth(legacyPresets, { from: 2, to: 1 });
assert.equal(migrated.changed, true);
assert.deepEqual(migrated.presets.map((p) => p.borderWidth), [1, 4, 0, 1],
    "only the legacy value moves; a deliberately chosen 0 or 4 must survive");
assert.equal(migrated.presets[0].titleColor, "#FFD700",
    "the migration must touch borderWidth and nothing else");
assert.equal(migrated.presets[3].fontSize, 18);
assert.notEqual(migrated.presets, legacyPresets, "the input array must not be mutated in place");
assert.equal(legacyPresets[0].borderWidth, 2, "the caller's own objects must be left alone");

// Idempotent: running it again finds nothing to do, so a double invocation
// cannot walk the width down past the target.
const twice = migrateLegacyPresetBorderWidth(migrated.presets, { from: 2, to: 1 });
assert.equal(twice.changed, false, "a second pass must be a no-op");
assert.deepEqual(twice.presets.map((p) => p.borderWidth), [1, 4, 0, 1]);

// Nothing to migrate reports no change, so the caller does not write storage.
assert.equal(migrateLegacyPresetBorderWidth([{ borderWidth: 3 }], { from: 2, to: 1 }).changed, false);
// Malformed input must not throw or invent presets.
for (const junk of [null, undefined, "presets", 42, {}]) {
    const result = migrateLegacyPresetBorderWidth(junk, { from: 2, to: 1 });
    assert.equal(result.changed, false, `malformed presets (${JSON.stringify(junk)}) must report no change`);
    assert.equal(result.presets, junk, "malformed input must be returned untouched");
}
// A no-op or unusable from/to must not rewrite anything.
for (const bounds of [{ from: 1, to: 1 }, { from: NaN, to: 1 }, { from: 2, to: undefined }, {}]) {
    assert.equal(migrateLegacyPresetBorderWidth([{ borderWidth: 2 }], bounds).changed, false,
        `unusable bounds ${JSON.stringify(bounds)} must be a no-op`);
}
// Entries that are not objects are passed through rather than crashing the read.
const sparse = migrateLegacyPresetBorderWidth([null, { borderWidth: 2 }, "x"], { from: 2, to: 1 });
assert.equal(sparse.changed, true);
assert.deepEqual(sparse.presets, [null, { borderWidth: 1 }, "x"]);

/*
 * T-045: copy confirmation is a flash on the swatch, not a notice dialog.
 *
 * The user is copying a colour name mid-configuration; a modal interrupts that
 * for something they can already see happened.
 */
assert.doesNotMatch(groupsSource, /showNotice\(t\('groups\.colorPresetCopied'/,
    "the copy confirmation must not be a notice dialog");
assert.match(groupsSource, /copyPresetValue = async \(value, btn = null\)[\s\S]*?btn\.style\.boxShadow = /,
    "the copy confirmation must be a transient outline on the swatch itself");
assert.match(groupsSource, /copyPresetValue = async \(value, btn = null\)[\s\S]*?setAttribute\('aria-label', t\('groups\.colorPresetCopied'/,
    "the confirmation must also reach screen readers, which a purely visual flash would not");
assert.match(groupsSource, /clearTimeout\(btn\._xzgCopyFlash\)/,
    "repeated double-clicks must not stack timers and leave the outline stuck on");

// ── 9. Locale coverage ───────────────────────────────────────────────────────

const zh = JSON.parse(readFileSync(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../entry/locales/en-US.json", import.meta.url), "utf8"));
const fallbackSource = readFileSync(new URL("../entry/core/fallback-strings.js", import.meta.url), "utf8");

for (const key of ["groups.colorPresetCopyName", "groups.colorPresetCopyHex", "groups.colorPresetCopied"]) {
    for (const [label, bundle] of [["zh-CN", zh], ["en-US", en]]) {
        assert.ok(bundle[key], `${label} must define ${key}`);
        assert.match(bundle[key], /\{value\}/, `${label} ${key} must interpolate the copied value`);
    }
    assert.ok(fallbackSource.includes(key), `fallback-strings.js must define ${key} for offline use`);
}
// The hints name the gesture without quoting the value — the user asked for the
// bare word, no surrounding quote marks.
assert.equal(zh["groups.colorPresetCopyName"], "双击复制名称 {value}");
assert.equal(zh["groups.colorPresetCopyHex"], "双击复制色值 {value}");
for (const key of ["groups.colorPresetCopyName", "groups.colorPresetCopyHex"]) {
    assert.doesNotMatch(zh[key], /["'「」“”]/, `${key} must not wrap the value in quotes`);
    assert.doesNotMatch(en[key], /["']/, `${key} (en) must not wrap the value in quotes`);
}

console.log("Group preset colour display contract passed.");
