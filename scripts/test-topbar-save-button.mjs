import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  REASSERT_BURST_LIMIT,
  TOPBAR_SAVE_BUTTON_CLASS,
  TOPBAR_SAVE_COMMAND_ID,
  TOPBAR_SAVE_DOT_CLASS,
  TOPBAR_SAVE_ENABLED_KEY,
  TOPBAR_SAVE_ICON_CLASS,
  TOPBAR_SAVE_SLOT_CLASS,
  createReassertBudget,
  createTopbarSaveButton,
  isTopbarSaveButtonEnabled,
  planTopbarSaveButtonState,
  planTopbarSaveSlotPlacement,
} from "../entry/ui/topbar-save-button.js";
import { isOfficialWorkflowTemporary } from "../entry/workflows/official-adapter.js";
import {
  StubDocument,
  createTopbarFixture,
  installStubMutationObserver,
} from "./lib/topbar-dom-stub.mjs";

// --- Placement: last place, always -------------------------------------------
// The user's requirement is that no other extension can take this button's
// position. Last place is the only slot an insertBefore cannot claim, so the
// planner's whole job is to report when we have lost it.
{
  // Already last: must be a no-op. Writing here would make the observer rewrite
  // the DOM on every unrelated mutation, the same flicker the canvas menu had.
  const plan = planTopbarSaveSlotPlacement({ childCount: 4, slotIndex: 3 });
  assert.equal(plan.action, "keep");
  assert.equal(plan.moved, false);
}
{
  // An extension appended after us: reclaim last place.
  const plan = planTopbarSaveSlotPlacement({ childCount: 5, slotIndex: 3 });
  assert.equal(plan.action, "move");
  assert.equal(plan.moved, true);
}
{
  // The Layout plugin inserts before the settings group, which shifts our index
  // without displacing us. That must still be "keep".
  assert.equal(planTopbarSaveSlotPlacement({ childCount: 5, slotIndex: 4 }).action, "keep");
}
{
  // Not present at all, and a stale index past the end, both mean "insert".
  assert.equal(planTopbarSaveSlotPlacement({ childCount: 3, slotIndex: -1 }).action, "insert");
  assert.equal(planTopbarSaveSlotPlacement({ childCount: 3, slotIndex: 9 }).action, "insert");
  assert.equal(planTopbarSaveSlotPlacement({}).action, "insert");
}
{
  // A single child that is us is already last.
  assert.equal(planTopbarSaveSlotPlacement({ childCount: 1, slotIndex: 0 }).action, "keep");
}

// --- Ping-pong guard ----------------------------------------------------------
// Our own re-assert wakes the observer again; that settles because the next plan
// reports "keep". A second extension that also insists on last place would not
// settle, so the budget must stop writing rather than spin forever.
{
  const budget = createReassertBudget({ limit: 3 });
  assert.equal(budget.consume(), true);
  assert.equal(budget.consume(), true);
  assert.equal(budget.consume(), true);
  assert.equal(budget.consume(), false, "the budget must refuse the write past its limit");
  assert.equal(budget.exhausted, true);
  budget.reset();
  assert.equal(budget.consume(), true, "a quiet period must restore the budget");
}
assert.ok(REASSERT_BURST_LIMIT > 1, "one write per burst would lose a legitimate race");

