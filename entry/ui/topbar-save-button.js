/**
 * A Save button for ComfyUI's floating top toolbar.
 *
 * ComfyUI offers no extension field for a clickable top-bar control. The only
 * documented contribution point (`topbarBadges`) renders a static text badge,
 * so a real button has to join the legacy command area that the frontend keeps
 * for `app.menu`. That area is `app.menu.element`, a flex row holding the three
 * native `ComfyButtonGroup`s; the frontend appends it into the top bar's
 * `[data-testid="legacy-topbar-container"]` and reveals that container as soon
 * as it finds a non-empty grandchild.
 *
 * Two placement rules follow from how neighbours behave:
 *
 * 1. Our slot is a direct child of `app.menu.element`, never a child of one of
 *    the native groups. `ComfyButtonGroup.update()` calls `replaceChildren()`
 *    over its own element, so anything injected into a group is silently wiped
 *    the next time any extension appends a button to it.
 * 2. Our slot is kept last. The sibling Layout plugin inserts its align buttons
 *    *before* the settings group, and extensions load in an order that is not
 *    stable across refreshes — the same drift that used to move our canvas
 *    context-menu rows around. Last place is the one position no `insertBefore`
 *    can take, and a `childList` observer restores it if an appending extension
 *    ever does take it.
 *
 * The planners below are pure so the placement and enabled/dirty rules stay
 * testable without booting ComfyUI.
 */

export const TOPBAR_SAVE_ENABLED_KEY = "workspace2.topbar.save.enabled";
export const TOPBAR_SAVE_SLOT_CLASS = "workspacekit-topbar-save-slot";
export const TOPBAR_SAVE_BUTTON_CLASS = "workspacekit-topbar-save-button";
export const TOPBAR_SAVE_DOT_CLASS = "workspacekit-topbar-save-dot";
export const TOPBAR_SAVE_COMMAND_ID = "Comfy.SaveWorkflow";

// The user asked for ComfyUI's own save glyph. PrimeIcons ships with the
// frontend and the native workflow menu uses this exact class for Save.
export const TOPBAR_SAVE_ICON_CLASS = "pi pi-save";

// Re-asserting last place is a DOM write, and a DOM write wakes the observer
// again. Our own move settles immediately (the next plan reports "keep"), but a
// second extension that also insists on last place would ping-pong forever.
// The cap only has to be well above the number of extensions that legitimately
// append during one load burst, since every defensive write is a single
// appendChild; the quiet timer then clears it.
export const REASSERT_BURST_LIMIT = 32;
export const REASSERT_QUIET_MS = 1000;

/**
 * Decide where our slot belongs among `app.menu.element`'s children.
 *
 * `keep` must be reported whenever the slot is already last, otherwise the
 * observer would rewrite the DOM on every unrelated mutation.
 */
export function planTopbarSaveSlotPlacement({ childCount = 0, slotIndex = -1 } = {}) {
  const count = Math.max(0, Math.trunc(childCount) || 0);
  const index = Math.trunc(slotIndex);
  if (!Number.isFinite(index) || index < 0) {
    return { action: "insert", moved: true };
  }
  if (index >= count) {
    // Reported as detached rather than trusted: a stale index means the slot is
    // no longer where the caller thinks it is.
    return { action: "insert", moved: true };
  }
  return index === count - 1
    ? { action: "keep", moved: false }
    : { action: "move", moved: true };
}

/**
 * Saving is delegated to ComfyUI's own command, so the button mirrors the same
 * availability rule the WK panel's File menu already uses: no active workflow
 * means nothing to save.
 *
 * `isTemporary` is a second dirty signal, not a nicety. A brand-new workflow
 * that has never been written to disk reports `isModified: false` while ComfyUI
 * still marks its title with `*`; observed live on a real page, the dot stayed
 * dark on exactly the workflow that most needed saving.
 */
export function planTopbarSaveButtonState({
  hasActiveWorkflow = false,
  isModified = false,
  isTemporary = false,
  saving = false,
} = {}) {
  const active = Boolean(hasActiveWorkflow);
  const needsSave = Boolean(isModified) || Boolean(isTemporary);
  return {
    disabled: !active || Boolean(saving),
    dirty: active && !saving && needsSave,
    busy: Boolean(saving),
  };
}

