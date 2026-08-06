/*
 * Contract test for entry/canvas-groups/group-mode-visuals.js (T-038).
 *
 * The point of this suite is that the numbers are NOT ours to choose — they are
 * ComfyUI's own node-level values, and the whole reason for the change was that
 * a group and the nodes inside it must not tell the user two different stories.
 * So the alpha assertions are written as exact equalities against the native
 * table (docs/NATIVE_BEHAVIOR_REFERENCE.md §4), not as ranges.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    FALLBACK_BYPASS_COLOR,
    GROUP_MODE_ALPHA,
    GROUP_MODE_STATE,
    hexToRgbTriplet,
    resolveBypassColor,
    resolveGroupFillPaint,
    resolveGroupModeVisuals,
} from "../entry/canvas-groups/group-mode-visuals.js";

/* 1. The alphas match the native getNodeModeAlpha table exactly. */
assert.equal(GROUP_MODE_ALPHA[GROUP_MODE_STATE.BYPASS], 0.2, "bypass alpha must be native .2");
assert.equal(GROUP_MODE_ALPHA[GROUP_MODE_STATE.MUTE], 0.4, "mute alpha must be native .4");
assert.equal(GROUP_MODE_ALPHA[GROUP_MODE_STATE.NORMAL], 1, "normal frames must not be dimmed");
assert.ok(
    GROUP_MODE_ALPHA[GROUP_MODE_STATE.BYPASS] < GROUP_MODE_ALPHA[GROUP_MODE_STATE.MUTE],
    "native language: ignored is fainter than disabled — inverting this would mislead"
);
assert.equal(FALLBACK_BYPASS_COLOR, "#FF00FF", "fallback must be NODE_DEFAULT_BYPASS_COLOR");

/* 2. Both mechanisms that mean "ignored" select the bypass treatment. */
const fromFlag = resolveGroupModeVisuals({ bypassed: true });
assert.equal(fromFlag.state, GROUP_MODE_STATE.BYPASS, "the legacy `bypassed` flag still means ignored");
assert.equal(fromFlag.alpha, 0.2);
assert.equal(fromFlag.tintColor, "#FF00FF");

const fromMode = resolveGroupModeVisuals({ executionMode: "bypass" });
assert.equal(fromMode.state, GROUP_MODE_STATE.BYPASS, "executionMode 'bypass' means ignored");
assert.equal(fromMode.alpha, 0.2);
assert.equal(fromMode.tintColor, "#FF00FF");

const muted = resolveGroupModeVisuals({ executionMode: "mute" });
assert.equal(muted.state, GROUP_MODE_STATE.MUTE);
assert.equal(muted.alpha, 0.4);
assert.equal(muted.tintColor, null, "native replaces the colour for bypass only — mute is opacity alone");

const normal = resolveGroupModeVisuals({});
assert.equal(normal.state, GROUP_MODE_STATE.NORMAL);
assert.equal(normal.alpha, 1);
assert.equal(normal.tintColor, null);

/* Bypass wins when both are somehow set, matching the native table's order. */
assert.equal(
    resolveGroupModeVisuals({ bypassed: true, executionMode: "mute" }).state,
    GROUP_MODE_STATE.BYPASS,
    "ignore must win over disable so the frame never shows the weaker state"
);

/* 3. The magenta is theme-overridable, so a runtime value must win. */
assert.equal(
    resolveGroupModeVisuals({ bypassed: true, bypassColor: "#00ffcc" }).tintColor,
    "#00FFCC",
    "a theme's NODE_BYPASS_BGCOLOR must override the built-in magenta"
);
assert.equal(resolveBypassColor("#0fc"), "#00FFCC", "3-digit hex must expand");
assert.equal(resolveBypassColor("  #abcdef  "), "#ABCDEF", "surrounding whitespace must not defeat a valid colour");
assert.equal(resolveBypassColor("abcdef"), "#ABCDEF", "a missing leading # must still parse");

