import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { shouldCloseWorkspaceModule } from "../entry/ui/module-toggle.js";

assert.equal(shouldCloseWorkspaceModule({
  closeIfActive: true,
  panelIsOpen: true,
  activeModule: "workflows",
  nextModule: "workflows",
}), true);

assert.equal(shouldCloseWorkspaceModule({
  closeIfActive: true,
  panelIsOpen: true,
  activeModule: "workflows",
  nextModule: "nodes",
}), false);

assert.equal(shouldCloseWorkspaceModule({
  closeIfActive: true,
  panelIsOpen: false,
  activeModule: "templates",
  nextModule: "templates",
}), false);

assert.equal(shouldCloseWorkspaceModule({
  closeIfActive: false,
  panelIsOpen: true,
  activeModule: "templates",
  nextModule: "templates",
}), false);

const entrySource = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
assert.match(entrySource, /openWorkspace2Module\("workflows", \{ closeIfActive: true \}\)/);
assert.match(entrySource, /openWorkspace2Module\("nodes", \{ closeIfActive: true \}\)/);
assert.match(entrySource, /openWorkspace2Module\("templates", \{ closeIfActive: true \}\)/);
assert.match(entrySource, /shouldCloseWorkspaceModule\(/);

console.log("Workspace shortcut-toggle contract passed.");
