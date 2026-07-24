import assert from "node:assert/strict";
import { createSettingsDialogSections } from "../entry/settings/dialog-sections.js";

class FakeElement {
  constructor() { this.children = []; this.className = ""; }
  append(...children) { this.children.push(...children); }
}

const updates = [];
const actions = [];
const modeRows = [];
const factory = createSettingsDialogSections({
  document: { createElement: () => new FakeElement() },
  t: (key, values = {}) => values.count ?? values.time ?? values.version ?? key,
  toolbarButton: (icon, label, onClick) => ({ icon, label, onClick }),
  settingsActionButton: (icon, label, onClick, options) => ({ kind: "action", icon, label, onClick, options }),
  settingsCheckbox: (label, checked, onChange) => ({ kind: "checkbox", label, checked, onChange }),
  settingsSelect: (label, value, options, onChange) => ({ kind: "select", label, value, options, onChange }),
  settingsSection: (title, children) => ({ kind: "section", title, children }),
  settingsHelp: (text) => ({ kind: "help", text }),
  settingsShortcutGrid: () => ({ kind: "shortcuts" }),
  settingsRange: (label, value, options) => ({ kind: "range", label, value, options }),
  settingsModeRange: (label, mode, selected, value, options) => {
    const row = { kind: "mode", label, mode, selected, value, options };
    modeRows.push(row);
    return row;
  },
  updateSettingsModeRange: (row, selected) => updates.push([row.mode, selected]),
  isCtrlGEnabled: () => true,
  setCtrlGEnabled: (value) => actions.push(["ctrlG", value]),
  isAltCOpenTemplatesEnabled: () => false,
  setAltCOpenTemplatesEnabled: (value) => actions.push(["altC", value]),
  isPanelIntegrationsEnabled: () => true,
  setPanelIntegrationsEnabled: (value) => actions.push(["panelIntegrations", value]),
  moduleShortcutOptions: () => [
    { label: "Shift + 1", checked: true, onChange: (value) => actions.push(["workflowShortcut", value]) },
    { label: "Shift + 4", checked: false, onChange: (value) => actions.push(["extensionShortcut", value]) },
  ],
  groupPointerShortcutOptions: () => [
    { modifier: "control", label: "Ctrl", value: "group.toggleIgnore", options: [], onChange: (value) => actions.push(["groupPointer", value]) },
  ],
  workflowRecentLimit: () => 5,
  snapWorkflowRecentLimit: Number,
  setWorkflowRecentLimit: (value) => actions.push(["recent", value]),
  panelBackgroundMode: () => "transparent",
  panelOpacity: () => 100,
  snapPanelOpacity: Number,
  setPanelOpacity: (value) => actions.push(["opacity", value]),
  glassBlur: () => 75,
  snapGlassBlur: Number,
  setGlassBlur: (value) => actions.push(["glassBlur", value]),
  setPanelBackgroundMode: (value) => actions.push(["background", value]),
  getNodeCacheInfo: () => ({ count: 12, updatedAt: "time" }),
  clearNodeCache: async () => actions.push(["clearCache"]),
  confirmClearNodeCache: async () => true,
  buildDataManagementSection: () => ({ kind: "data-management" }),
});

const sections = factory.buildSettingsDialogSections();
assert.deepEqual(Object.keys(sections), ["shortcuts", "groupPointerShortcuts", "behavior", "backgroundEffect", "nodeCache", "dataManagement", "integrations", "about", "versionInfo"]);
assert.equal(sections.shortcuts.children[2].checked, true);
assert.equal(sections.shortcuts.children[3].checked, false);
sections.shortcuts.children[2].onChange(false);
assert.deepEqual(actions.shift(), ["workflowShortcut", false]);
assert.equal(sections.groupPointerShortcuts.children[1].kind, "select");
sections.groupPointerShortcuts.children[1].onChange("group.toggleDisable");
assert.deepEqual(actions.shift(), ["groupPointer", "group.toggleDisable"]);
sections.shortcuts.children[4].onChange(false);
assert.deepEqual(actions.shift(), ["ctrlG", false]);
assert.equal(sections.behavior.children[0].checked, false);
sections.behavior.children[1].value = 9;
sections.behavior.children[1].options.onChange(9);
assert.deepEqual(actions.shift(), ["recent", 9]);
assert.equal(modeRows.length, 2);
modeRows[1].options.onSelect("glass");
assert.deepEqual(actions.shift(), ["background", "glass"]);
assert.deepEqual(updates, [["transparent", false], ["glass", true]]);
assert.equal(sections.nodeCache.children[0].children[0].text, "12\ntime");
assert.equal(sections.nodeCache.children[0].children[1].children[0].options.variant, "danger");
await sections.nodeCache.children[0].children[1].children[0].onClick();
assert.deepEqual(actions.shift(), ["clearCache"]);
assert.equal(sections.nodeCache.children[0].children[0].textContent, "settings.nodeCacheCleared");
assert.equal(sections.dataManagement.kind, "data-management");
assert.equal(sections.integrations.children[0].checked, true);
sections.integrations.children[0].onChange(false);
assert.deepEqual(actions.shift(), ["panelIntegrations", false]);
assert.equal(sections.versionInfo.text, "settings.versionLoading");

console.log("Settings dialog sections contract passed.");
