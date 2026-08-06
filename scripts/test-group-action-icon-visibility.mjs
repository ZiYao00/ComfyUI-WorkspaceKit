/*
 * Contract test for entry/canvas-groups/action-icon-visibility.js (T-038, T-039).
 *
 * Two things this suite is really guarding:
 *
 *  - The visibility trigger must stay geometric. A future refactor that "tidies"
 *    it into a CSS :hover would silently break it, because the frame's middle is
 *    `pointer-events:none` so nodes stay clickable and therefore never reports
 *    hover. The call-site assertions below pin the geometric test in place.
 *  - Hiding must not move the title. `display:none` collapses the icons' width
 *    and slides the title right, so the title jumps every time the pointer
 *    crosses the frame edge.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    ACTION_ICON_VISIBILITY,
    QUEUE_ICON_OPACITY,
    isPointInsideBounds,
    resolveActionIconVisibility,
    resolveQueueIconOpacity,
} from "../entry/canvas-groups/action-icon-visibility.js";

const BOUNDS = { x: 100, y: 200, w: 300, h: 150 };

/* 1. Containment, including the edges. */
assert.equal(isPointInsideBounds(BOUNDS, { x: 250, y: 275 }), true, "the middle is inside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 100, y: 200 }), true, "the top-left corner counts as inside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 400, y: 350 }), true, "the bottom-right corner counts as inside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 100, y: 275 }), true, "the left edge counts — icons must not blink on the border");
assert.equal(isPointInsideBounds(BOUNDS, { x: 250, y: 200 }), true, "the top edge counts");
assert.equal(isPointInsideBounds(BOUNDS, { x: 99.9, y: 275 }), false, "just left of the frame is outside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 400.1, y: 275 }), false, "just right of the frame is outside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 250, y: 199.9 }), false, "just above the frame is outside");
assert.equal(isPointInsideBounds(BOUNDS, { x: 250, y: 350.1 }), false, "just below the frame is outside");

/* The whole frame is the trigger, not just the title bar — a point deep in the
 * body must count, which is exactly what CSS hover cannot report. */
assert.equal(isPointInsideBounds(BOUNDS, { x: 250, y: 340 }), true, "a point deep in the body must trigger the icons");

/* 2. Missing or malformed geometry must read as "outside", never throw. */
for (const badBounds of [null, undefined, 0, "x", [], { x: 1 }, { x: 1, y: 2, w: NaN, h: 4 }]) {
    assert.equal(
        isPointInsideBounds(badBounds, { x: 0, y: 0 }),
        false,
        `malformed bounds ${JSON.stringify(badBounds)} must read as outside`
    );
}
for (const badPoint of [null, undefined, 0, "x", [], { x: 1 }, { x: NaN, y: 2 }]) {
    assert.equal(
        isPointInsideBounds(BOUNDS, badPoint),
        false,
        `malformed point ${JSON.stringify(badPoint)} must read as outside`
    );
}
assert.equal(isPointInsideBounds({ x: 0, y: 0, w: 0, h: 10 }, { x: 0, y: 5 }), false, "a zero-width frame contains nothing");
assert.equal(isPointInsideBounds({ x: 0, y: 0, w: -5, h: 10 }, { x: -2, y: 5 }), false, "a negative-width frame contains nothing");

/* 3. The visibility rule. */
assert.equal(
    resolveActionIconVisibility({ pointerInside: true }),
    ACTION_ICON_VISIBILITY.VISIBLE,
    "pointer inside the frame shows the icons"
);
assert.equal(
    resolveActionIconVisibility({ pointerInside: false }),
    ACTION_ICON_VISIBILITY.HIDDEN,
    "pointer outside hides them"
);

/* A gesture pins them: a drag or resize routinely outruns the pointer past the
 * frame edge, and flickering icons mid-drag look like a fault. */
assert.equal(
    resolveActionIconVisibility({ pointerInside: false, isGesturing: true }),
    ACTION_ICON_VISIBILITY.VISIBLE,
    "an active drag/resize must keep the icons visible even when the pointer has left the frame"
);
/* An open rename box pins them too: the user is typing in the title bar and the
 * icons vanishing underneath an active field reads as broken. */
assert.equal(
    resolveActionIconVisibility({ pointerInside: false, isRenaming: true }),
    ACTION_ICON_VISIBILITY.VISIBLE,
    "an open rename box must keep the icons visible"
);
assert.equal(
    resolveActionIconVisibility({ pointerInside: true, isGesturing: true, isRenaming: true }),
    ACTION_ICON_VISIBILITY.VISIBLE
);
for (const bad of [null, undefined, 0, "x", []]) {
    assert.equal(
        resolveActionIconVisibility(bad),
        ACTION_ICON_VISIBILITY.HIDDEN,
        "malformed state must hide rather than pin the icons on permanently"
    );
}

