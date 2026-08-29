import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSettingsDialogSections } from "../entry/settings/dialog-sections.js";

class FakeElement {
  constructor() { this.children = []; this.className = ""; }
  append(...children) { this.children.push(...children); }
}

const updates = [];
const actions = [];
const modeRows = [];
let conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
let conversionCalls = 0;
let reverseConversionCalls = 0;
let changeConversionStateDuringConfirm = false;
let confirmConversion = true;
let conversionFailure = null;
const factory = createSettingsDialogSections({
  document: { createElement: () => new FakeElement() },
  t: (key, values = {}) => {
    if (key === "settings.cacheCount") return values.count;
    if (key === "settings.cacheUpdated") return values.time;
    if (key === "settings.version") return values.version;
    return key;
  },
  toolbarButton: (icon, label, onClick) => ({ icon, label, onClick }),
  settingsActionButton: (icon, label, onClick, options) => ({ kind: "action", icon, label, onClick, options }),
  settingsCheckbox: (label, checked, onChange, options = {}) => ({ kind: "checkbox", label, checked, onChange, options, disabled: Boolean(options.disabled) }),
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
  sidebarTabVisibilityOptions: () => [
    { id: "workflows", label: "show workflows", checked: true, onChange: (value) => actions.push(["showWorkflows", value]) },
    { id: "nodes", label: "show nodes", checked: true, onChange: (value) => actions.push(["showNodes", value]) },
    { id: "templates", label: "show templates", checked: true, onChange: (value) => actions.push(["showTemplates", value]) },
    { id: "workspacekit.layout", label: "show layout", checked: true, onChange: (value) => actions.push(["showLayout", value]) },
    { id: "workspacekit.theme", label: "show theme", checked: false, disabled: true, title: "sealed", onChange: (value) => actions.push(["showTheme", value]) },
    { id: "external", label: "show external", checked: true, onChange: (value) => actions.push(["panelIntegrations", value]) },
  ],
  isStatusHelpEnabled: () => true,
  setStatusHelpEnabled: (value) => actions.push(["statusHelp", value]),
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
  getGroupRepresentationInfo: () => conversionInfo,
  confirmConvertGroupsToNative: async () => {
    if (changeConversionStateDuringConfirm) {
      conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 3, nativeGroupCount: 0, isReady: true };
    }
    return confirmConversion;
  },
  convertGroupsToNative: async () => {
    conversionCalls += 1;
    if (conversionFailure) throw conversionFailure;
    conversionInfo = { representation: "native", workspaceKitGroupCount: 0, nativeGroupCount: 2, isReady: true };
    return { converted: 2 };
  },
  convertGroupsToWorkspaceKit: async () => {
    reverseConversionCalls += 1;
    conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
    return { converted: 2 };
  },
  confirmConvertGroupsToWorkspaceKit: async () => true,
});

const sections = factory.buildSettingsDialogSections();
assert.deepEqual(Object.keys(sections), ["shortcuts", "groupPointerShortcuts", "workflowSettings", "templateSettings", "groupSettings", "sidebarTabs", "panelDisplay", "backgroundEffect", "nodeCache", "dataManagement", "integrations", "about", "versionInfo"]);
assert.equal(sections.shortcuts.children[2].checked, true);
assert.equal(sections.shortcuts.children[3].checked, false);
sections.shortcuts.children[2].onChange(false);
assert.deepEqual(actions.shift(), ["workflowShortcut", false]);
assert.equal(sections.groupPointerShortcuts.children[1].kind, "select");
sections.groupPointerShortcuts.children[1].onChange("group.toggleDisable");
assert.deepEqual(actions.shift(), ["groupPointer", "group.toggleDisable"]);
assert.equal(sections.groupSettings.children[1].checked, true);
sections.groupSettings.children[1].onChange(false);
assert.deepEqual(actions.shift(), ["ctrlG", false]);
const conversionSection = sections.groupSettings.children[3];
const conversionStatus = conversionSection.children[1];
// T-201: the representation section now renders two buttons in a container
// instead of one direction-shifting button. children[2] is the buttons row;
// [0] is "convert to native" (forward), [1] is "convert to WorkspaceKit"
// (reverse).
const forwardButton = (section) => section.children[2].children[0];
const reverseButton = (section) => section.children[2].children[1];
// Initial state: workspacekit with 2 groups. Forward enabled, reverse disabled.
assert.equal(forwardButton(conversionSection).disabled, false);
assert.equal(forwardButton(conversionSection).label, "groups.convertToNative");
assert.equal(reverseButton(conversionSection).disabled, true);
assert.equal(reverseButton(conversionSection).label, "groups.convertToWorkspaceKit");
await forwardButton(conversionSection).onClick();
assert.equal(conversionCalls, 1);
// After converting to native, forward is now disabled and reverse enabled.
assert.equal(forwardButton(conversionSection).disabled, true);
assert.equal(reverseButton(conversionSection).disabled, false);
assert.match(String(conversionStatus.textContent), /groups\.convertedToNative/);
assert.equal(sections.templateSettings.children[0].checked, false);
sections.workflowSettings.children[0].value = 9;
sections.workflowSettings.children[0].options.onChange(9);
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
assert.equal(sections.panelDisplay.children[0].checked, true);
sections.panelDisplay.children[0].onChange(false);
assert.deepEqual(actions.shift(), ["statusHelp", false]);
assert.equal(sections.sidebarTabs.children.length, 7, "help + five built-in tabs + external extensions");
assert.equal(sections.sidebarTabs.children[5].checked, false);
assert.equal(sections.sidebarTabs.children[5].disabled, true);
assert.equal(sections.sidebarTabs.children[5].options.title, "sealed");
assert.equal(sections.sidebarTabs.children[6].checked, true);
sections.sidebarTabs.children[6].onChange(false);
assert.deepEqual(actions.shift(), ["panelIntegrations", false]);
assert.equal(sections.integrations, sections.panelDisplay, "legacy integrations alias remains panel-display compatible");
assert.equal(sections.versionInfo.text, "settings.versionLoading");

