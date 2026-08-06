/*
 * Contract test for entry/canvas-groups/drag-teardown.js (T-043).
 *
 * The two bugs being locked out — one cause
 * ----------------------------------------
 * Double-clicking a frame's title bar selects the frame and its member nodes.
 * Pressing one of those already-selected nodes starts the "node and border move
 * together" drag. LiteGraph takes pointer capture on that same pointerdown and
 * calls preventDefault, so for the whole gesture the browser emits pointer
 * events and NOT mouse events. Measured live:
 *
 *   - `mouseup` never fires, so the old mouseup-only teardown never ran: the move
 *     listener stayed bound and the frame followed the bare cursor forever,
 *     immune to Escape and Delete because the surviving listener recorded its
 *     target at bind time.
 *   - `mousemove` is suppressed during the drag and resumes on release, so the
 *     old mousemove-only move handler saw nothing while the gesture was live and
 *     everything afterwards. The frame did not follow the node at all.
 *
 * So this suite pins, at the call site and not just in the pure rule, that both
 * the move and the teardown are registered for the pointer events the browser
 * actually emits, and that a buttonless move can end the drag on its own.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    DRAG_MOVE_EVENT_NAMES,
    DRAG_TEARDOWN_EVENT_NAMES,
    createOnceGuard,
    shouldAbortDragFromMove,
} from "../entry/canvas-groups/drag-teardown.js";

/* 1. Both event lists must contain the pointer events, because those are the
 *    only ones that survive pointer capture + preventDefault. */
assert.ok(
    DRAG_MOVE_EVENT_NAMES.includes("pointermove"),
    "pointermove must be a move event — it is the ONLY motion signal that arrives during a pointer-captured node drag"
);
assert.ok(
    DRAG_MOVE_EVENT_NAMES.includes("mousemove"),
    "mousemove must stay in the list — synthetic mousemove from tests or other extensions should still move the frame"
);
assert.equal(
    DRAG_MOVE_EVENT_NAMES[0],
    "pointermove",
    "pointermove should come first: it is the event that actually fires in the failing case"
);
assert.ok(Object.isFrozen(DRAG_MOVE_EVENT_NAMES), "the move event list must be frozen");
assert.equal(
    new Set(DRAG_MOVE_EVENT_NAMES).size,
    DRAG_MOVE_EVENT_NAMES.length,
    "no duplicate move event names — a duplicate would double-bind and double-unbind"
);

assert.ok(
    DRAG_TEARDOWN_EVENT_NAMES.includes("pointerup"),
    "pointerup must be a teardown event — it is the ONLY release signal that arrives during a pointer-captured node drag"
);
assert.ok(
    DRAG_TEARDOWN_EVENT_NAMES.includes("pointercancel"),
    "pointercancel must be a teardown event — a cancelled gesture must not leave the drag running"
);
assert.ok(
    DRAG_TEARDOWN_EVENT_NAMES.includes("mouseup"),
    "mouseup must stay in the list — synthetic mouseup from tests or other extensions should still end the gesture"
);
assert.equal(
    DRAG_TEARDOWN_EVENT_NAMES[0],
    "pointerup",
    "pointerup should come first: it is the event that actually fires in the failing case"
);
assert.ok(Object.isFrozen(DRAG_TEARDOWN_EVENT_NAMES), "the teardown event list must be frozen");
assert.equal(
    new Set(DRAG_TEARDOWN_EVENT_NAMES).size,
    DRAG_TEARDOWN_EVENT_NAMES.length,
    "no duplicate teardown event names — a duplicate would double-bind and double-unbind"
);

/* The two families must not overlap, or one event would both move and end the
 * drag. */
for (const name of DRAG_MOVE_EVENT_NAMES) {
    assert.ok(
        !DRAG_TEARDOWN_EVENT_NAMES.includes(name),
        `"${name}" must not be both a move and a teardown event`
    );
}

