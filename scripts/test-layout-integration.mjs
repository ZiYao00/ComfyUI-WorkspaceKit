import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  LAYOUT_TOPBAR_ENABLED_KEY,
  migrateLegacyLayoutPreferences,
  readLayoutSpacing,
} from "../entry/layout/preferences.js";
import { createLayoutProvider } from "../entry/layout/provider.js";

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
  assert.equal(store.getItem(LAYOUT_TOPBAR_ENABLED_KEY), "1", "explicit unified preference must win");
  assert.equal(readLayoutSpacing(store), 48);
}

const provider = createLayoutProvider({ controller: {} });
assert.equal(provider.id, "workspacekit.layout");
assert.equal(provider.apiVersion, 1);
assert.equal(typeof provider.render, "function");

const entrySource = await readFile(new URL("../entry/layout.js", import.meta.url), "utf8");
const panelSource = await readFile(new URL("../entry/layout/panel.js", import.meta.url), "utf8");
const topbarSource = await readFile(new URL("../entry/layout/topbar.js", import.meta.url), "utf8");
const iconSource = await readFile(new URL("../entry/layout/icons.js", import.meta.url), "utf8");
const controllerSource = await readFile(new URL("../entry/layout/controller.js", import.meta.url), "utf8");

const unified = `${entrySource}\n${panelSource}\n${topbarSource}\n${iconSource}\n${controllerSource}`;
assert.doesNotMatch(unified, /legacy\/nodealigner|#alignLeft|shadowRoot|button\.click\(\)/);
assert.doesNotMatch(unified, /setInterval\s*\(/, "unified Layout must not reintroduce permanent polling");
assert.doesNotMatch(panelSource, /createDisclosureSection|workspacekit-layout-v2-glyph/, "Layout panel should remain a compact icon palette, not stacked disclosure cards or text glyphs");
assert.match(panelSource, /workspacekit-layout-v2-toolstrip/);
assert.match(panelSource, /createLayoutCommandIcon/);
assert.match(topbarSource, /createLayoutCommandIcon/);
assert.match(iconSource, /workspacekit\.layout\.spacing\.horizontal/);
assert.match(iconSource, /workspacekit\.layout\.size\.equal-both/);
assert.match(controllerSource, /calculateLayoutCommand/);
assert.match(controllerSource, /applyLayoutChangeSet/);
assert.match(entrySource, /workspacekit-layout-panel/);
assert.match(entrySource, /workspacekit-layout-top-toolbar-group/);
assert.match(topbarSource, /500/, "topbar readiness retry is bounded rather than continuous");

console.log("Layout integration and legacy-preference contract passed.");
