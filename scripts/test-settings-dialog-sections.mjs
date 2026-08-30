import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LAYOUT_COMMAND_ICON_SIZE_KEY,
  LAYOUT_FLOATING_POSITION_KEY,
  LAYOUT_PRESENTATION_MODE_KEY,
} from "../entry/layout/preferences.js";
import { createSettingsDialogSections } from "../entry/settings/dialog-sections.js";

class FakeElement {
  constructor() {
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
}

const updates = [];
const actions = [];
const modeRows = [];
const layoutSettingsValues = new Map();
const layoutSettingsStorage = {
  getItem(key) { return layoutSettingsValues.has(key) ? layoutSettingsValues.get(key) : null; },
  setItem(key, value) { layoutSettingsValues.set(key, String(value)); },
};
let conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
let conversionCalls = 0;
let reverseConversionCalls = 0;
let changeConversionStateDuringConfirm = false;
let confirmConversion = true;
let conversionFailure = null;

const commandOptions = [
  {
    commandId: "workspace.openWorkflows",
    group: "panels",
    label: "Open Workflows",
    display: "Shift + 1",
    onCapture: (event) => actions.push(["captureShortcut", event.code]),
    onClear: () => actions.push(["clearShortcut", "workspace.openWorkflows"]),
  },
  {
    commandId: "workspace.openLayout",
    group: "panels",
    label: "Open Layout",
    display: "Shift + 4",
    onCapture: (event) => actions.push(["captureShortcut", event.code]),
    onClear: () => actions.push(["clearShortcut", "workspace.openLayout"]),
  },
  {
    commandId: "template.saveSelection",
    group: "actions",
    label: "Save as template",
    display: "Alt + C",
    onCapture: (event) => actions.push(["captureShortcut", event.code]),
    onClear: () => actions.push(["clearShortcut", "template.saveSelection"]),
  },
];
commandOptions.restoreDefaults = () => actions.push(["restoreCommandBindings"]);

const pointerOptions = [
  {
    action: "group.toggleIgnore",
    label: "Ignore group",
    modifier: "control",
    button: "left",
    modifierOptions: [{ value: "control", label: "Ctrl" }, { value: "disabled", label: "Disabled" }],
    buttonOptions: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }],
    onChange: (part, value) => actions.push(["groupPointer", part, value]),
  },
];
pointerOptions.restoreDefaults = () => actions.push(["restorePointerBindings"]);

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
  settingsSection: (title, children) => ({ kind: "section", title, children, dataset: {} }),
  settingsHelp: (text) => ({ kind: "help", text }),
  settingsShortcutGrid: () => ({ kind: "shortcuts" }),
  settingsRange: (label, value, options) => ({ kind: "range", label, value, options, dataset: {} }),
  settingsModeRange: (label, mode, selected, value, options) => {
    const row = { kind: "mode", label, mode, selected, value, options };
    modeRows.push(row);
    return row;
  },
  updateSettingsModeRange: (row, selected) => updates.push([row.mode, selected]),
  settingsKeybinding: (label, commandId, display, options) => ({ kind: "keybinding", label, commandId, display, options }),
  settingsPointerBinding: (label, action, modifier, button, options) => ({ kind: "pointer-binding", label, action, modifier, button, options }),
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
    { id: "workspacekit.theme", label: "show theme", checked: true, disabled: false, title: "", onChange: (value) => actions.push(["showTheme", value]) },
    { id: "external", label: "show external", checked: true, onChange: (value) => actions.push(["panelIntegrations", value]) },
  ],
  isStatusHelpEnabled: () => true,
  setStatusHelpEnabled: (value) => actions.push(["statusHelp", value]),
  isTopbarSaveEnabled: () => true,
  setTopbarSaveEnabled: (value) => actions.push(["topbarSave", value]),
  layoutSettingsStorage,
  commandShortcutOptions: () => commandOptions,
  groupPointerShortcutOptions: () => pointerOptions,
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
assert.deepEqual(Object.keys(sections), [
  "shortcuts",
  "shortcutSections",
  "shortcutPanelSettings",
  "shortcutActionSettings",
  "shortcutManagement",
  "groupPointerShortcuts",
  "workflowSettings",
  "workflowOpenSettings",
  "workflowSaveSettings",
  "templateSettings",
  "groupSettings",
  "groupRepresentation",
  "layoutSettings",
  "layoutToolSettings",
  "sidebarTabs",
  "panelDisplay",
  "backgroundEffect",
  "nodeCache",
  "dataManagement",
  "integrations",
  "about",
  "versionInfo",
]);

