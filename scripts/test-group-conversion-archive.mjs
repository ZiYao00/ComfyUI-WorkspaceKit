import assert from "node:assert/strict";
import {
  GROUP_CONVERSION_SCHEMA_VERSION,
  createWorkspaceKitGroupConversionArchive,
  validateWorkspaceKitGroupConversionArchive,
} from "../entry/canvas-groups/conversion-archive.js";

const groups = {
  "workspace-group-1": {
    id: "workspace-group-1",
    title: "组1",
    nodeIds: [1, 2],
    bounds: { x: 10, y: 20, w: 300, h: 180 },
    backgroundFillEnabled: true,
    backgroundOpacity: 0.25,
  },
};

const archive = createWorkspaceKitGroupConversionArchive(
  groups,
  group => ({ ...group, nodeIds: [...group.nodeIds], bounds: { ...group.bounds } }),
  "2026-07-27T12:00:00.000Z"
);

assert.equal(archive.schemaVersion, GROUP_CONVERSION_SCHEMA_VERSION);
assert.equal(archive.source, "workspacekit");
assert.equal(archive.groups["workspace-group-1"].backgroundFillEnabled, true);
assert.equal(archive.groups["workspace-group-1"].backgroundOpacity, 0.25);
assert.deepEqual(validateWorkspaceKitGroupConversionArchive(archive), { valid: true });

archive.groups["workspace-group-1"].nodeIds.push(99);
assert.deepEqual(groups["workspace-group-1"].nodeIds, [1, 2], "archive must be detached from live group data");

const invalid = { ...archive, schemaVersion: 999 };
assert.equal(validateWorkspaceKitGroupConversionArchive(invalid).valid, false);

console.log("Group conversion archive contract passed.");
