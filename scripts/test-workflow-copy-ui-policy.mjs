import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
const start = source.indexOf("async function copyWorkflow(el, item)");
const end = source.indexOf("\nasync function moveToTrash", start);
assert.ok(start >= 0 && end > start, "copyWorkflow function boundaries were not found");
const copyFunction = source.slice(start, end);

assert.match(copyFunction, /addLocalWorkflowItem\(/, "Browse must receive the copied item incrementally");
assert.doesNotMatch(copyFunction, /state\.selectedPath\s*=/, "Copy must preserve the existing Browse selection");
assert.doesNotMatch(copyFunction, /refreshOfficialWorkflows/, "Copy must not promote the new file into Open through official sync");

console.log("Workflow copy UI policy contract passed.");