// --- Live placement against a stubbed top bar --------------------------------
// The requirement is that no extension can take this button's position, and the
// threat is a *neighbour's* DOM write. The planner alone cannot show that, so
// drive the real controller over a stub of app.menu.element.
{
  const restoreObserver = installStubMutationObserver();
  try {
    const doc = new StubDocument();
    const bar = createTopbarFixture(doc);
    const saved = [];
    let activeWorkflow = { isModified: false };

    const controller = createTopbarSaveButton({
      document: doc,
      getMenuElement: () => bar.menuElement,
      hasActiveWorkflow: () => Boolean(activeWorkflow),
      isActiveWorkflowModified: () => Boolean(activeWorkflow?.isModified),
      isActiveWorkflowTemporary: () => isOfficialWorkflowTemporary(activeWorkflow),
      saveActiveWorkflow: async () => { saved.push("save"); activeWorkflow.isModified = false; },
      translate: (key) => key,
      isEnabled: () => true,
      requestFrame: (callback) => callback(),
      scheduleQuiet: () => null,
    });

    assert.equal(controller.install(), true);
    const slot = bar.menuElement.lastElementChild;
    assert.ok(slot.classList.contains(TOPBAR_SAVE_SLOT_CLASS), "the slot must be installed last");
    // Measured live: ComfyUI's legacy `comfyui-button-group` brings
    // `overflow:hidden` and `comfyui-button` brings `flex:1`, which together let
    // the crowded top bar shrink the 30px button to 22px and clip it.
    assert.ok(
      !slot.classList.contains("comfyui-button-group"),
      "the slot must not inherit the legacy group's overflow:hidden",
    );
    // Outside the native groups on purpose: ComfyButtonGroup.update() calls
    // replaceChildren() over its own element, which would delete us.
    for (const group of [bar.actionsGroup, bar.settingsGroup, bar.viewGroup]) {
      assert.equal(group.children.length, 0, "nothing of ours may live inside a native group");
    }

    // The sibling Layout plugin's real insertion point. It shifts our index but
    // must not displace us, and must not trigger a defensive rewrite.
    const layoutGroup = doc.createElement("div");
    layoutGroup.className = "workspacekit-layout-top-toolbar-group";
    bar.menuElement.insertBefore(layoutGroup, bar.settingsGroup);
    assert.equal(bar.menuElement.lastElementChild, slot, "an insertBefore must never take last place");

    // An extension that appends instead: we must reclaim last place.
    const rival = doc.createElement("div");
    rival.className = "other-extension-group";
    bar.menuElement.append(rival);
    assert.equal(bar.menuElement.lastElementChild, slot, "an appending extension must be pushed back");
    assert.equal(bar.menuElement.children.indexOf(rival), bar.menuElement.children.length - 2);

    // A whole load burst of appending extensions, all inside one quiet window.
    for (let index = 0; index < 12; index += 1) {
      bar.menuElement.append(doc.createElement("div"));
    }
    assert.equal(bar.menuElement.lastElementChild, slot, "the burst budget must outlast a realistic load");

    // A top-bar remount re-appends app.menu.element; our slot rides along
    // because it is a child of that element, not of the Vue container.
    bar.legacyContainer.append(bar.menuElement);
    assert.equal(bar.menuElement.lastElementChild, slot, "a remount must not strand the slot");

    // State: dirty dot and disabled rule.
    const button = slot.children[0];
    assert.ok(button.classList.contains(TOPBAR_SAVE_BUTTON_CLASS));
    assert.ok(
      !button.classList.contains("comfyui-button"),
      "the button must not inherit the legacy flex:1 that let the row squeeze it",
    );
    assert.equal(button.children[0].className, TOPBAR_SAVE_ICON_CLASS, "ComfyUI's own save glyph");
    const dot = button.children[1];
    assert.ok(dot.classList.contains(TOPBAR_SAVE_DOT_CLASS));
    assert.equal(dot.hidden, true, "a clean workflow shows no dot");
    assert.equal(button.disabled, false);

    activeWorkflow.isModified = true;
    controller.refresh();
    assert.equal(dot.hidden, false, "an edited workflow must show the dot");
    assert.equal(button.title, "topbar.saveUnsaved");

    activeWorkflow = null;
    controller.refresh();
    assert.equal(button.disabled, true, "no active workflow means nothing to save");
    assert.equal(dot.hidden, true);

    // Clicking must delegate to the injected save, and must not double-fire.
    activeWorkflow = { isModified: true };
    controller.refresh();
    button.dispatch("click");
    button.dispatch("click");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(saved, ["save"], "a second click during a save must be ignored");

    // Turning the switch off removes the button immediately; turning it back on
    // restores it, still last.
    controller.setEnabled(false);
    assert.equal(slot.parentElement, null, "the switch must take effect without a refresh");
    assert.ok(
      !bar.menuElement.children.some((child) => child.classList.contains(TOPBAR_SAVE_SLOT_CLASS)),
      "no orphan slot may stay in the menu row",
    );
    // Regression: removing the slot is itself a childList mutation, so an
    // unguarded observer put the button straight back and the switch looked
    // broken. Any later neighbour mutation must also leave it off.
    bar.menuElement.append(doc.createElement("div"));
    assert.ok(
      !bar.menuElement.children.some((child) => child.classList.contains(TOPBAR_SAVE_SLOT_CLASS)),
      "a switched-off button must not be reinstated by the last-place observer",
    );
    controller.setEnabled(true);
    assert.equal(bar.menuElement.lastElementChild.classList.contains(TOPBAR_SAVE_SLOT_CLASS), true);
  } finally {
    restoreObserver();
  }
}