/* 2. The buttonless-move safety net. */
assert.equal(
    shouldAbortDragFromMove({ buttons: 0 }),
    true,
    "a move with no button held means the release was missed — the drag must end"
);
assert.equal(shouldAbortDragFromMove({ buttons: 1 }), false, "left button held: the drag continues");
assert.equal(shouldAbortDragFromMove({ buttons: 2 }), false, "right button held: still a held gesture");
assert.equal(shouldAbortDragFromMove({ buttons: 3 }), false, "two buttons held: still a held gesture");

/* A missing or unusable `buttons` must NOT abort. Synthetic events routinely
 * omit the field, and cancelling a real drag on those would be a worse bug than
 * the one being fixed. */
for (const event of [
    {},
    { buttons: undefined },
    { buttons: null },
    { buttons: "0" },
    { buttons: NaN },
    { buttons: Infinity },
    { buttons: -Infinity },
    { clientX: 10, clientY: 20 },
]) {
    assert.equal(
        shouldAbortDragFromMove(event),
        false,
        `a move without a usable numeric buttons value must not abort the drag: ${JSON.stringify(event)}`
    );
}
for (const bad of [null, undefined, 0, "", "pointermove", [], true]) {
    assert.equal(shouldAbortDragFromMove(bad), false, `malformed move event must not abort: ${String(bad)}`);
}

/* 3. Teardown must be idempotent. A normal release fires pointerup AND mouseup,
 *    and usually a trailing mousemove, so the guard is load-bearing rather than
 *    defensive decoration. */
let runs = 0;
const guarded = createOnceGuard(() => { runs += 1; });
assert.equal(guarded(), true, "the first call reports that it ran the teardown");
assert.equal(runs, 1, "teardown ran once");
assert.equal(guarded(), false, "the second call reports that it did nothing");
assert.equal(guarded(), false, "a third call still does nothing");
assert.equal(runs, 1, "teardown must never run twice — it resumes membership sync and writes the workflow");

/* Arguments reach the wrapped routine, so a teardown that wants the event can
 * have it. */
let seen = null;
const withArgs = createOnceGuard((event) => { seen = event; });
withArgs({ type: "pointerup" });
assert.deepEqual(seen, { type: "pointerup" }, "the guard forwards its arguments");

/* Separate guards are independent — one drag ending must not disarm the next. */
let a = 0;
let b = 0;
const guardA = createOnceGuard(() => { a += 1; });
const guardB = createOnceGuard(() => { b += 1; });
guardA();
guardA();
assert.equal(a, 1, "guard A ran once");
assert.equal(b, 0, "guard B is untouched by guard A");
guardB();
assert.equal(b, 1, "guard B still works after guard A was spent — a second drag must be able to end too");

for (const bad of [null, undefined, 42, "run", {}]) {
    assert.throws(
        () => createOnceGuard(bad),
        TypeError,
        `createOnceGuard must reject a non-function: ${String(bad)}`
    );
}

/* 4. Purity: this rule must stay testable without a browser. */
const source = readFileSync(new URL("../entry/canvas-groups/drag-teardown.js", import.meta.url), "utf8");
for (const forbidden of ["document", "window", "app?.", "requestAnimationFrame", "addEventListener"]) {
    assert.ok(
        !source.includes(forbidden),
        `drag-teardown.js must stay pure — found "${forbidden}"`
    );
}

/* 5. Call-site assertions. The pure rule above is worthless if the joint drag
 *    does not use it, so pin the actual wiring. */
const groups = readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");

assert.match(
    groups,
    /import \{\s*\n\s*DRAG_MOVE_EVENT_NAMES,\s*\n\s*DRAG_TEARDOWN_EVENT_NAMES,\s*\n\s*createOnceGuard,\s*\n\s*shouldAbortDragFromMove,\s*\n\} from "\.\/canvas-groups\/drag-teardown\.js\?v=/,
    "the joint drag must import the teardown rule with a cache-busting version"
);

const jointDragStart = groups.indexOf("startNativeNodeJointGroupDrag(plan, downEv)");
assert.ok(jointDragStart > 0, "startNativeNodeJointGroupDrag must still exist");
const jointDragBody = groups.slice(jointDragStart, groups.indexOf("startResize(gid, downEv)", jointDragStart));
assert.ok(jointDragBody.length > 0, "could not isolate the joint drag body");

