import assert from "node:assert/strict";
import { setExpandedRecursive } from "../entry/ui/tree-expansion.js";

const expanded = new Set(["keep", "remove"]);
setExpandedRecursive(expanded, ["", "add", null, "remove"], true);
assert.deepEqual([...expanded].sort(), ["add", "keep", "remove"]);
setExpandedRecursive(expanded, ["remove", "missing", ""], false);
assert.deepEqual([...expanded].sort(), ["add", "keep"]);

console.log("tree expansion contract passed");