// A frontend that has dropped the legacy menu must leave the button absent
// rather than throw during startup. This is the failure mode that took the whole
// sidebar down once before.
{
  const restoreObserver = installStubMutationObserver();
  try {
    const doc = new StubDocument();
    const controller = createTopbarSaveButton({
      document: doc,
      getMenuElement: () => null,
      hasActiveWorkflow: () => true,
      isActiveWorkflowModified: () => false,
      saveActiveWorkflow: async () => {},
      translate: (key) => key,
      isEnabled: () => true,
      requestFrame: (callback) => callback(),
      scheduleQuiet: () => null,
    });
    assert.equal(controller.install(), false);
    assert.equal(controller.installWhenReady(), false);
    assert.doesNotThrow(() => controller.refresh());
    assert.doesNotThrow(() => controller.placeSlot());
  } finally {
    restoreObserver();
  }
}

// The preference is read at install time, so a disabled button must never be
// built in the first place.
{
  const restoreObserver = installStubMutationObserver();
  try {
    const doc = new StubDocument();
    const bar = createTopbarFixture(doc);
    const controller = createTopbarSaveButton({
      document: doc,
      getMenuElement: () => bar.menuElement,
      hasActiveWorkflow: () => true,
      isActiveWorkflowModified: () => false,
      saveActiveWorkflow: async () => {},
      translate: (key) => key,
      isEnabled: () => false,
      requestFrame: (callback) => callback(),
      scheduleQuiet: () => null,
    });
    assert.equal(controller.install(), false);
    assert.equal(bar.menuElement.children.length, 3, "an off switch must add nothing to the top bar");
  } finally {
    restoreObserver();
  }
}

// --- Button state -------------------------------------------------------------
// Saving is delegated to ComfyUI's own command, so availability mirrors the WK
// panel's File menu: no active workflow means nothing to save.
assert.deepEqual(
  planTopbarSaveButtonState({ hasActiveWorkflow: false, isModified: false }),
  { disabled: true, dirty: false, busy: false },
);
assert.deepEqual(
  planTopbarSaveButtonState({ hasActiveWorkflow: true, isModified: false }),
  { disabled: false, dirty: false, busy: false },
);
assert.deepEqual(
  planTopbarSaveButtonState({ hasActiveWorkflow: true, isModified: true }),
  { disabled: false, dirty: true, busy: false },
);
// A dirty flag without an active workflow must never light the dot: the store
// reports isModified per workflow, and a closed tab can still carry it.
assert.equal(planTopbarSaveButtonState({ hasActiveWorkflow: false, isModified: true }).dirty, false);
// Observed live: a brand-new workflow reports isModified false while ComfyUI
// still marks its title with `*`, so the dot stayed dark on the one workflow
// that had never been saved at all. isTemporary is the second dirty signal.
assert.equal(
  planTopbarSaveButtonState({ hasActiveWorkflow: true, isModified: false, isTemporary: true }).dirty,
  true,
  "a never-saved workflow must show the dot",
);
assert.equal(
  planTopbarSaveButtonState({ hasActiveWorkflow: false, isTemporary: true }).dirty,
  false,
  "no active workflow still means no dot",
);
assert.equal(
  planTopbarSaveButtonState({ hasActiveWorkflow: true, isTemporary: true, saving: true }).dirty,
  false,
  "mid-save the dot stays suppressed whichever signal raised it",
);
// Mid-save the button is disabled and the dot is suppressed, so a double click
// cannot queue a second save against the same graph.
assert.deepEqual(
  planTopbarSaveButtonState({ hasActiveWorkflow: true, isModified: true, saving: true }),
  { disabled: true, dirty: false, busy: true },
);
assert.deepEqual(planTopbarSaveButtonState(), { disabled: true, dirty: false, busy: false });