/* 4. Anything unusable falls back rather than producing an invalid colour. */
for (const bad of [null, undefined, "", "   ", "red", "rgb(1,2,3)", "#12345", "#gggggg", 42, {}, []]) {
    assert.equal(
        resolveBypassColor(bad),
        FALLBACK_BYPASS_COLOR,
        `unusable colour ${JSON.stringify(bad)} must fall back, never yield an invalid CSS value`
    );
}
assert.deepEqual(hexToRgbTriplet("#FF00FF"), { r: 255, g: 0, b: 255 });
assert.deepEqual(hexToRgbTriplet("#0fc"), { r: 0, g: 255, b: 204 });
assert.deepEqual(hexToRgbTriplet("nonsense"), { r: 255, g: 0, b: 255 }, "bad hex must yield the fallback magenta");

/* 5. Malformed group state must never throw or produce a non-finite alpha. */
for (const bad of [null, undefined, 0, "bypass", [], { executionMode: 7 }, { bypassed: "no" }]) {
    const result = resolveGroupModeVisuals(bad);
    assert.ok(Number.isFinite(result.alpha), `alpha must stay finite for ${JSON.stringify(bad)}`);
    assert.ok(result.alpha > 0 && result.alpha <= 1, "alpha must stay inside (0,1]");
}
// A truthy non-boolean `bypassed` is still "ignored" — the field has always been
// written as a boolean, and treating a truthy value as normal would silently
// show a bypassed group at full strength.
assert.equal(resolveGroupModeVisuals({ bypassed: "no" }).state, GROUP_MODE_STATE.BYPASS);

/* 6. The canvas fill must fold the mode alpha in — the DOM opacity cannot reach it. */
const baseRgb = { r: 40, g: 80, b: 120 };
const normalFill = resolveGroupFillPaint({ visuals: normal, rgb: baseRgb, alpha: 0.5 });
assert.deepEqual(normalFill, { r: 40, g: 80, b: 120, alpha: 0.5 }, "a normal frame's fill is untouched");

const mutedFill = resolveGroupFillPaint({ visuals: muted, rgb: baseRgb, alpha: 0.5 });
assert.deepEqual(mutedFill, { r: 40, g: 80, b: 120, alpha: 0.2 }, "mute keeps the colour and multiplies 0.5 x 0.4");

const bypassFill = resolveGroupFillPaint({ visuals: fromFlag, rgb: baseRgb, alpha: 0.5 });
assert.deepEqual(
    bypassFill,
    { r: 255, g: 0, b: 255, alpha: 0.1 },
    "bypass replaces the RGB with magenta and multiplies 0.5 x 0.2"
);
assert.ok(
    bypassFill.alpha < mutedFill.alpha,
    "the fill must preserve the native ordering, or an ignored body would look stronger than a disabled one"
);

/* A themed magenta must reach the canvas fill too, not just the DOM. */
assert.deepEqual(
    resolveGroupFillPaint({
        visuals: resolveGroupModeVisuals({ bypassed: true, bypassColor: "#00ffcc" }),
        rgb: baseRgb,
        alpha: 1,
    }),
    { r: 0, g: 255, b: 204, alpha: 0.2 },
    "the theme colour must drive the canvas fill as well as the title bar"
);

/* 7. Fill paint must clamp instead of emitting values the canvas would reject. */
const clamped = resolveGroupFillPaint({ visuals: normal, rgb: { r: -30, g: 900, b: 12.6 }, alpha: 5 });
assert.deepEqual(clamped, { r: 0, g: 255, b: 13, alpha: 1 }, "channels clamp to 0..255 and round; alpha clamps to 1");
const negative = resolveGroupFillPaint({ visuals: normal, rgb: baseRgb, alpha: -2 });
assert.equal(negative.alpha, 0, "a negative alpha must clamp to 0, not invert the fill");
for (const bad of [null, undefined, 0, "x", []]) {
    const result = resolveGroupFillPaint(bad);
    assert.ok(Number.isFinite(result.alpha), "fill alpha must stay finite for malformed input");
    assert.ok([result.r, result.g, result.b].every(Number.isFinite), "fill channels must stay finite");
}
const nanChannels = resolveGroupFillPaint({ visuals: normal, rgb: { r: NaN, g: undefined, b: "x" }, alpha: 0.5 });
assert.deepEqual(nanChannels, { r: 0, g: 0, b: 0, alpha: 0.5 }, "non-numeric channels must become 0, not NaN");

