import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  LAYOUT_COMMAND_ICON_SIZE_KEY,
  LAYOUT_FLOATING_POSITION_KEY,
  LAYOUT_PRESENTATION_MODE_KEY,
  LAYOUT_TOPBAR_ENABLED_KEY,
  migrateLegacyLayoutPreferences,
  readLayoutCommandIconSize,
  readLayoutFloatingPosition,
  readLayoutPresentationMode,
  readLayoutSpacing,
  setLayoutPresentationMode,
} from "../entry/layout/preferences.js";
import { createLayoutProvider } from "../entry/layout/provider.js";
import { PRIMARY_COMMAND_ROWS } from "../entry/layout/presentation-commands.js";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
}

{
  const store = storage({
    WorkspaceKitLayoutPresentationMode: "selection",
    WorkspaceKitLayoutControlsHidden: "1",
  });
  const result = migrateLegacyLayoutPreferences(store);
  assert.equal(result.migrated, true);
  assert.equal(store.getItem(LAYOUT_PRESENTATION_MODE_KEY), "none");
  assert.equal(store.getItem(LAYOUT_TOPBAR_ENABLED_KEY), "0");
  assert.match(result.source, /selection:hidden/);
  assert.equal(migrateLegacyLayoutPreferences(store).migrated, false);
}

{
  const store = storage({
    [LAYOUT_TOPBAR_ENABLED_KEY]: "1",
    WorkspaceKitLayoutControlsHidden: "1",
    "workspacekit.layout.spacing": "48",
  });
  migrateLegacyLayoutPreferences(store);
  assert.equal(readLayoutPresentationMode(store), "top", "explicit unified topbar preference must win over standalone legacy state");
  assert.equal(store.getItem(LAYOUT_PRESENTATION_MODE_KEY), "top");
  assert.equal(readLayoutSpacing(store), 48);
}

{
  const store = storage({
    WorkspaceKitLayoutPresentationMode: "pinned",
    WorkspaceKitLayoutCommandIconSize: "24",
    NodeAlignerButtonContainerPosition: JSON.stringify({ top: "20px", right: "20px" }),
  });
  const result = migrateLegacyLayoutPreferences(store);
  assert.equal(result.mode, "pinned");
  assert.equal(readLayoutPresentationMode(store), "pinned");
  assert.equal(readLayoutCommandIconSize(store), 24);
  assert.equal(store.getItem(LAYOUT_COMMAND_ICON_SIZE_KEY), "24");
  assert.equal(readLayoutFloatingPosition(store).right, "20px");
  assert.ok(store.getItem(LAYOUT_FLOATING_POSITION_KEY));
  setLayoutPresentationMode("selection", store);
  assert.equal(readLayoutPresentationMode(store), "selection");
  assert.equal(store.getItem(LAYOUT_TOPBAR_ENABLED_KEY), "0");
}

{
  const empty = storage();
  assert.equal(readLayoutPresentationMode(empty), "top", "fresh installs default to the canvas top toolbar");
  assert.equal(readLayoutCommandIconSize(empty), 22, "fresh installs use the established 22px command icon size");
  assert.equal(readLayoutSpacing(empty), 32, "fresh installs keep the 32px fixed-spacing default");
}

assert.deepEqual(PRIMARY_COMMAND_ROWS, [
  [
    "workspacekit.layout.align.left",
    "workspacekit.layout.align.horizontal-center",
    "workspacekit.layout.align.right",
    "workspacekit.layout.distribute.horizontal",
  ],
  [
    "workspacekit.layout.align.top",
    "workspacekit.layout.align.vertical-center",
    "workspacekit.layout.align.bottom",
    "workspacekit.layout.distribute.vertical",
  ],
], "the eight high-frequency commands must keep the fixed 4x2 position-memory contract");

const provider = createLayoutProvider({ controller: {} });
assert.equal(provider.id, "workspacekit.layout");
assert.equal(provider.apiVersion, 1);
assert.equal(typeof provider.render, "function");

