import assert from "node:assert/strict";
import { shouldDeleteSelectedWorkspaceKitGroups } from "../entry/canvas-groups/delete-key-events.js";

const event = (overrides = {}) => ({
  key: "Delete",
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

const canvasContext = { activeElement: null, selectedGroupCount: 1, hasNativeNodeSelection: false };
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event(), canvasContext), true, "one group may be deleted");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event(), { ...canvasContext, selectedGroupCount: 2 }), true, "multiple groups may be deleted together");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event(), { ...canvasContext, selectedGroupCount: 0 }), false, "native Delete remains untouched without a group selection");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event(), { ...canvasContext, hasNativeNodeSelection: true }), true, "an intentional group selection wins over stale native node selection");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event({ shiftKey: true }), canvasContext), false, "modified Delete is not intercepted");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event({ repeat: true }), canvasContext), false, "key repeat cannot delete additional groups");
assert.equal(shouldDeleteSelectedWorkspaceKitGroups(event(), { ...canvasContext, activeElement: { closest: () => ({}) } }), false, "editing remains protected");

console.log("Canvas-group Delete key policy passed.");
