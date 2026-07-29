import assert from "node:assert/strict";
import { createWorkspaceKitGroupConversionArchive } from "../entry/canvas-groups/conversion-archive.js";
import { validateNativeGroupConversionResult } from "../entry/canvas-groups/conversion-result.js";

const sourceGroups = [
  { id: "wk-a", nodeIds: [1], bounds: { x: 1, y: 2, w: 100, h: 80 } },
  { id: "wk-b", nodeIds: [2], bounds: { x: 3, y: 4, w: 120, h: 90 } },
];
const archive = createWorkspaceKitGroupConversionArchive(sourceGroups, (group) => group, "2026-07-27T00:00:00.000Z");
const originalNative = [{ id: 7 }];
const convertedNative = [{ id: 8 }, { id: 9 }];
const valid = validateNativeGroupConversionResult({
  nativeGroups: [...originalNative, ...convertedNative],
  originalNativeGroups: originalNative,
  sourceGroupIds: sourceGroups.map((group) => group.id),
  nativeGroupIds: { "wk-a": 8, "wk-b": 9 },
  representation: "native",
  archive,
  workspaceKitGroupCount: 0,
  persistedWorkspaceKitGroupCount: 0,
  staleNodeMarkerCount: 0,
});
assert.deepEqual(valid, { valid: true });

const missingNative = validateNativeGroupConversionResult({
  nativeGroups: [...originalNative, convertedNative[0]],
  originalNativeGroups: originalNative,
  sourceGroupIds: sourceGroups.map((group) => group.id),
  nativeGroupIds: { "wk-a": 8, "wk-b": 9 },
  representation: "native",
  archive,
  workspaceKitGroupCount: 0,
  persistedWorkspaceKitGroupCount: 0,
  staleNodeMarkerCount: 0,
});
assert.match(missingNative.reason, /native group count/);

const staleMarkers = validateNativeGroupConversionResult({
  nativeGroups: [...originalNative, ...convertedNative],
  originalNativeGroups: originalNative,
  sourceGroupIds: sourceGroups.map((group) => group.id),
  nativeGroupIds: { "wk-a": 8, "wk-b": 9 },
  representation: "native",
  archive,
  workspaceKitGroupCount: 0,
  persistedWorkspaceKitGroupCount: 0,
  staleNodeMarkerCount: 1,
});
assert.match(staleMarkers.reason, /stale WorkspaceKit node markers/);

console.log("Native group conversion result contract passed.");