// The adapter owns which frontend properties mean "never written to disk", and
// must not report unsaved just because a frontend omits one of them.
assert.equal(isOfficialWorkflowTemporary(null), false);
assert.equal(isOfficialWorkflowTemporary({}), false, "an absent flag is not evidence of unsaved");
assert.equal(isOfficialWorkflowTemporary({ isTemporary: true }), true);
assert.equal(isOfficialWorkflowTemporary({ isPersisted: false }), true);
assert.equal(isOfficialWorkflowTemporary({ isTemporary: false, isPersisted: true }), false);

// --- Visibility preference ---------------------------------------------------
// Default-on was the requested behaviour: a fresh install must show the button
// without the user having to find the setting first.
assert.equal(isTopbarSaveButtonEnabled(() => null), true, "an unset preference must default to on");
assert.equal(isTopbarSaveButtonEnabled(() => "1"), true);
assert.equal(isTopbarSaveButtonEnabled(() => "0"), false);
assert.equal(isTopbarSaveButtonEnabled(undefined), true, "a missing reader must not hide the button");
assert.equal(TOPBAR_SAVE_ENABLED_KEY, "workspace2.topbar.save.enabled");
// The preference export/import bundle collects every `workspace2.` key by
// prefix, so this key travels with a backup only while it keeps that prefix.
assert.ok(TOPBAR_SAVE_ENABLED_KEY.startsWith("workspace2."));

// --- Icon -------------------------------------------------------------------
// The user asked for ComfyUI's own save glyph. PrimeIcons ships with the
// frontend and the native workflow menu uses exactly this class for Save.
assert.equal(TOPBAR_SAVE_ICON_CLASS, "pi pi-save");
assert.equal(TOPBAR_SAVE_COMMAND_ID, "Comfy.SaveWorkflow");

// --- Wiring -----------------------------------------------------------------
const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");

assert.match(
  source,
  /import \{[\s\S]*?createTopbarSaveButton[\s\S]*?\} from "\.\/ui\/topbar-save-button\.js(\?[^"]*)?"/,
  "the controller must be imported by entry.js",
);
assert.ok(
  /runWorkspaceStartupStage\("topbar-save-button", \(\) => installWorkspaceTopbarSaveButton\(\)\)/.test(source),
  "the installer must run as a named startup stage, so a failure is reported instead of silent",
);
assert.ok(
  /function installWorkspaceTopbarSaveButton\(\)/.test(source),
  "a startup stage with no function body is the exact half-deletion that broke the context menu",
);

// The slot must hang off app.menu.element, never off one of the native button
// groups: ComfyButtonGroup.update() calls replaceChildren() over its own
// element, so a button injected into a group disappears the next time any
// extension appends to it.
assert.ok(
  /getMenuElement: \(\) => app\.menu\?\.element \?\? null/.test(source),
  "resolve app.menu.element lazily and tolerate its absence",
);
assert.ok(
  !/app\.menu\??\.(actionsGroup|settingsGroup|viewGroup)/.test(source),
  "never attach into a native ComfyButtonGroup; replaceChildren() would wipe the button",
);

