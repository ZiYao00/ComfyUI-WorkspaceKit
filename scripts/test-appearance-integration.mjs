import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createAppearanceProvider } from "../entry/appearance/provider.js";
import { validateThemeDocument } from "../entry/appearance/theme-document.js";

const manifestUrl = new URL("../entry/appearance/themes/manifest.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
assert.equal(manifest.schemaVersion, 1);
assert.ok(Array.isArray(manifest.groups));

const items = manifest.groups.flatMap((group) => group.items ?? []);
assert.equal(items.length, 5);
assert.equal(new Set(items.map((item) => item.id)).size, items.length);

for (const item of items) {
  assert.match(item.file, /^themes\//);
  const themeUrl = new URL(`../entry/appearance/${item.file}`, import.meta.url);
  const theme = validateThemeDocument(JSON.parse(await readFile(themeUrl, "utf8")), "en");
  assert.ok(theme.id);
  assert.ok(theme.name);
  assert.deepEqual(Object.keys(theme.colors).sort(), ["comfy_base", "litegraph_base", "node_slot"]);
  assert.doesNotMatch(String(theme.colors.litegraph_base.BACKGROUND_IMAGE ?? ""), /^data:image\//);
}

const provider = createAppearanceProvider({ app: {} });
assert.equal(provider.apiVersion, 1);
assert.equal(provider.id, "workspacekit.theme");
assert.equal(typeof provider.render, "function");

const entrySource = await readFile(new URL("../entry/appearance.js", import.meta.url), "utf8");
const editorSource = await readFile(new URL("../entry/appearance/editor.js", import.meta.url), "utf8");
const paletteSource = await readFile(new URL("../entry/appearance/reference-palette.js", import.meta.url), "utf8");
const allAppearanceSource = `${entrySource}\n${editorSource}\n${paletteSource}`;

assert.doesNotMatch(allAppearanceSource, /vendor\/workspacekit-ui|standalone-panel|workspacekit-adapter/);
assert.doesNotMatch(allAppearanceSource, /color-thief|ColorThief/);
assert.match(editorSource, /\/workspacekit-theme\/save/);
assert.match(editorSource, /createModuleHeader/);
assert.match(editorSource, /createDisclosureSection/);
assert.match(entrySource, /builtin-provider-registration/);
assert.match(entrySource, /registerOrQueueBuiltinProvider/);

console.log("Appearance integration contract passed.");
