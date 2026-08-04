import assert from "node:assert/strict";
import { createActiveWorkflowTrail, activeTrailRole } from "../entry/workflows/active-trail.js";

// A nested workflow tints itself plus every folder above it.
const nested = createActiveWorkflowTrail("A/B/C/flow.json");
assert.equal(nested.filePath, "A/B/C/flow.json");
assert.deepEqual([...nested.folderPaths].sort(), ["A", "A/B", "A/B/C"]);
assert.equal(activeTrailRole(nested, "A/B/C/flow.json", "file"), "file");
assert.equal(activeTrailRole(nested, "A", "folder"), "folder");
assert.equal(activeTrailRole(nested, "A/B", "folder"), "folder");
assert.equal(activeTrailRole(nested, "A/B/C", "folder"), "folder");

// Siblings and unrelated branches stay untinted.
assert.equal(activeTrailRole(nested, "A/B/C/other.json", "file"), "");
assert.equal(activeTrailRole(nested, "A/Z", "folder"), "");
assert.equal(activeTrailRole(nested, "Other", "folder"), "");

// A folder whose name matches the file's own path must not be treated as
// being on the trail: the deepest segment is the file, never a folder.
assert.equal(activeTrailRole(nested, "A/B/C/flow.json", "folder"), "");

// Root-level workflow: nothing above it, so no folder is tinted.
const root = createActiveWorkflowTrail("flow.json");
assert.equal(root.filePath, "flow.json");
assert.equal(root.folderPaths.size, 0);
assert.equal(activeTrailRole(root, "flow.json", "file"), "file");

// No active workflow: every row is untinted.
for (const empty of ["", null, undefined]) {
  const trail = createActiveWorkflowTrail(empty);
  assert.equal(trail.filePath, "");
  assert.equal(trail.folderPaths.size, 0);
  assert.equal(activeTrailRole(trail, "A", "folder"), "");
  assert.equal(activeTrailRole(trail, "flow.json", "file"), "");
}

// Stray separators must not create empty or duplicated trail entries.
const messy = createActiveWorkflowTrail("/A//B/flow.json/");
assert.equal(messy.filePath, "A//B/flow.json");
assert.ok(![...messy.folderPaths].includes(""));
assert.deepEqual([...messy.folderPaths].sort(), ["A", "A/B"]);

// A blank node path never matches, even when a trail exists.
assert.equal(activeTrailRole(nested, "", "folder"), "");
assert.equal(activeTrailRole(nested, "", "file"), "");

// Prefix lookalikes must not match: "A/B2" shares a prefix with "A/B".
const prefixy = createActiveWorkflowTrail("A/B/flow.json");
assert.equal(activeTrailRole(prefixy, "A/B2", "folder"), "");
assert.equal(activeTrailRole(prefixy, "A/B", "folder"), "folder");

console.log("Active workflow trail contract passed.");