/* 4. T-039: the execute icon's opacity. */
assert.equal(QUEUE_ICON_OPACITY.EXECUTABLE, 1);
assert.ok(
    QUEUE_ICON_OPACITY.EMPTY > 0 && QUEUE_ICON_OPACITY.EMPTY < 1,
    "an unavailable execute icon must be faint but still identifiable, not invisible"
);
assert.equal(resolveQueueIconOpacity(1), QUEUE_ICON_OPACITY.EXECUTABLE, "one output node is enough");
assert.equal(resolveQueueIconOpacity(7), QUEUE_ICON_OPACITY.EXECUTABLE);
assert.equal(resolveQueueIconOpacity(0), QUEUE_ICON_OPACITY.EMPTY, "no output nodes dims the icon");
/* A wrong reading must dim an icon, never promise an execution that then fails. */
for (const bad of [-1, NaN, null, undefined, "", "x", [], {}]) {
    assert.equal(
        resolveQueueIconOpacity(bad),
        QUEUE_ICON_OPACITY.EMPTY,
        `unusable count ${JSON.stringify(bad)} must dim, not promise an execution that will fail`
    );
}
assert.equal(resolveQueueIconOpacity("3"), QUEUE_ICON_OPACITY.EXECUTABLE, "a numeric string still counts");

/* 5. Purity — imported by the browser and by this test. */
const moduleSource = readFileSync(
    new URL("../entry/canvas-groups/action-icon-visibility.js", import.meta.url),
    "utf8"
);
const codeOnly = moduleSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
for (const forbidden of ["document", "window", "app.", "globalThis", "localStorage", "require("]) {
    assert.ok(
        !codeOnly.includes(forbidden),
        `action-icon-visibility.js must stay DOM-free — found "${forbidden}"`
    );
}

/* 6. Call sites in the groups file. */
const groups = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
assert.ok(
    groups.includes('from "./canvas-groups/action-icon-visibility.js'),
    "workspace2_canvas_groups.js must import the visibility module"
);

/* The pointer must be resolved into canvas space once per frame, outside the
 * per-group loop — the conversion is identical for every frame on screen. */
assert.match(
    groups,
    /const pointerCanvasPoint = pointerClient\s*\n\s*\? this\.getCanvasPointFromPointerEvent\(pointerClient\)\s*\n\s*: null;/,
    "the pointer must be converted to canvas space once per frame"
);
assert.match(
    groups,
    /const pointerHeld = Number\(pointerClient\?\.buttons\) > 0;/,
    "a held button is what marks an in-progress gesture"
);
assert.match(
    groups,
    /pointerInside: isPointInsideBounds\(b, pointerCanvasPoint\)/,
    "visibility must be decided geometrically against the frame bounds"
);
assert.match(
    groups,
    /isRenaming: Boolean\(el\.querySelector\('\.xzg-group-title-input'\)\)/,
    "an open rename box must pin the icons visible"
);

/* Hiding must preserve the layout box, or the title jumps on every frame entry. */
assert.match(
    groups,
    /const iconVisibility = iconsVisible \? 'visible' : 'hidden';/,
    "hiding must use visibility so the icons keep their layout box"
);
assert.match(groups, /if \(delBtn\) delBtn\.style\.visibility = iconVisibility;/, "the delete icon hides with the rest — all five, per the user's decision");
assert.match(groups, /btn\.style\.visibility = iconVisibility;/, "the four button icons hide too");
const positionsFn = groups.match(/\n    updatePositions\(\) \{([\s\S]*?)\n    \},/);
assert.ok(positionsFn, "updatePositions must still exist");
assert.doesNotMatch(
    positionsFn[1],
    /style\.display = 'none'[\s\S]{0,80}xzg-group-mode-btn|(?:delBtn|btn)\.style\.display = 'none'/,
    "the icons must never be hidden with display:none — that collapses their width and makes the title jump"
);

/* T-039's count must come from the existing probe, so the icon and the notice
 * shown after a click can never disagree. */
assert.match(
    groups,
    /resolveQueueIconOpacity\(this\._getGroupOutputNodes\(g\)\.length\)/,
    "the execute icon's opacity must reuse _getGroupOutputNodes — the same judgement the click path makes"
);
/* That probe scans every graph node, and this loop runs every frame, so it must
 * be skipped while the icons are hidden. */
assert.match(
    groups,
    /const queueOpacity = iconsVisible\s*\n\s*\? resolveQueueIconOpacity/,
    "the output-node scan must be skipped while the icons are hidden — it runs every frame otherwise"
);
assert.match(
    groups,
    /if \(queueOpacity !== null && btn\.dataset\.groupAction === 'queue'\)/,
    "only the execute icon takes the availability opacity"
);

console.log("action-icon-visibility contract OK");