const entrySource = await readFile(new URL("../entry/layout.js", import.meta.url), "utf8");
const panelSource = await readFile(new URL("../entry/layout/panel.js", import.meta.url), "utf8");
const topbarSource = await readFile(new URL("../entry/layout/topbar.js", import.meta.url), "utf8");
const floatingSource = await readFile(new URL("../entry/layout/floating-toolbar.js", import.meta.url), "utf8");
const settingsSource = await readFile(new URL("../entry/layout/settings-section.js", import.meta.url), "utf8");
const providerSource = await readFile(new URL("../entry/layout/provider.js", import.meta.url), "utf8");
const presentationSource = await readFile(new URL("../entry/layout/presentation-commands.js", import.meta.url), "utf8");
const iconSource = await readFile(new URL("../entry/layout/icons.js", import.meta.url), "utf8");
const controllerSource = await readFile(new URL("../entry/layout/controller.js", import.meta.url), "utf8");

const unified = `${entrySource}\n${panelSource}\n${topbarSource}\n${floatingSource}\n${settingsSource}\n${providerSource}\n${presentationSource}\n${iconSource}\n${controllerSource}`;
assert.doesNotMatch(unified, /legacy\/nodealigner|#alignLeft|shadowRoot|setInterval\s*\(/, "unified Layout must not restore the old DOM shell or permanent polling");
assert.doesNotMatch(panelSource, /createDisclosureSection|workspacekit-layout-v2-glyph|layout\.topbar\.enabled/, "Layout panel stays command-focused and no longer owns persistent display toggles");
assert.match(panelSource, /workspacekit-layout-v2-primary-grid/);
assert.match(panelSource, /layoutPrimaryRow/);
assert.match(panelSource, /workspacekit-layout-v2-spacing-accent/);
assert.match(panelSource, /workspacekit-layout-v2-size-grid/);
assert.match(panelSource, /layout\.displayMode/);
assert.match(panelSource, /createLayoutCommandIcon/);
assert.match(topbarSource, /createLayoutCommandIcon/);
assert.match(floatingSource, /createLayoutCommandIcon/);
assert.match(entrySource, /createLayoutFloatingToolbar/);
assert.match(floatingSource, /mode === "pinned"/);
assert.match(floatingSource, /mode === "selection"/);
assert.match(floatingSource, /visibleWorkspaceShellRect/);
assert.match(floatingSource, /avoidWorkspaceShell/);
assert.match(floatingSource, /workspace2-shell/, "floating Layout quick tools must avoid the WK sidebar instead of hiding underneath it");
assert.doesNotMatch(floatingSource, /DEFAULT_RIGHT/, "fresh pinned placement must not return to the sidebar-covered right edge");
assert.match(settingsSource, /type = "radio"/);
assert.match(settingsSource, /settings\.layoutPresentationMode/);
assert.match(settingsSource, /settings\.layoutPresentation\.top/);
assert.match(settingsSource, /settings\.layoutPresentation\.selection/);
assert.match(settingsSource, /settings\.layoutPresentation\.pinned/);
assert.match(settingsSource, /settings\.layoutPresentation\.none/);
assert.match(panelSource, /status\?\.show/);
assert.doesNotMatch(panelSource, /createModuleHeader/, "Layout title/selection information belongs in the shared bottom status slot, not a private top header");
assert.match(providerSource, /status,/);
assert.match(iconSource, /321ec9dcb859404f4b89cbd359ebc2c25ac59146/, "historical icon provenance must remain explicit");
assert.match(iconSource, /is-nodealigner-legacy/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-width/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-min-width/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-height/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-min-height/);
assert.match(iconSource, /is-workspacekit-supplemental/, "new spacing/equal-both icons must be distinguished from the historical GPL SVG set");
assert.match(iconSource, /workspacekit\.layout\.spacing\.horizontal/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-both/);
assert.match(controllerSource, /calculateLayoutCommand/);
assert.match(controllerSource, /applyLayoutChangeSet/);
assert.match(entrySource, /workspacekit-layout-panel/);
assert.match(entrySource, /workspacekit-layout-top-toolbar-group/);
assert.match(topbarSource, /500/, "topbar readiness retry is bounded rather than continuous");

console.log("Layout integration, presentation-mode, icon-provenance, and legacy-preference contracts passed.");
