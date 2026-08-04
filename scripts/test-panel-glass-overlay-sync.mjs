import assert from "node:assert/strict";
import { createPanelAppearance } from "../entry/ui/panel-appearance.js";

// Minimal DOM doubles: this contract is about the hide/show decision, not layout.
function makeElement(name) {
  const classes = new Set();
  return {
    name,
    parentElement: null,
    style: { setProperty() {}, removeProperty() {} },
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      contains: (c) => classes.has(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 800 }),
    querySelector: () => null,
    append() {},
    _classes: classes,
  };
}

const WORKSPACE2_TAB_ID = "workspace2";

// The visible path re-parents the shell onto document.body and queries the panel
// ancestors, so a minimal document stub is required for those branches.
const documentStub = {
  body: makeElement("body"),
  querySelectorAll: () => [],
  querySelector: () => null,
  getElementById: () => null,
  createElement: (tag) => makeElement(tag),
  head: makeElement("head"),
};

function withDom(fn) {
  const prevDocument = globalThis.document;
  const prevWindow = globalThis.window;
  globalThis.document = documentStub;
  globalThis.window = {
    addEventListener() {},
    requestAnimationFrame() {},
    getComputedStyle: () => ({ display: "block", visibility: "visible" }),
  };
  try {
    return fn();
  } finally {
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
  }
}

function setup({ activeSidebarTabId, hostVisible = true, hasStore = true }) {
  const host = makeElement("host");
  const shell = makeElement("shell");
  shell.parentElement = host;
  const workspaceState = { renderTarget: host, glassPortalElement: shell, glassOverlayTrackingReady: false };

  const appearance = createPanelAppearance({
    workspaceState,
    t: (k) => k,
    WORKSPACE2_TAB_ID,
    isElementVisible: () => hostVisible,
    panelBackgroundMode: () => "glass",
    glassTransparency: () => 50,
    panelOpacity: () => 100,
    glassBlurPixels: () => 8,
    setPanelOpacityValue: (v) => v,
    setPanelBackgroundModeValue: (v) => v,
    setGlassBlurValue: (v) => v,
    getSidebarTabStore: () => (hasStore ? { activeSidebarTabId, $subscribe() {} } : null),
  });
  return { appearance, shell, host, workspaceState };
}

const HIDDEN = "is-workspace2-overlay-hidden";

// The reported bug: pressing ComfyUI's own N/W/M shortcuts switches the sidebar
// tab without changing any window dimension. The glass overlay lives on <body>,
// outside the host ComfyUI hides, so it must hide itself on that signal.
{
  const { appearance, shell } = setup({ activeSidebarTabId: "node-library" });
  withDom(() => appearance.syncWorkspaceGlassOverlay());
  assert.equal(shell.classList.contains(HIDDEN), true, "overlay must hide when another sidebar tab is active");
}

// Our own tab active and host visible: the overlay stays up and is positioned.
{
  const { appearance, shell } = setup({ activeSidebarTabId: WORKSPACE2_TAB_ID });
  withDom(() => appearance.syncWorkspaceGlassOverlay());
  assert.equal(shell.classList.contains(HIDDEN), false, "overlay must stay visible on our own tab");
  assert.equal(shell.classList.contains("workspace2-glass-overlay"), true, "overlay class must be applied");
}

// A collapsed sidebar reports no active tab; that must hide the overlay too,
// otherwise it floats over a sidebar the user deliberately closed.
for (const emptyId of ["", null, undefined]) {
  const { appearance, shell } = setup({ activeSidebarTabId: emptyId });
  withDom(() => appearance.syncWorkspaceGlassOverlay());
  assert.equal(shell.classList.contains(HIDDEN), true, `overlay must hide when sidebar is collapsed (id=${String(emptyId)})`);
}

// The store gate must not override the geometry gate: an invisible host still
// hides the overlay even while our tab id is the active one.
{
  const { appearance, shell } = setup({ activeSidebarTabId: WORKSPACE2_TAB_ID, hostVisible: false });
  withDom(() => appearance.syncWorkspaceGlassOverlay());
  assert.equal(shell.classList.contains(HIDDEN), true, "an invisible host must still hide the overlay");
}

// Builds without the store must degrade to the previous geometry-only behaviour
// rather than hiding the panel permanently (a missing store must not be read as
// "some other tab is active").
{
  const { appearance, shell } = setup({ activeSidebarTabId: "node-library", hasStore: false });
  withDom(() => appearance.syncWorkspaceGlassOverlay());
  assert.equal(shell.classList.contains(HIDDEN), false, "no store must fall back to geometry, not force-hide");
}

// Tracking setup must subscribe to the store, and must stay idempotent so a
// second panel render does not stack duplicate subscriptions.
{
  let subscribeCalls = 0;
  let detached = null;
  const host = makeElement("host");
  const shell = makeElement("shell");
  const workspaceState = { renderTarget: host, glassPortalElement: shell, glassOverlayTrackingReady: false };
  const listeners = [];
  const appearance = createPanelAppearance({
    workspaceState,
    t: (k) => k,
    WORKSPACE2_TAB_ID,
    isElementVisible: () => true,
    panelBackgroundMode: () => "glass",
    glassTransparency: () => 50,
    panelOpacity: () => 100,
    glassBlurPixels: () => 8,
    setPanelOpacityValue: (v) => v,
    setPanelBackgroundModeValue: (v) => v,
    setGlassBlurValue: (v) => v,
    getSidebarTabStore: () => ({
      activeSidebarTabId: WORKSPACE2_TAB_ID,
      $subscribe(fn, opts) { subscribeCalls += 1; detached = opts?.detached; listeners.push(fn); },
    }),
  });

  withDom(() => {
    appearance.setupWorkspaceGlassOverlayTracking();
    appearance.setupWorkspaceGlassOverlayTracking();
  });
  assert.equal(subscribeCalls, 1, "the store must be subscribed exactly once");
  assert.equal(detached, true, "the subscription must be detached from any component scope");
}

console.log("Panel glass overlay sidebar-sync contract passed.");
