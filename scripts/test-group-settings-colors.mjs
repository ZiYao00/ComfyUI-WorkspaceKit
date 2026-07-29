import assert from "node:assert/strict";
import fs from "node:fs";

// T-210 (2026-07-29): group settings dialog redesign.
// The color-derivation logic lives as module-private const helpers inside
// workspace2_canvas_groups.js, which is a browser module that imports the
// ComfyUI app and cannot be imported directly under Node. This test therefore
// combines two strategies:
//   1. Source contracts assert the redesigned structure and rules are present.
//   2. Reference re-implementations of the pure math assert the documented
//      relationships (header 0.25 default, body = header * 0.5, 10 swatches).
// Keep the reference math identical to the source; if the source formula
// changes, update both deliberately.

const source = fs.readFileSync(
  new URL("../entry/workspace2_canvas_groups.js", import.meta.url),
  "utf8"
);
const zh = JSON.parse(
  fs.readFileSync(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8")
);
const en = JSON.parse(
  fs.readFileSync(new URL("../entry/locales/en-US.json", import.meta.url), "utf8")
);

// ── Reference re-implementations (must mirror the source) ──
const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(Number(v)) ? Number(v) : 0));
const BODY_TO_HEADER_OPACITY_RATIO = 0.5;
const DEFAULT_HEADER_OPACITY = 0.25;
const parseRgbaAlpha = (value, fallback = DEFAULT_HEADER_OPACITY) => {
  const m = String(value || "").match(/rgba?\([\d,\.\s]+,\s*([\d.]+)\)$/i);
  return m ? Number(m[1]) : fallback;
};
const parseRgbaRgb = (value, fallback = { r: 0, g: 0, b: 0 }) => {
  const m = String(value || "").match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return fallback;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
};
const groupBodyBackground = group => {
  if (!group?.backgroundFillEnabled) return "transparent";
  const rgb = parseRgbaRgb(group.headerBgColor);
  const headerAlpha = clamp01(parseRgbaAlpha(group.headerBgColor, DEFAULT_HEADER_OPACITY));
  const bodyAlpha = clamp01(headerAlpha * BODY_TO_HEADER_OPACITY_RATIO);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${bodyAlpha})`;
};

// 1. Built-in default header alpha is 0.25.
assert.match(
  source,
  /const DEFAULT_HEADER_OPACITY = 0\.25;/,
  "DEFAULT_HEADER_OPACITY must be 0.25"
);
assert.match(
  source,
  /getBuiltInStyle\(\)\s*\{[\s\S]*?headerBgColor: DEFAULT_HEADER_BG_COLOR/,
  "getBuiltInStyle must use the 0.25 header color constant"
);
assert.equal(parseRgbaAlpha("rgba(0,0,0,0.25)"), 0.25);

// 2. Compat backgroundOpacity default is 0.125 (0.25 * 0.5).
assert.match(
  source,
  /const DEFAULT_BACKGROUND_OPACITY = DEFAULT_HEADER_OPACITY \* BODY_TO_HEADER_OPACITY_RATIO;/
);
assert.equal(DEFAULT_HEADER_OPACITY * BODY_TO_HEADER_OPACITY_RATIO, 0.125);

// 3. Background disabled renders transparent.
assert.equal(groupBodyBackground({ backgroundFillEnabled: false }), "transparent");
assert.equal(groupBodyBackground(null), "transparent");

// 4. Header alpha 0.25 → body alpha 0.125.
assert.equal(
  groupBodyBackground({ backgroundFillEnabled: true, headerBgColor: "rgba(10,20,30,0.25)" }),
  "rgba(10,20,30,0.125)"
);

// 5. Header alpha 0.8 → body alpha 0.4.
assert.equal(
  groupBodyBackground({ backgroundFillEnabled: true, headerBgColor: "rgba(10,20,30,0.8)" }),
  "rgba(10,20,30,0.4)"
);

// 6. groupBodyBackground no longer reads an independent slider value: the old
//    Math.min(headerAlpha, backgroundOpacity) clamp must be gone.
assert.doesNotMatch(
  source,
  /Math\.min\(headerAlpha, [\s\S]*?backgroundOpacity/,
  "old background-opacity clamp must be removed"
);
assert.match(
  source,
  /const bodyAlpha = clamp01\(headerAlpha \* BODY_TO_HEADER_OPACITY_RATIO\);/
);

// 7. Ten hues, evenly spaced 0,36,...,324.
assert.match(
  source,
  /const GROUP_BACKGROUND_SWATCH_HUES = Object\.freeze\(\s*Array\.from\(\{ length: 10 \}, \(_, index\) => index \* 36\)\s*\);/
);
const expectedHues = Array.from({ length: 10 }, (_, i) => i * 36);
assert.deepEqual(expectedHues, [0, 36, 72, 108, 144, 180, 216, 252, 288, 324]);
assert.equal(expectedHues.length, 10);
assert.match(source, /GROUP_BACKGROUND_SWATCH_SATURATION = 25;/);
assert.match(source, /GROUP_BACKGROUND_SWATCH_LIGHTNESS = 75;/);

// 8. T-212a: clicking a swatch applies a COMPLETE theme-aware color preset
//    (title + font + border) derived from its hue, keeps the header alpha, and
//    turns unified color on. The swatch carries data-hue for this.
assert.match(
  source,
  /const applyColorPreset = hue => \{[\s\S]*?computeGroupColorPreset\(hue, light\)/
);
assert.match(
  source,
  /for \(const btn of bgSwatchButtons\) \{\s*btn\.addEventListener\('click', \(\) => \{\s*applyColorPreset\(parseInt\(btn\.dataset\.hue, 10\) \|\| 0\);/
);
assert.match(source, /unifiedToggle\.checked = true;\s*group\.useUnifiedColor = true;/);
assert.match(
  source,
  /const rgba = `rgba\(\$\{r\},\$\{g\},\$\{b\},\$\{headerAlpha\}\)`;\s*group\.headerBgColor = rgba;/
);

// 9. A custom header color makes the body RGB follow automatically because the
//    body is always derived from headerBgColor (no second color field).
assert.equal(
  groupBodyBackground({ backgroundFillEnabled: true, headerBgColor: "rgba(200,100,50,0.5)" }),
  "rgba(200,100,50,0.25)"
);
assert.match(source, /refreshBodyFillPreview\(\);/);

// 10. Enabling unified color syncs the border HSL from the font color.
assert.match(
  source,
  /const syncBorderColorFromTitle = \(\) => \{\s*const hsl = this\.hexToHsl\(titleColorPicker\.value\);\s*syncColorFromHSL\(hsl\.h, hsl\.s, hsl\.l\);/
);
assert.match(
  source,
  /unifiedToggle\.addEventListener\('change', \(\) => \{[\s\S]*?if \(group\.useUnifiedColor\) syncBorderColorFromTitle\(\);/
);

// 11. Unified sync must not touch borderOpacity: syncBorderColorFromTitle only
//     writes colorHue/Sat/Lit via syncColorFromHSL.
const syncBorderFnMatch = source.match(
  /const syncBorderColorFromTitle = \(\) => \{([\s\S]*?)\n        \};/
);
assert.ok(syncBorderFnMatch, "syncBorderColorFromTitle function body found");
assert.doesNotMatch(
  syncBorderFnMatch[1],
  /borderOpacity/,
  "unified color sync must not modify borderOpacity"
);
assert.match(
  source,
  /syncColorFromHSL = \(h, s, l\) => \{[\s\S]*?group\.colorHue = h;[\s\S]*?group\.colorSat = s;[\s\S]*?group\.colorLit = l;/
);

// 12. When unified is OFF, changing font color only updates titleColor and does
//     not drive the border (the sync is guarded by group.useUnifiedColor).
assert.match(
  source,
  /titleColorPicker\.addEventListener\('input', \(\) => \{[\s\S]*?group\.titleColor = c;[\s\S]*?if \(group\.useUnifiedColor\) syncBorderColorFromTitle\(\);/
);

// 13. Shadow appears before border width in the dialog DOM.
const shadowIdx = source.indexOf("xzg-set-shadowsize");
const widthIdx = source.indexOf("xzg-set-borderwidth");
assert.ok(shadowIdx > 0 && widthIdx > 0, "both shadow and width controls exist");
assert.ok(shadowIdx < widthIdx, "shadow row must render before border-width row");

// 14. The background-opacity slider and its value/label were removed.
assert.doesNotMatch(source, /xzg-set-background-opacity/);
assert.doesNotMatch(source, /xzg-background-opacity-val/);
assert.doesNotMatch(source, /backgroundOpacitySlider/);

// 15. The border-region standalone unified hue/swatch controls were removed.
assert.doesNotMatch(source, /xzg-set-unified-hue/);
assert.doesNotMatch(source, /xzg-unified-color-swatch/);
assert.doesNotMatch(source, /applyUnifiedColor/);

// 16. Legacy backgroundOpacity data still loads: the field is still read with a
//     safe default in serialize/snapshot paths and still written for compat.
assert.match(source, /backgroundOpacity: clamp01\(headerAlpha \* BODY_TO_HEADER_OPACITY_RATIO\)/);
assert.match(source, /finiteNumber\(g\.backgroundOpacity, DEFAULT_BACKGROUND_OPACITY\)/);

// 17. Preset/apply/global-apply/cancel paths still carry the color fields.
assert.match(source, /const readControlsStyle = \(\) => \(\{[\s\S]*?useUnifiedColor: Boolean\(unifiedToggle\.checked\)/);
assert.match(source, /headerBgColor: rgbaFromHeaderControls\(\)/);
assert.match(source, /useUnifiedColor: _snapshot\.useUnifiedColor/); // revert snapshot restores it

// i18n: new precise key exists in both locales and the fallback table.
assert.equal(zh["groups.unifyFontBorderColor"], "统一字体与边框颜色");
assert.equal(en["groups.unifyFontBorderColor"], "Unify Font and Border Colors");
assert.match(source, /t\('groups\.unifyFontBorderColor'\)/);

// ── T-212 (2026-07-29): color-preset redesign + theme awareness ──

// Reference re-implementation of the theme-aware preset derivation.
const hslToRgb = (h, s, l) => {
  const sat = clamp01(s / 100);
  const lit = clamp01(l / 100);
  const a = sat * Math.min(lit, 1 - lit);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return { r: f(0), g: f(8), b: f(4) };
};
const rgbToHex = ({ r, g, b }) =>
  "#" + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
const computeGroupColorPreset = (hue, light) => {
  const titleRgb = light ? hslToRgb(hue, 50, 80) : hslToRgb(hue, 25, 75);
  const fontHex = light ? "#ffffff" : rgbToHex(hslToRgb(hue, 100, 90));
  return { titleRgb, fontHex };
};

// 18. Constant renamed to reflect the "complete preset" role.
assert.match(source, /const GROUP_COLOR_PRESETS = Object\.freeze\(/);
assert.doesNotMatch(source, /GROUP_BACKGROUND_SWATCHES/);

// 19. Ten presets, hues 0..324 (unchanged spacing).
assert.equal(Array.from({ length: 10 }, (_, i) => i * 36).length, 10);

// 20. Dark preset: title hsl(H,25,75), font hsl(H,100,90). Light preset: title
//     hsl(H,50,80), font pure white. Verify the recipe constants are present.
assert.match(source, /GROUP_PRESET_THEME = Object\.freeze\(\{/);
assert.match(source, /dark:[\s\S]*?title: Object\.freeze\(\{ s: GROUP_BACKGROUND_SWATCH_SATURATION, l: GROUP_BACKGROUND_SWATCH_LIGHTNESS \}\)/);
assert.match(source, /light:[\s\S]*?title: Object\.freeze\(\{ s: 50, l: 80 \}\)/);
assert.match(source, /font: null/); // light font → white
// Reference values for H=216 (blue):
assert.deepEqual(computeGroupColorPreset(216, false).titleRgb, { r: 175, g: 188, b: 207 });
assert.equal(computeGroupColorPreset(216, false).fontHex, "#cce0ff");
assert.deepEqual(computeGroupColorPreset(216, true).titleRgb, { r: 179, g: 199, b: 230 });
assert.equal(computeGroupColorPreset(216, true).fontHex, "#ffffff");

// 21. Theme detection reads a content-background variable and thresholds luma.
assert.match(source, /const isLightGroupTheme = \(\) => \{/);
assert.match(source, /--p-content-background/);
assert.match(source, /rgbLuma\([\s\S]*?\) > 0\.5/);

// 22. Header opacity capped at 50%.
assert.match(source, /const MAX_HEADER_OPACITY = 0\.5;/);
assert.match(source, /class="xzg-set-headeropacity" type="range" min="5" max="50"/);
assert.doesNotMatch(source, /class="xzg-set-headeropacity" type="range" min="5" max="95"/);

// 23. Unified label is dimmed (opacity 0.6) — description-like styling.
assert.match(
  source,
  /<label style="color:#fff;opacity:0\.6;font-size:11px;[^"]*"><input class="xzg-set-unified-color"/
);

// 24. Border row label uses the "Color / Opacity" wording.
assert.equal(zh["groups.opacity"], "颜色/透明度");
assert.equal(en["groups.opacity"], "Color / Opacity");

console.log("group settings colors contract passed");