/* 8. The module must stay pure — it is imported by the browser and by this test. */
const moduleSource = readFileSync(
    new URL("../entry/canvas-groups/group-mode-visuals.js", import.meta.url),
    "utf8"
);
const codeOnly = moduleSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
for (const forbidden of ["document", "window", "app.", "globalThis", "localStorage", "require("]) {
    assert.ok(
        !codeOnly.includes(forbidden),
        `group-mode-visuals.js must stay DOM-free — found "${forbidden}"`
    );
}

/* 9. Call sites: the groups file must actually use this instead of its old purple. */
const groups = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
assert.ok(
    groups.includes('from "./canvas-groups/group-mode-visuals.js'),
    "workspace2_canvas_groups.js must import the mode visuals module"
);
assert.doesNotMatch(
    groups,
    /hsla\(280,\s*60%/,
    "the invented 280deg purple must be gone — it disagreed with the magenta of the nodes inside the frame"
);
assert.match(
    groups,
    /const modeVisuals = groupModeVisuals\(g\);\s*\n\s*el\.style\.opacity = modeVisuals\.alpha === 1 \? '' : String\(modeVisuals\.alpha\)/,
    "updateGroupStyle must dim the whole box in one place, so its parts cannot drift apart"
);
assert.match(
    groups,
    /header\.style\.background = showTitle \? groupHeaderBackground\(g, modeVisuals\) : 'transparent'/,
    "updatePositions must route the title bar through the mode-aware colour"
);
assert.match(
    groups,
    /ctx\.fillStyle = groupBodyBackground\(group, groupModeVisuals\(group\)\)/,
    "the canvas fill must receive the mode too — DOM opacity cannot reach it"
);
assert.match(
    groups,
    /const paint = resolveGroupFillPaint\(\{ visuals, rgb, alpha: bodyAlpha \}\)/,
    "groupBodyBackground must fold the mode alpha into the canvas paint"
);

/* The colour must be read from the runtime, and from the source the NODES use.
 * Measured 2026-08-05: NODE_BYPASS_BGCOLOR is the theme-schema name but the node
 * rendering path ignores it (see docs/NATIVE_BEHAVIOR_REFERENCE.md §4). Reading
 * it first painted the frame lavender while its nodes went magenta. */
assert.match(
    groups,
    /globalThis\.LiteGraph\?\.NODE_DEFAULT_BYPASS_COLOR\s*\n\s*\?\?\s*globalThis\.LiteGraph\?\.NODE_BYPASS_BGCOLOR/,
    "NODE_DEFAULT_BYPASS_COLOR must be read FIRST — it is the value a bypassed node actually renders"
);
assert.match(
    groups,
    /bypassColor: runtimeBypassColor\(\)/,
    "groupModeVisuals must pass the live colour through rather than hardcoding it"
);

/* 10. The icon activation background must be gone (the frame now carries state). */
const modeButtonsFn = groups.match(/updateGroupModeButtons\(gid\) \{([\s\S]*?)\n    \},/);
assert.ok(modeButtonsFn, "updateGroupModeButtons must still exist");
assert.doesNotMatch(
    modeButtonsFn[1],
    /rgba\(220,82,94|rgba\(130,82,200|rgba\(255,156,166|rgba\(214,180,255/,
    "the activation tile colours must be gone — the whole frame expresses the state now"
);
assert.match(
    modeButtonsFn[1],
    /btn\.setAttribute\('aria-pressed', active \? 'true' : 'false'\)/,
    "aria-pressed must survive: it is the state's remaining accessible form"
);
assert.match(
    modeButtonsFn[1],
    /btn\.title = active \?/,
    "the tooltip must still report the state"
);

console.log("group-mode-visuals contract OK");
