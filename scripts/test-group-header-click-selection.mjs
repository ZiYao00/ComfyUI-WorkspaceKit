import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HEADER_CLICK_SELECTION,
  hasSelectionModifier,
  resolveHeaderClickSelection,
} from "../entry/canvas-groups/header-click-selection.js";

/* ── 1. A plain click on an unselected frame replaces the whole selection ── */
assert.equal(
  resolveHeaderClickSelection({ hasModifier: false, isAlreadySelected: false }),
  HEADER_CLICK_SELECTION.RESET,
  "clicking a frame that is not selected must reset the selection to it"
);

/* ── 2. A plain click on an ALREADY selected frame keeps the selection ──
   This is what makes multi-drag possible: the user selects several groups (or
   groups plus nodes) and then grabs one of their headers to move the lot. A
   reset here would silently drop everything but the grabbed frame. */
assert.equal(
  resolveHeaderClickSelection({ hasModifier: false, isAlreadySelected: true }),
  HEADER_CLICK_SELECTION.KEEP,
  "clicking an already-selected frame must keep the selection so a multi-drag can start"
);

/* ── 3. Any modifier defers to pointer-actions.js and never resets ── */
for (const isAlreadySelected of [false, true]) {
  assert.equal(
    resolveHeaderClickSelection({ hasModifier: true, isAlreadySelected }),
    HEADER_CLICK_SELECTION.KEEP,
    `a modifier click must never reset (isAlreadySelected=${isAlreadySelected})`
  );
}

/* ── 4. Modifier detection covers every key that owns a gesture ── */
assert.equal(hasSelectionModifier({ shiftKey: true }), true, "Shift is a selection modifier");
assert.equal(hasSelectionModifier({ ctrlKey: true }), true, "Ctrl is a selection modifier");
assert.equal(hasSelectionModifier({ metaKey: true }), true, "Meta is a selection modifier");
assert.equal(hasSelectionModifier({ altKey: true }), true, "Alt is a selection modifier");
assert.equal(hasSelectionModifier({}), false, "a bare click carries no modifier");
assert.equal(
  hasSelectionModifier({ shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }),
  false,
  "explicitly false modifiers must not count"
);

/* ── 5. Malformed input must not reset ──
   A reset is the destructive branch: it clears the user's node selection. When
   the caller's state is unreadable, do the harmless thing. */
for (const bad of [undefined, null, "click", 0, []]) {
  assert.equal(
    resolveHeaderClickSelection(bad),
    HEADER_CLICK_SELECTION.RESET,
    "an empty state is treated as an unselected frame"
  );
}
assert.equal(hasSelectionModifier(undefined), false);
assert.equal(hasSelectionModifier(null), false);
assert.equal(hasSelectionModifier("shift"), false, "a string is not an event");

/* ── 6. Module purity ── */
const modulePath = new URL("../entry/canvas-groups/header-click-selection.js", import.meta.url);
const moduleSource = readFileSync(modulePath, "utf8");
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const moduleCode = stripComments(moduleSource);
for (const forbidden of ["document", "window", "app.", "localStorage", "addEventListener", "querySelector", "LGraph"]) {
  assert.ok(
    !moduleCode.includes(forbidden),
    `header-click-selection.js must stay pure — found "${forbidden}"`
  );
}

/* ── 7. Call site: the header mousedown clears BOTH selections ──
   Clearing only the WK groups was the actual defect: the stale native node
   selection made startDrag take its multi-drag branch and carry unrelated
   nodes across the canvas. */
const groups = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
assert.match(groups, /resolveHeaderClickSelection\(\{\s*hasModifier: hasSelectionModifier\(e\),\s*isAlreadySelected: self\.selectedGroupIds\.has\(group\.id\),\s*\}\)/,
  "the header mousedown must ask the pure module, passing the live modifier and selection state");
assert.match(groups, /if \(plan === HEADER_CLICK_SELECTION\.RESET\) \{\s*app\?\.canvas\?\.deselectAllNodes\?\.\(\);\s*self\.selectOnlyGroup\(group\.id\);/,
  "a reset must clear ComfyUI's native node selection before selecting only this group");

/* ── 8. bringToFront must not move the element in the DOM ──
   Re-appending a node between mousedown and mouseup makes the browser abandon
   the click sequence, so `click` and `dblclick` never fire — that is what
   silently disabled the header's double-click contents selection. */
const bringToFront = groups.match(/const bringToFront = \(\) => \{([\s\S]*?)\n        \};/);
assert.ok(bringToFront, "bringToFront must still exist");
assert.doesNotMatch(bringToFront[1], /appendChild/,
  "bringToFront must not re-append the frame — it cancels the click/dblclick sequence");
assert.doesNotMatch(bringToFront[1], /insertBefore|prepend|replaceChildren|remove\(\)/,
  "bringToFront must not restructure the DOM at all");
assert.match(bringToFront[1], /_frontZ/, "stacking must be done with a z-index counter");
assert.match(bringToFront[1], /el\.style\.zIndex = String\(self\._frontZ\)/,
  "the raised value must be written to the frame's z-index");
assert.match(groups, /_frontZ: 5,/, "the counter must start at the markup's base z-index");

/* ── 9. The double-click listener must still be wired to the plan ── */
assert.match(groups, /headerEl\.addEventListener\('dblclick', e => \{[\s\S]*?self\.selectGroupContents\(group\.id\);/,
  "the header must still select its full contents on double-click");
