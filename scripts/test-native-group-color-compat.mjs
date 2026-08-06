import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  normalizeHexColor,
  readNativeGroupColorPresets,
  resolveWorkspaceKitGroupNativeColor,
} from "../entry/canvas-groups/native-color-compat.js";

assert.equal(normalizeHexColor("#AbC"), "#aabbcc");
assert.equal(normalizeHexColor("a1b2c3"), "#a1b2c3");
assert.equal(normalizeHexColor("rgb(1,2,3)"), null);

assert.equal(
  resolveWorkspaceKitGroupNativeColor({ nativeGroupColor: "#abc", headerBgColor: "rgba(1,2,3,0.2)" }),
  "#aabbcc",
);
assert.equal(
  resolveWorkspaceKitGroupNativeColor({ headerBgColor: "rgba(12, 34, 56, 0.2)" }),
  "#0c2238",
);
assert.equal(resolveWorkspaceKitGroupNativeColor({}, "#123"), "#112233");

const palette = readNativeGroupColorPresets({
  red: { groupcolor: "#aabbcc" },
  duplicate: { groupcolor: "#ABC" },
  cyan: { groupcolor: "#123456" },
  invalid: { groupcolor: "rgba(1,2,3,1)" },
}, [{ key: "fallback", hex: "#654321" }]);
assert.deepEqual(palette, [
  { key: "red", hex: "#aabbcc", source: "litegraph" },
  { key: "cyan", hex: "#123456", source: "litegraph" },
  { key: "fallback", hex: "#654321", source: "fallback" },
]);

// Regression: group persistence flows through serializeGroup() into both
// graph.extra.xzgGroups and the per-node recovery copies.  A missing field
// here made nativeGroupColor disappear after any ordinary workflow save.
const canvasGroupsSource = await readFile(
  new URL("../entry/workspace2_canvas_groups.js", import.meta.url),
  "utf8",
);
const serializeGroupSource = canvasGroupsSource.match(
  /serializeGroup\(g\)\s*\{([\s\S]*?)\n\s*\},\n\s*\/\/ Stage 3/,
)?.[1] || "";
assert.match(
  serializeGroupSource,
  /nativeGroupColor:\s*resolveWorkspaceKitGroupNativeColor\(g\)/,
  "serializeGroup must persist nativeGroupColor across workflow saves",
);

console.log("Native group color compatibility contract passed.");