assert.equal(sections.shortcutSections.length, 4);
assert.equal(sections.shortcutPanelSettings.title, "settings.shortcuts.panels");
assert.equal(sections.shortcutPanelSettings.children[1].kind, "keybinding");
assert.equal(sections.shortcutPanelSettings.children[1].commandId, "workspace.openWorkflows");
sections.shortcutPanelSettings.children[1].options.onClear();
assert.deepEqual(actions.shift(), ["clearShortcut", "workspace.openWorkflows"]);
assert.equal(sections.shortcutActionSettings.children[0].commandId, "template.saveSelection");
assert.equal(sections.groupPointerShortcuts.children[0].kind, "pointer-binding");
sections.groupPointerShortcuts.children[0].options.onChange("button", "right");
assert.deepEqual(actions.shift(), ["groupPointer", "button", "right"]);
sections.shortcutManagement.children[0].children[0].onClick();
assert.deepEqual(actions.shift(), ["restoreCommandBindings"]);
assert.deepEqual(actions.shift(), ["restorePointerBindings"]);

assert.equal(sections.groupSettings, sections.groupRepresentation, "Groups page should expose conversion without the legacy Ctrl+G toggle");
const conversionSection = sections.groupRepresentation;
const conversionStatus = conversionSection.children[1];
const forwardButton = (section) => section.children[2].children[0];
const reverseButton = (section) => section.children[2].children[1];
assert.equal(forwardButton(conversionSection).disabled, false);
assert.equal(forwardButton(conversionSection).label, "groups.convertToNative");
assert.equal(reverseButton(conversionSection).disabled, true);
assert.equal(reverseButton(conversionSection).label, "groups.convertToWorkspaceKit");
await forwardButton(conversionSection).onClick();
assert.equal(conversionCalls, 1);
assert.equal(forwardButton(conversionSection).disabled, true);
assert.equal(reverseButton(conversionSection).disabled, false);
assert.match(String(conversionStatus.textContent), /groups\.convertedToNative/);

assert.equal(sections.templateSettings.children[0].checked, false);
sections.templateSettings.children[0].onChange(true);
assert.deepEqual(actions.shift(), ["altC", true]);
sections.workflowOpenSettings.children[0].options.onChange(9);
assert.deepEqual(actions.shift(), ["recent", 9]);
assert.equal(sections.workflowSaveSettings.children[0].checked, true);
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
assert.equal(sections.panelDisplay.children.length, 1, "global panel display must not own Layout-specific preferences");
sections.panelDisplay.children[0].onChange(false);
assert.deepEqual(actions.shift(), ["statusHelp", false]);

assert.equal(sections.layoutSettings.title, "settings.layoutPresentationTitle");
assert.equal(sections.layoutSettings.children.length, 3);
assert.equal(sections.layoutSettings.children[0].text, "settings.layoutPresentationHelp");
assert.equal(sections.layoutSettings.children[1].textContent, "settings.layoutPresentationMode");
const layoutModeGroup = sections.layoutSettings.children[2];
assert.equal(layoutModeGroup.children.length, 4, "Layout display mode must be four compact radio choices");
assert.deepEqual(layoutModeGroup.children.map((row) => row.dataset.layoutPresentationValue), ["top", "selection", "pinned", "none"]);
assert.equal(layoutModeGroup.children[0].children[0].checked, true);
const pinnedRadio = layoutModeGroup.children[2].children[0];
pinnedRadio.checked = true;
pinnedRadio.listeners.get("change")();
assert.equal(layoutSettingsStorage.getItem(LAYOUT_PRESENTATION_MODE_KEY), "pinned");
assert.equal(sections.layoutToolSettings.title, "settings.layoutTools");
assert.equal(sections.layoutToolSettings.children[0].kind, "range");
assert.equal(sections.layoutToolSettings.children[0].value, 22);
sections.layoutToolSettings.children[0].options.onChange(24);
assert.equal(layoutSettingsStorage.getItem(LAYOUT_COMMAND_ICON_SIZE_KEY), "24");
assert.equal(sections.layoutToolSettings.children[1].children[0].kind, "action");
sections.layoutToolSettings.children[1].children[0].onClick();
assert.match(layoutSettingsStorage.getItem(LAYOUT_FLOATING_POSITION_KEY), /"default":true/);