assert.match(
    jointDragBody,
    /DRAG_MOVE_EVENT_NAMES\.forEach\(\(name\) => \{\s*\n\s*document\.addEventListener\(name, onMove, true\);/,
    "the joint drag must bind the move handler for EVERY name in the move list — mousemove alone is suppressed for the whole captured drag"
);
assert.match(
    jointDragBody,
    /DRAG_MOVE_EVENT_NAMES\.forEach\(\(name\) => \{\s*\n\s*document\.removeEventListener\(name, onMove, true\);/,
    "teardown must unbind every move name it bound, or the leak simply moves to another event"
);
assert.match(
    jointDragBody,
    /DRAG_TEARDOWN_EVENT_NAMES\.forEach\(\(name\) => \{\s*\n\s*document\.addEventListener\(name, finish, true\);/,
    "the joint drag must bind teardown for EVERY name in the list, not just mouseup"
);
assert.match(
    jointDragBody,
    /DRAG_TEARDOWN_EVENT_NAMES\.forEach\(\(name\) => \{\s*\n\s*document\.removeEventListener\(name, finish, true\);/,
    "teardown must unbind every name it bound, or the leak simply moves to another event"
);
assert.match(
    jointDragBody,
    /const finish = createOnceGuard\(/,
    "teardown must be wrapped in the once-guard — pointerup and a trailing move both reach it on a normal release"
);
assert.match(
    jointDragBody,
    /if \(shouldAbortDragFromMove\(e\)\) \{\s*\n\s*finish\(\);\s*\n\s*return;/,
    "the move handler must end the drag on a buttonless move — this is the net that makes a missed release self-healing"
);

/* The specific shape of both halves of the old bug must not come back: handlers
 * bound to the mouse family alone. */
assert.doesNotMatch(
    jointDragBody,
    /document\.addEventListener\('mouseup'/,
    "the joint drag must NOT bind a bare 'mouseup' — pointer capture prevents it from arriving, which is half the bug"
);
assert.doesNotMatch(
    jointDragBody,
    /document\.addEventListener\('mousemove'/,
    "the joint drag must NOT bind a bare 'mousemove' — preventDefault suppresses it for the whole drag, which is the other half"
);
assert.doesNotMatch(
    jointDragBody,
    /const onUp = \(\) => \{/,
    "the old mouseup-only teardown must be gone, not merely supplemented"
);

/* Because both a pointermove and its compatibility mousemove can arrive for one
 * physical motion, the delta must be absolute from the gesture start. An
 * accumulating delta (`+=`) would double every movement. */
assert.match(
    jointDragBody,
    /const dx = \(e\.clientX - startX\) \/ scale;/,
    "the delta must be absolute from the gesture start, not accumulated — two event families can report one motion"
);
assert.doesNotMatch(
    jointDragBody,
    /(dx|dy) \+=/,
    "the delta must never accumulate: pointermove + mousemove for one motion would double the frame's movement"
);

/* The abort check must come BEFORE the frame is moved, otherwise a buttonless
 * move still drags the frame one last time before ending. */
const abortIndex = jointDragBody.indexOf("shouldAbortDragFromMove");
const moveIndex = jointDragBody.indexOf("group.bounds.x = x + dx");
assert.ok(abortIndex > 0 && moveIndex > 0, "could not locate both the abort check and the bounds write");
assert.ok(
    abortIndex < moveIndex,
    "the buttonless-move check must run before the frame is moved, or the frame still jumps once with a bare cursor"
);

/* Membership sync must still be resumed by teardown. It being stuck `true` was
 * the second half of the observed damage: member auto-capture stayed dead. */
assert.match(
    jointDragBody,
    /self\._suspendMembershipSync = false;/,
    "teardown must resume membership sync — it was observed stuck true after the leak"
);

console.log("drag-teardown contract OK");
