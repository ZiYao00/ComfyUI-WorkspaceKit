import assert from "node:assert/strict";
import {
  joinPath,
  normalizeMetaPath,
  parentPath,
  relativeWorkflowPathFromOfficial,
  replaceWorkflowPathPrefix,
  workflowPathIsWithin,
  workflowRenameTargetPath,
} from "../entry/workflows/path-utils.js";

assert.equal(parentPath("folder/nested/workflow.json"), "folder/nested");
assert.equal(parentPath("workflow.json"), "");
assert.equal(normalizeMetaPath("folder\\nested\\workflow.json"), "folder/nested/workflow.json");
assert.equal(replaceWorkflowPathPrefix("old", "old", "new"), "new");
assert.equal(replaceWorkflowPathPrefix("old/child/workflow.json", "old", "new"), "new/child/workflow.json");
assert.equal(replaceWorkflowPathPrefix("older/workflow.json", "old", "new"), "older/workflow.json");
assert.equal(replaceWorkflowPathPrefix("new/workflow.json", "old", "new"), "new/workflow.json");
assert.equal(workflowPathIsWithin("folder", "folder"), true);
assert.equal(workflowPathIsWithin("folder/child/workflow.json", "folder"), true);
assert.equal(workflowPathIsWithin("folder-two/workflow.json", "folder"), false);
assert.equal(workflowPathIsWithin("workflow.json", ""), false);
assert.equal(joinPath("folder", "workflow.json"), "folder/workflow.json");
assert.equal(joinPath("", "workflow.json"), "workflow.json");
assert.equal(workflowRenameTargetPath({ type: "file", path: "folder/old.json" }, "  new name  "), "folder/new name.json");
assert.equal(workflowRenameTargetPath({ type: "file", path: "old.json" }, "already.JSON"), "already.JSON");
assert.equal(workflowRenameTargetPath({ type: "folder", path: "folder/old" }, "  new folder  "), "folder/new folder");
assert.equal(relativeWorkflowPathFromOfficial("workflows/folder/workflow.json"), "folder/workflow.json");
assert.equal(relativeWorkflowPathFromOfficial("workflows///workflow.json"), "workflow.json");
assert.equal(relativeWorkflowPathFromOfficial("folder/workflow.json"), "folder/workflow.json");

console.log("workflow path-utils contract passed");
