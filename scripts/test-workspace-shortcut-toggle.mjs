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
// Module shortcuts now share one resolver so Shift+1/2/3/4 cannot drift into
// separate handlers.  The resolver's own contract verifies the exact key map;
// this integration contract verifies that every resolved module still follows
// the established second-press toggle path.
assert.match(entrySource, /const moduleShortcut = resolveModuleShortcut\(event\);/);
assert.match(entrySource, /isModuleShortcutEnabled\(moduleShortcut\.id,/);
assert.match(entrySource, /openWorkspace2Module\(moduleId, \{ closeIfActive: true \}\)/);
assert.match(entrySource, /shouldCloseWorkspaceModule\(/);

console.log("Workspace shortcut-toggle contract passed.");