/** Default-on: only an explicit "0" hides the button. */
export function isTopbarSaveButtonEnabled(readItem) {
  if (typeof readItem !== "function") return true;
  return readItem(TOPBAR_SAVE_ENABLED_KEY) !== "0";
}

export function createReassertBudget({ limit = REASSERT_BURST_LIMIT } = {}) {
  const cap = Math.max(1, Math.trunc(limit) || 1);
  let spent = 0;
  return {
    consume() {
      spent += 1;
      return spent <= cap;
    },
    reset() {
      spent = 0;
    },
    get spent() {
      return spent;
    },
    get exhausted() {
      return spent > cap;
    },
  };
}

const STYLE_ID = "workspacekit-topbar-save-style";

// Deliberately mirrors the sibling Layout plugin's top-toolbar metrics so the
// two WorkspaceKit-family controls read as one cluster instead of two sizes.
//
// The slot carries none of ComfyUI's legacy button classes on purpose. Measured
// live in a crowded top bar, `comfyui-button-group` contributes `overflow:hidden`
// and `comfyui-button` contributes `flex:1`, which together let the row's flex
// shrink squeeze the 30px button down to 22px and then clip it. The frontend's
// container-visibility check keys off a non-empty grandchild, not a class name,
// so dropping both classes costs nothing.
//
// Keep prose in JS comments, never inside the template literal: a backtick
// there ends the string and `node --check` does not catch it in script mode.
export function ensureTopbarSaveStyles(doc) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${TOPBAR_SAVE_SLOT_CLASS} { display: inline-flex; flex: 0 0 auto; align-items: center; overflow: visible; min-width: 30px; min-height: 30px; margin-inline: 4px; }
    .${TOPBAR_SAVE_SLOT_CLASS}[hidden] { display: none !important; }
    .${TOPBAR_SAVE_BUTTON_CLASS} { position: relative; appearance: none; box-sizing: border-box; display: grid; flex: 0 0 auto; place-items: center; width: 30px; min-width: 30px; height: 30px; min-height: 30px; margin: 0; padding: 5px; border: 0 !important; border-radius: 6px; background: transparent !important; box-shadow: none !important; color: var(--fg-color, var(--p-text-color, #ddd)); cursor: pointer; }
    .${TOPBAR_SAVE_BUTTON_CLASS}:not(:disabled):hover { background: var(--comfy-menu-hover-bg, var(--p-list-option-hover-background, rgba(255, 255, 255, 0.075))) !important; }
    .${TOPBAR_SAVE_BUTTON_CLASS}:disabled { cursor: default; opacity: 0.42; }
    .${TOPBAR_SAVE_BUTTON_CLASS} > i { display: block; font-size: 16px; line-height: 1; }
    .${TOPBAR_SAVE_DOT_CLASS} { position: absolute; top: 3px; right: 3px; width: 6px; height: 6px; border-radius: 50%; background: var(--p-primary-color, #4ea1ff); pointer-events: none; }
  `;
  doc.head.append(style);
}

/**
 * Owns the button's DOM, its last-place enforcement and its enabled/dirty
 * refresh. Every ComfyUI touch point arrives as an injected accessor so this
 * module stays loadable in a plain Node test.
 */
export function createTopbarSaveButton({
  document: doc,
  getMenuElement,
  hasActiveWorkflow,
  isActiveWorkflowModified,
  isActiveWorkflowTemporary,
  saveActiveWorkflow,
  translate,
  isEnabled,
  onError,
  requestFrame = (callback) => setTimeout(callback, 0),
  scheduleQuiet = (callback, delay) => setTimeout(callback, delay),
}) {
  const t = typeof translate === "function" ? translate : (key) => key;
  let slot = null;
  let button = null;
  let dot = null;
  let observer = null;
  let observedParent = null;
  let saving = false;
  let quietTimer = null;
  const budget = createReassertBudget();

  const enabled = () => (typeof isEnabled === "function" ? isEnabled() !== false : true);

  function build() {
    if (slot) return slot;
    ensureTopbarSaveStyles(doc);
    slot = doc.createElement("div");
    slot.className = TOPBAR_SAVE_SLOT_CLASS;
    slot.dataset.workspacekitTopbarSlot = "save";
    slot.setAttribute("role", "group");

    button = doc.createElement("button");
    button.type = "button";
    button.className = TOPBAR_SAVE_BUTTON_CLASS;
    const icon = doc.createElement("i");
    icon.className = TOPBAR_SAVE_ICON_CLASS;
    icon.setAttribute("aria-hidden", "true");
    dot = doc.createElement("span");
    dot.className = TOPBAR_SAVE_DOT_CLASS;
    dot.hidden = true;
    button.append(icon, dot);
    button.addEventListener("click", () => { void runSave(); });
    slot.append(button);
    return slot;
  }

  async function runSave() {
    if (saving || !hasActiveWorkflow?.()) return;
    saving = true;
    refresh();
    try {
      await saveActiveWorkflow();
    } catch (error) {
      onError?.(error);
    } finally {
      saving = false;
      refresh();
    }
  }

  function refresh() {
    if (!button) return;
    const state = planTopbarSaveButtonState({
      hasActiveWorkflow: Boolean(hasActiveWorkflow?.()),
      isModified: Boolean(isActiveWorkflowModified?.()),
      isTemporary: Boolean(isActiveWorkflowTemporary?.()),
      saving,
    });
    button.disabled = state.disabled;
    button.setAttribute("aria-disabled", String(state.disabled));
    const label = state.dirty ? t("topbar.saveUnsaved") : t("topbar.save");
    button.title = label;
    button.setAttribute("aria-label", label);
    if (dot) dot.hidden = !state.dirty;
  }

  // Runs on our own writes too, so it must be cheap and must not write when the
  // plan says "keep". The enabled check is not redundant: removing the slot is
  // itself a childList mutation, so without it the observer would immediately
  // put back the button the user just switched off.
  function placeSlot() {
    if (!enabled()) return false;
    const parent = getMenuElement?.();
    if (!parent || !slot) return false;
    const children = [...parent.children];
    const plan = planTopbarSaveSlotPlacement({
      childCount: children.length,
      slotIndex: children.indexOf(slot),
    });
    if (!plan.moved) return false;
    if (!budget.consume()) return false;
    parent.append(slot);
    startQuietTimer();
    return true;
  }

  function startQuietTimer() {
    if (quietTimer !== null) return;
    quietTimer = scheduleQuiet(() => {
      quietTimer = null;
      budget.reset();
    }, REASSERT_QUIET_MS);
  }

  function observe() {
    const parent = getMenuElement?.();
    if (!parent || parent === observedParent) return;
    observer?.disconnect();
    observedParent = parent;
    observer = new MutationObserver(() => { placeSlot(); });
    observer.observe(parent, { childList: true });
  }

  /**
   * Idempotent: safe to call on startup, on a settings toggle, and again after
   * the top bar remounts. `app.menu.element` is created once and merely moved
   * by the frontend, so our slot rides along with it.
   */
  function install() {
    if (!enabled()) {
      detach();
      return false;
    }
    const parent = getMenuElement?.();
    if (!parent) return false;
    build();
    observe();
    if (slot.parentElement !== parent || parent.lastElementChild !== slot) {
      budget.reset();
      parent.append(slot);
      startQuietTimer();
    }
    refresh();
    return true;
  }

  // Stops watching as well as removing: an idle observer on the menu row would
  // keep waking for every neighbour's mutation with nothing left to place.
  function detach() {
    observer?.disconnect();
    observer = null;
    observedParent = null;
    slot?.remove();
  }

  function setEnabled(next) {
    if (next === false) {
      detach();
      return false;
    }
    return install();
  }

  // ComfyUI can settle the top bar a frame after our startup stage runs, so a
  // single deferred retry avoids depending on mount timing.
  function installWhenReady() {
    if (install()) return true;
    requestFrame(() => { install(); });
    return false;
  }

  return Object.freeze({ install, installWhenReady, setEnabled, refresh, placeSlot });
}
