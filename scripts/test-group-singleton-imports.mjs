// Ensure every browser entry imports the same canvas-group module identity.
// Different ?v= keys create independent ES module objects and orphan global overlay state.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../entry");
const hits = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(filename);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
    const source = fs.readFileSync(filename, "utf8");
    const matches = source.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']*workspace2_canvas_groups\.js[^"']*)["']/g);
    for (const match of matches) hits.push({
      file: path.relative(root, filename).replaceAll("\\", "/"), specifier: match[1],
    });
  }
};
visit(root);
console.log("Canvas group imports:", JSON.stringify(hits, null, 2));
assert.ok(hits.length >= 1, "at least one browser module imports canvas groups");
assert.equal(new Set(hits.map(x => x.specifier.slice(x.specifier.indexOf("workspace2_canvas_groups.js")))).size, 1,
  "all canvas-group imports must share one canonical browser module URL");
console.log("Canvas group module import identity contract passed.");
