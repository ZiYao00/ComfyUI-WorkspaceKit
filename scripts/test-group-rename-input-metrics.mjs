import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveRenameInputMetrics } from "../entry/canvas-groups/rename-input-metrics.js";

/* ── 1. Every metric scales with the canvas ──
   The whole defect was that the rename box ignored zoom: it was created outside
   updatePositions(), so it kept whatever pixel values were baked in at 1×. */
const at1 = resolveRenameInputMetrics({ scale: 1, fontSize: 14 });
const at2 = resolveRenameInputMetrics({ scale: 2, fontSize: 14 });
const atHalf = resolveRenameInputMetrics({ scale: 0.5, fontSize: 14 });

assert.equal(at1.fontSize, 14, "at 1× the box must read at the group's own font size");
assert.equal(at2.fontSize, 28, "doubling the zoom must double the text");
assert.equal(atHalf.fontSize, 7, "halving the zoom must halve the text");
assert.equal(at2.paddingH, at1.paddingH * 2, "horizontal padding must follow zoom");
assert.equal(at2.paddingV, at1.paddingV * 2, "vertical padding must follow zoom");
assert.equal(at2.borderRadius, at1.borderRadius * 2, "corner radius must follow zoom");

/* ── 2. The text matches the title span it replaces, at every zoom ──
   updatePositions() sets the span to `(fontSize || 14) * scale`. The input must
   use the identical formula with no clamp: a font floor would diverge from the
   span at small zooms and make the title visibly jump when edit mode opens. */
for (const scale of [0.05, 0.35, 0.5, 1, 1.75, 3, 10]) {
  for (const fontSize of [8, 10, 14, 22, 40]) {
    assert.equal(
      resolveRenameInputMetrics({ scale, fontSize }).fontSize,
      fontSize * scale,
      `the input's text must equal the span's at scale=${scale}, fontSize=${fontSize}`
    );
  }
}

/* ── 3. Width is deliberately absent ──
   Width is solved in CSS (flex:1 1 auto against the header's title wrapper) so
   the browser measures the space actually left by the action icons. Returning a
   computed number here would reintroduce the drift the fix removes. */
assert.ok(!("width" in at1), "width must not be computed — it is a flex result, not arithmetic");
assert.ok(!("maxWidth" in at1), "max-width must not be computed either");

/* ── 4. The chrome never vanishes, and nothing ever goes zero or negative ──
   Font size follows the span exactly (see 2). The box's own chrome keeps a
   one-pixel floor so a deep zoom-out cannot erase the border and leave the
   input indistinguishable from the header behind it. */
const tiny = resolveRenameInputMetrics({ scale: 0.05, fontSize: 8 });
assert.equal(tiny.borderWidth, 1, "the border must remain at least one device pixel");
assert.equal(tiny.paddingH, 1, "horizontal padding must not collapse to zero");
assert.equal(tiny.paddingV, 1, "vertical padding must not collapse to zero");
assert.equal(tiny.borderRadius, 1, "corner radius must not collapse to zero");
for (const scale of [0.01, 0.05, 0.2, 1, 10]) {
  const m = resolveRenameInputMetrics({ scale, fontSize: 14 });
  for (const [key, value] of Object.entries(m)) {
    assert.ok(Number.isFinite(value) && value > 0, `${key} must stay a positive number at scale=${scale}`);
  }
}

/* ── 5. Malformed input falls back to the 1× defaults rather than NaN ──
   A NaN would reach style.fontSize and the browser would drop the declaration,
   leaving an unreadably tiny or inherited box. */
for (const bad of [undefined, null, {}, "1", 0, [], { scale: 0, fontSize: 0 }, { scale: -3, fontSize: -9 }, { scale: NaN, fontSize: NaN }, { scale: Infinity, fontSize: 14 }]) {
  const m = resolveRenameInputMetrics(bad);
  for (const [key, value] of Object.entries(m)) {
    assert.ok(Number.isFinite(value) && value > 0, `${key} must be a positive number for input ${JSON.stringify(bad)}`);
  }
}
assert.equal(resolveRenameInputMetrics({}).fontSize, 14, "a missing font size falls back to 14");
assert.equal(resolveRenameInputMetrics({ scale: 2 }).fontSize, 28, "a missing font size still follows zoom");
assert.equal(resolveRenameInputMetrics({ fontSize: 20 }).fontSize, 20, "a missing scale is treated as 1×");

/* ── 6. Module purity ── */
const moduleSource = readFileSync(new URL("../entry/canvas-groups/rename-input-metrics.js", import.meta.url), "utf8");
const moduleCode = moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const forbidden of ["document", "window", "app.", "localStorage", "addEventListener", "querySelector", "getBoundingClientRect"]) {
  assert.ok(!moduleCode.includes(forbidden), `rename-input-metrics.js must stay pure — found "${forbidden}"`);
}

/* ── 7. Call sites ── */
const groups = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");

// 7a. startRename builds the box from the module, not from hardcoded pixels.
const startRename = groups.match(/startRename\(gid, span\) \{([\s\S]*?)\n    \},/);
assert.ok(startRename, "startRename must still exist");
const renameBody = startRename[1];
assert.match(renameBody, /resolveRenameInputMetrics\(\{\s*scale: app\?\.canvas\?\.ds\?\.scale \?\? 1,\s*fontSize: group\.fontSize,\s*\}\)/,
  "startRename must derive metrics from the live canvas scale");
assert.doesNotMatch(renameBody, /width:120px|width:\s*120/,
  "the fixed 120px width must be gone");
assert.match(renameBody, /'flex:1 1 auto'/, "the input must flex to fill the available title space");
assert.match(renameBody, /'min-width:0'/, "min-width:0 is required or the flex child cannot shrink");
assert.match(renameBody, /input\.className = 'xzg-group-title-input'/,
  "the input needs a stable class so the per-frame loop can find it");

// 7b. The per-frame loop keeps an open box in sync with zoom.
const updatePositions = groups.match(/\n    updatePositions\(\) \{([\s\S]*?)\n    \},/);
assert.ok(updatePositions, "updatePositions must still exist");
assert.match(updatePositions[1], /querySelector\('\.xzg-group-title-input'\)/,
  "updatePositions must look for an open rename box");
assert.match(updatePositions[1], /resolveRenameInputMetrics\(\{ scale, fontSize: g\.fontSize \}\)/,
  "the open box must be re-measured from the same per-frame scale as everything else");

// 7c. Committing a rename must restore the span's full style contract. Dropping
// the ellipsis rules let a long title escape the header after every rename.
assert.match(renameBody, /'white-space:nowrap'/, "the restored span must not wrap");
assert.match(renameBody, /'text-overflow:ellipsis'/, "the restored span must ellipsize a long title");
assert.match(renameBody, /'overflow:hidden'/, "the restored span must clip");
assert.match(renameBody, /if \(box\) box\._xzgRefs = null;/,
  "replacing the title span must invalidate the cached element refs");