// Saving must delegate to ComfyUI's command rather than reimplement a save.
assert.ok(
  /saveActiveWorkflow: \(\) => executeOfficialWorkflowCommand\(TOPBAR_SAVE_COMMAND_ID\)/.test(source),
  "the button must reuse ComfyUI's own save command, exactly like Ctrl+S",
);

// The dot needs both signals: graphChanged covers edits, and the store
// subscription covers switching tabs, which does not emit graphChanged.
assert.ok(/addEventListener\?\.\("graphChanged", \(\) => button\.refresh\(\)\)/.test(source));
assert.ok(/subscribeOfficialWorkflowStore\(app, \(\) => button\.refresh\(\)\)/.test(source));

// The switch has to act immediately; a preference that only applies after a
// refresh reads as a broken setting.
assert.ok(
  /workspaceState\.topbarSaveButton\?\.setEnabled\(enabled\)/.test(source),
  "toggling the preference must show or hide the live button",
);

const sections = await readFile(new URL("../entry/settings/dialog-sections.js", import.meta.url), "utf8");
assert.ok(
  /settingsCheckbox\(t\("settings\.topbarSaveButton"\), isTopbarSaveEnabled\(\), setTopbarSaveEnabled\)/.test(sections),
  "the Settings dialog must expose the switch",
);
assert.ok(
  /isTopbarSaveEnabled = null/.test(sections),
  "an older entry.js must omit the row rather than render a dead switch",
);
assert.ok(
  /isTopbarSaveEnabled: isWorkspaceTopbarSaveEnabled/.test(source)
  && /setTopbarSaveEnabled: setWorkspaceTopbarSaveEnabled/.test(source),
  "entry.js must pass both accessors, or the switch is omitted at runtime",
);

// --- Locale parity ----------------------------------------------------------
const [zh, en] = await Promise.all([
  readFile(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../entry/locales/en-US.json", import.meta.url), "utf8").then(JSON.parse),
]);
for (const key of ["settings.topbarSaveButton", "settings.topbarSaveButtonHelp", "topbar.save", "topbar.saveUnsaved"]) {
  assert.ok(zh[key], `zh-CN is missing ${key}`);
  assert.ok(en[key], `en-US is missing ${key}`);
}
assert.equal(
  Object.keys(zh).length,
  Object.keys(en).length,
  "both locales must carry the same number of keys",
);

// --- Stylesheet -------------------------------------------------------------
const styles = await readFile(new URL("../entry/ui/topbar-save-button.js", import.meta.url), "utf8");
assert.ok(
  !/\/\*/.test(styles.slice(styles.indexOf("style.textContent = `"), styles.indexOf("`;\n  doc.head.append"))),
  "no CSS comments inside the template literal: a backtick there ends the string and node --check misses it",
);
for (const className of [TOPBAR_SAVE_SLOT_CLASS, TOPBAR_SAVE_BUTTON_CLASS, TOPBAR_SAVE_DOT_CLASS]) {
  assert.ok(styles.includes(className), `the stylesheet must cover ${className}`);
}
// The live top bar is a flex row that was already at capacity, so both the slot
// and the button have to refuse to shrink or the 30px button gets clipped.
// Matched per line: the selectors interpolate the class names, so a brace scan
// would stop at the `}` closing `${...}` rather than at the rule's own.
{
  const lines = styles.split("\n");
  const ruleFor = (name) => lines.find((line) => (
    line.includes(`.\${${name}} {`) && line.includes("display:")
  ));
  const slotRule = ruleFor("TOPBAR_SAVE_SLOT_CLASS");
  const buttonRule = ruleFor("TOPBAR_SAVE_BUTTON_CLASS");
  assert.ok(slotRule && buttonRule, "both rules must exist in the stylesheet");
  assert.match(slotRule, /flex: 0 0 auto/, "the slot must not shrink in a full top bar");
  assert.match(slotRule, /overflow: visible/, "the slot must not clip its own button");
  assert.match(buttonRule, /flex: 0 0 auto/, "the button must not shrink either");
  assert.match(buttonRule, /width: 30px/);
}

console.log("Top-bar save button contract passed.");
