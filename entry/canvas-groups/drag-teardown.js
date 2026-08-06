/*
 * T-043: how a drag that WorkspaceKit did not start learns that it has moved,
 * and that it has ended.
 *
 * The bug this exists to prevent
 * -----------------------------
 * The "node and border move together" drag is started from a pointerdown on a
 * node that LiteGraph owns. LiteGraph calls `setPointerCapture` on that
 * pointerdown and `preventDefault` on the gesture. Two consequences, both
 * measured on the live page:
 *
 *   - The release arrives as `pointerup` only; `mouseup` never fires. A teardown
 *     listener bound to `mouseup` therefore never ran, so the move listener
 *     stayed bound and the frame followed the bare cursor forever — immune to
 *     Escape and Delete, because that surviving listener recorded which frame to
 *     move when it was bound and never consults the selection again.
 *   - `mousemove` is suppressed for the entire drag (preventDefault suppresses
 *     the compatibility mouse events) and starts flowing again the instant the
 *     button is released. A move listener bound to `mousemove` therefore
 *     receives nothing while the gesture is live and everything afterwards —
 *     precisely inverted from what it needs.
 *
 * Both halves have a single cause: this gesture belongs to the pointer event
 * family, so both the move and the teardown must be listened for there.
 *
 * Why the mouse names are kept anyway
 * -----------------------------------
 * They cost nothing once teardown is once-guarded, and a synthetic
 * `mousemove`/`mouseup` from a test or another extension should still work. The
 * move handler derives an absolute delta from the gesture's start position
 * rather than accumulating, so a `pointermove` and its compatibility `mousemove`
 * arriving as a pair produce the same result twice instead of double the motion.
 *
 * Two independent defences against the leak, deliberately
 * ------------------------------------------------------
 * 1. Listen for what the browser actually emits (`pointerup`/`pointercancel`).
 * 2. Treat a buttonless move as an ended gesture. If every teardown event is
 *    somehow missed — a capture-phase `stopPropagation` from another extension,
 *    a release outside the browser viewport, a browser quirk — the very next
 *    motion reports `buttons === 0` and ends the drag itself. This is the net
 *    that makes the failure self-healing instead of permanent.
 *
 * Teardown must be idempotent because 1 and 2 overlap by design: a normal
 * release fires `pointerup`, then a trailing move.
 */

/**
 * Every event that can mean "the gesture moved".
 *
 * `pointermove` first because it is the only one that arrives during a
 * pointer-captured drag.
 */
export const DRAG_MOVE_EVENT_NAMES = Object.freeze([
    "pointermove",
    "mousemove",
]);

/**
 * Every event that can mean "this gesture is over".
 *
 * `pointerup`/`pointercancel` first because they are the ones that actually
 * arrive during a pointer-captured drag.
 */
export const DRAG_TEARDOWN_EVENT_NAMES = Object.freeze([
    "pointerup",
    "pointercancel",
    "mouseup",
]);

/**
 * Should a move event end the drag instead of advancing it?
 *
 * Only an explicit numeric `buttons === 0` aborts. A missing or non-numeric
 * `buttons` is treated as "keep going", so a synthetic event that omits the
 * field cannot cancel a legitimate drag.
 */
export function shouldAbortDragFromMove(event) {
    if (!event || typeof event !== "object") return false;
    const { buttons } = event;
    if (typeof buttons !== "number" || !Number.isFinite(buttons)) return false;
    return buttons === 0;
}

/**
 * Wrap a teardown routine so it runs at most once, however many of the
 * overlapping end-of-gesture signals arrive.
 *
 * Returns a function that reports whether this call was the one that ran the
 * teardown, which lets a caller keep a `finished` flag without a second
 * variable.
 */
export function createOnceGuard(run) {
    if (typeof run !== "function") {
        throw new TypeError("createOnceGuard requires a function");
    }
    let done = false;
    return (...args) => {
        if (done) return false;
        done = true;
        run(...args);
        return true;
    };
}