const nativeSections = factory.buildSettingsDialogSections();
const nativeConversionSection = nativeSections.groupSettings.children[3];
// Native state: reverse enabled, forward disabled.
assert.equal(reverseButton(nativeConversionSection).disabled, false);
assert.equal(reverseButton(nativeConversionSection).label, "groups.convertToWorkspaceKit");
assert.equal(forwardButton(nativeConversionSection).disabled, true);
await reverseButton(nativeConversionSection).onClick();
assert.equal(reverseConversionCalls, 1);
assert.match(String(nativeConversionSection.children[1].textContent), /groups\.convertedToWorkspaceKit/);

// The confirmation dialog is asynchronous. A changed workflow/group state must
// cancel the pending action instead of converting a stale target.
conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
changeConversionStateDuringConfirm = true;
const staleSections = factory.buildSettingsDialogSections();
const staleConversionSection = staleSections.groupSettings.children[3];
await forwardButton(staleConversionSection).onClick();
assert.equal(conversionCalls, 0);
assert.equal(staleConversionSection.children[1].textContent, "groups.conversionStateChanged");
changeConversionStateDuringConfirm = false;

// All visible conversion states must have deterministic, safe controls.
const getConversionSection = (info) => {
  conversionInfo = info;
  return factory.buildSettingsDialogSections().groupSettings.children[3];
};
const loadingConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: false });
assert.equal(forwardButton(loadingConversion).disabled, true);
assert.equal(reverseButton(loadingConversion).disabled, true);
assert.equal(loadingConversion.children[1].textContent, "groups.conversionLoading");
const emptyConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 0, nativeGroupCount: 0, isReady: true });
assert.equal(forwardButton(emptyConversion).disabled, true);
assert.equal(reverseButton(emptyConversion).disabled, true);
assert.equal(emptyConversion.children[1].textContent, "groups.conversionEmpty");
// Mixed state (T-206): both directions are available — forward converts the
// remaining WorkspaceKit groups to native, reverse converts native groups and
// merges them into the existing WorkspaceKit groups.
const mixedConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 1, isReady: true });
assert.equal(forwardButton(mixedConversion).disabled, false);
assert.equal(reverseButton(mixedConversion).disabled, false);
assert.equal(mixedConversion.children[1].textContent, "groups.conversionMixed");
// Pure native with groups: reverse enabled, forward disabled.
const pureNative = getConversionSection({ representation: "native", workspaceKitGroupCount: 0, nativeGroupCount: 3, isReady: true });
assert.equal(reverseButton(pureNative).disabled, false);
assert.equal(forwardButton(pureNative).disabled, true);
assert.equal(pureNative.children[1].textContent, "groups.conversionAlreadyNative");
// Native but empty: both disabled.
const nativeEmpty = getConversionSection({ representation: "native", workspaceKitGroupCount: 0, nativeGroupCount: 0, isReady: true });
assert.equal(reverseButton(nativeEmpty).disabled, true);
assert.equal(forwardButton(nativeEmpty).disabled, true);
assert.equal(nativeEmpty.children[1].textContent, "groups.conversionNativeEmpty");

// A cancelled confirmation must not call the conversion command.
conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
confirmConversion = false;
const cancelledConversion = factory.buildSettingsDialogSections().groupSettings.children[3];
await forwardButton(cancelledConversion).onClick();
assert.equal(conversionCalls, 0);
assert.equal(cancelledConversion.children[1].textContent, "groups.conversionReady");
confirmConversion = true;

// A conversion failure must surface an error instead of reporting success.
conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
conversionFailure = new Error("forced conversion failure");
const failedConversion = factory.buildSettingsDialogSections().groupSettings.children[3];
await forwardButton(failedConversion).onClick();
assert.equal(conversionCalls, 1);
assert.match(String(failedConversion.children[1].textContent), /groups\.convertFailed/);
conversionFailure = null;

const entry = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
// The user-approved settings information architecture starts on Appearance,
// not a feature-specific page. Keep this contract in sync with the navigation
// order in openWorkspaceSettings().
assert.match(entry, /selectSettingsPage\(settingPages\[0\]\.id\)/);
assert.doesNotMatch(entry, /selectSettingsPage\("common"\)/);

console.log("Settings dialog sections contract passed.");
