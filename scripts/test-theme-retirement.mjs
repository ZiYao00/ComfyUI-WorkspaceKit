import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { WORKSPACE_MODULE_ID, isWorkspaceModuleVisible, isWorkspaceModuleSealed } from "../entry/ui/module-visibility.js";
import { defaultCommandBindings } from "../entry/ui/command-bindings.js";
const root = new URL("../", import.meta.url);
for (const path of ["entry/appearance.js", "entry/appearance/editor.js", "service/theme_storage.py"]) {
  await assert.rejects(access(new URL(path, root)), { code: "ENOENT" });
}
const backend = await readFile(new URL("__init__.py", root), "utf8");
const entry = await readFile(new URL("entry/entry.js", root), "utf8");
assert.doesNotMatch(backend, /workspacekit-theme|ThemeStorage|theme_storage/);
assert.doesNotMatch(entry, /OPEN_THEME|WORKSPACE_MODULE_ID\.theme/);
assert.equal(WORKSPACE_MODULE_ID.layout, "workspacekit.layout");
assert.equal(isWorkspaceModuleSealed("workspacekit.theme"), true);
assert.equal(isWorkspaceModuleVisible("workspacekit.theme", {getItem:()=> "1"}), false);
assert.equal(Object.hasOwn(defaultCommandBindings(), "workspace.openTheme"), false);
for (const path of ["entry/ui/panel-appearance.js", "entry/ui/personalization-panel.js", "entry/layout.js", "entry/ui-kit/styles.js"]) await access(new URL(path, root));
console.log("Theme retirement contract passed.");
