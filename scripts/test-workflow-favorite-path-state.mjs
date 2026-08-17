import assert from "node:assert/strict";
import { createWorkflowPathState } from "../entry/workflows/path-state.js";

const remapped = [];
const removed = [];
const state = { expanded: new Set(["Folder"]), customOrder: {} };
const paths = createWorkflowPathState({
  state,
  replacePathPrefix: (path, oldPath, newPath) => path === oldPath ? newPath : String(path || "").startsWith(`${oldPath}/`) ? `${newPath}${path.slice(oldPath.length)}` : path,
  isPathWithin: (path, root) => path === root || String(path || "").startsWith(`${root}/`),
  onRemapOfficialWorkflowPathState: () => {}, onClearCurrentWorkflowDirtyState: () => {},
  onSaveCustomOrder: () => {}, onUpdateRecentWorkflowPath: () => {}, onRemoveRecentWorkflowTree: () => {},
  onRemapFavorites: (oldPath, newPath) => remapped.push([oldPath, newPath]),
  onRemoveFavorites: (path) => removed.push(path),
});

paths.remap("Folder", "Moved");
paths.remove("Moved");
assert.deepEqual(remapped, [["Folder", "Moved"]]);
assert.deepEqual(removed, ["Moved"]);
console.log("workflow favorite path-state contract passed");
