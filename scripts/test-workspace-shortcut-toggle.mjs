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
// All configurable keyboard input must pass through the unified command binding
// resolver. Panel commands still use the established second-press toggle path.
assert.match(entrySource, /const commandId = resolveBoundCommand\(event, readCommandBindings\(localStorage\)\);/);
assert.match(entrySource, /executeWorkspaceBoundCommand\(commandId\)/);
assert.match(entrySource, /case WORKSPACE_COMMAND\.OPEN_WORKFLOWS:[\s\S]{0,180}openWorkspace2Module\(WORKSPACE_MODULE_ID\.workflows, \{ closeIfActive: true \}\)/);
assert.match(entrySource, /case WORKSPACE_COMMAND\.OPEN_LAYOUT:[\s\S]{0,180}openWorkspace2Module\(WORKSPACE_MODULE_ID\.layout, \{ closeIfActive: true \}\)/);
assert.match(entrySource, /case WORKSPACE_COMMAND\.OPEN_THEME:[\s\S]{0,180}openWorkspace2Module\(WORKSPACE_MODULE_ID\.theme, \{ closeIfActive: true \}\)/);
assert.match(entrySource, /shouldCloseWorkspaceModule\(/);
assert.doesNotMatch(entrySource, /resolveModuleShortcut\(event\)/, "entry.js must not keep the legacy module shortcut resolver wired in");
assert.doesNotMatch(entrySource, /isModuleShortcutEnabled\(moduleShortcut\.id/, "legacy per-module enable flags must not remain a runtime source of truth");

console.log("Workspace shortcut-toggle contract passed.");
