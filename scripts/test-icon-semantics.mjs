import assert from "node:assert/strict";
import {
  WORKSPACEKIT_ICON_SEMANTICS,
  resolveWorkspaceKitIcon,
} from "../entry/ui-kit/icon-semantics.js";
import { WORKSPACEKIT_ICON_KEYS } from "../entry/ui-kit/icons.js";

for (const [semanticName, iconKey] of Object.entries(WORKSPACEKIT_ICON_SEMANTICS)) {
  assert.ok(WORKSPACEKIT_ICON_KEYS.includes(iconKey), `${semanticName} must resolve to a local Icon Kit key`);
  assert.equal(resolveWorkspaceKitIcon(semanticName), iconKey, `${semanticName} must resolve deterministically`);
}

assert.equal(resolveWorkspaceKitIcon("folderPlus"), "folderPlus", "existing literal keys must remain compatible during migration");
assert.notEqual(
  resolveWorkspaceKitIcon("workflows.folder.create"),
  resolveWorkspaceKitIcon("nodes.groups.create"),
  "filesystem folders and node groups must keep distinct action silhouettes",
);
assert.notEqual(
  resolveWorkspaceKitIcon("nodes.groups.create"),
  resolveWorkspaceKitIcon("templates.groups.create"),
  "node groups and template groups must keep distinct action silhouettes",
);
assert.equal(resolveWorkspaceKitIcon("workflows.file.save"), "save", "workflow File menu must use its semantic save key");
assert.equal(resolveWorkspaceKitIcon("workflows.toolbar.enterTrash"), "trash", "workflow toolbar must use its semantic trash key");
assert.equal(resolveWorkspaceKitIcon("workflows.toolbar.leaveTrash"), "arrowLeft", "workflow toolbar must use its semantic return key");
assert.equal(resolveWorkspaceKitIcon("workflows.row.newSubfolder"), "folderPlusModern", "workflow row folder actions must use the folder semantic");
assert.equal(resolveWorkspaceKitIcon("workflows.row.moveToTrash"), "trash", "workflow row removal must use the trash semantic");
assert.equal(resolveWorkspaceKitIcon("settings.data.export"), "download", "settings export must use its semantic key");
assert.equal(resolveWorkspaceKitIcon("settings.data.import"), "upload", "settings import must use its semantic key");
assert.equal(resolveWorkspaceKitIcon("nodes.toolbar.syncOfficial"), "arrowsUpDown", "node synchronization must use its semantic key");
assert.equal(resolveWorkspaceKitIcon("templates.toolbar.saveSelected"), "template", "template save must use its semantic key");
assert.equal(resolveWorkspaceKitIcon("canvasGroups.create"), "layersPlus", "canvas groups must use the group creation semantic");
console.log("WorkspaceKit icon semantic registry contract passed.");