assert.equal(sections.sidebarTabs.children.length, 7, "help + five built-in tabs + external extensions");
assert.equal(sections.sidebarTabs.children[5].checked, true);
assert.equal(sections.sidebarTabs.children[5].disabled, false);
assert.equal(sections.sidebarTabs.children[6].checked, true);
sections.sidebarTabs.children[6].onChange(false);
assert.deepEqual(actions.shift(), ["panelIntegrations", false]);
assert.equal(sections.integrations, sections.panelDisplay, "legacy integrations alias remains panel-display compatible");
assert.equal(sections.versionInfo.text, "settings.versionLoading");

const nativeSections = factory.buildSettingsDialogSections();
const nativeConversionSection = nativeSections.groupRepresentation;
assert.equal(reverseButton(nativeConversionSection).disabled, false);
assert.equal(forwardButton(nativeConversionSection).disabled, true);
await reverseButton(nativeConversionSection).onClick();
assert.equal(reverseConversionCalls, 1);
assert.match(String(nativeConversionSection.children[1].textContent), /groups\.convertedToWorkspaceKit/);

conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
changeConversionStateDuringConfirm = true;
const staleConversionSection = factory.buildSettingsDialogSections().groupRepresentation;
await forwardButton(staleConversionSection).onClick();
assert.equal(conversionCalls, 0);
assert.equal(staleConversionSection.children[1].textContent, "groups.conversionStateChanged");
changeConversionStateDuringConfirm = false;

const getConversionSection = (info) => {
  conversionInfo = info;
  return factory.buildSettingsDialogSections().groupRepresentation;
};
const loadingConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: false });
assert.equal(forwardButton(loadingConversion).disabled, true);
assert.equal(reverseButton(loadingConversion).disabled, true);
assert.equal(loadingConversion.children[1].textContent, "groups.conversionLoading");
const emptyConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 0, nativeGroupCount: 0, isReady: true });
assert.equal(forwardButton(emptyConversion).disabled, true);
assert.equal(reverseButton(emptyConversion).disabled, true);
assert.equal(emptyConversion.children[1].textContent, "groups.conversionEmpty");
const mixedConversion = getConversionSection({ representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 1, isReady: true });
assert.equal(forwardButton(mixedConversion).disabled, false);
assert.equal(reverseButton(mixedConversion).disabled, false);
assert.equal(mixedConversion.children[1].textContent, "groups.conversionMixed");
const pureNative = getConversionSection({ representation: "native", workspaceKitGroupCount: 0, nativeGroupCount: 3, isReady: true });
assert.equal(reverseButton(pureNative).disabled, false);
assert.equal(forwardButton(pureNative).disabled, true);
assert.equal(pureNative.children[1].textContent, "groups.conversionAlreadyNative");
const nativeEmpty = getConversionSection({ representation: "native", workspaceKitGroupCount: 0, nativeGroupCount: 0, isReady: true });
assert.equal(reverseButton(nativeEmpty).disabled, true);
assert.equal(forwardButton(nativeEmpty).disabled, true);
assert.equal(nativeEmpty.children[1].textContent, "groups.conversionNativeEmpty");

conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
confirmConversion = false;
const cancelledConversion = factory.buildSettingsDialogSections().groupRepresentation;
await forwardButton(cancelledConversion).onClick();
assert.equal(conversionCalls, 0);
assert.equal(cancelledConversion.children[1].textContent, "groups.conversionReady");
confirmConversion = true;

conversionInfo = { representation: "workspacekit", workspaceKitGroupCount: 2, nativeGroupCount: 0, isReady: true };
conversionCalls = 0;
conversionFailure = new Error("forced conversion failure");
const failedConversion = factory.buildSettingsDialogSections().groupRepresentation;
await forwardButton(failedConversion).onClick();
assert.equal(conversionCalls, 1);
assert.match(String(failedConversion.children[1].textContent), /groups\.convertFailed/);
conversionFailure = null;

const entry = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
assert.match(entry, /selectSettingsPage\(settingPages\[0\]\.id\)/);
assert.doesNotMatch(entry, /selectSettingsPage\("common"\)/);
assert.match(entry, /id:\s*"layout"[\s\S]{0,260}sections:\s*\[layoutSettings, layoutToolSettings\]/, "Layout must own Quick access and Tools sections");
assert.match(entry, /id:\s*"shortcuts"[\s\S]{0,260}shortcutSections/, "Shortcuts page must mount the unified command/gesture sections");
assert.match(entry, /button\.dataset\.workspace2SettingsPage\s*=\s*page\.id/, "Settings nav buttons expose stable page ids for feature deep-links");

console.log("Settings dialog sections contract passed.");
