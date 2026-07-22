import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
const start = source.indexOf("async function renameItem(el, item, newName)");
const end = source.indexOf("\nasync function moveItem", start);
assert.ok(start >= 0 && end > start, "renameItem function boundary must exist");

const renameFunction = source.slice(start, end);
assert.match(
  renameFunction,
  /workflowStore\?\.openWorkflows\?\.includes\(officialWorkflow\)/,
  "official rename must require a live Open workflow tab",
);
assert.match(
  renameFunction,
  /if \(isOpenOfficialWorkflow && typeof workflowStore\?\.renameWorkflow === "function"\)/,
  "only an open workflow may use ComfyUI's rename transaction",
);
assert.doesNotMatch(
  renameFunction,
  /refreshOfficialWorkflowsDeferred\(/,
  "Browse-only rename must not sync the official Store afterward",
);
assert.match(
  renameFunction,
  /if \(nextPath\.toLowerCase\(\) === oldPath\.toLowerCase\(\)\)/,
  "an unchanged display name must be recognized from its normalized path",
);

console.log("Workflow rename open-state policy contract passed.");
