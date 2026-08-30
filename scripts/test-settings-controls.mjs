import assert from "node:assert/strict";
import { createSettingsControls } from "../entry/settings/controls.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = {
      values: new Set(),
      toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name),
      add: (...names) => names.forEach((name) => this.classList.values.add(name)),
      remove: (...names) => names.forEach((name) => this.classList.values.delete(name)),
    };
    this.style = {};
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  focus() { this.focused = true; }
  querySelector(selector) {
    const find = (node) => {
      if (node?.tagName === "input" && selector === 'input[type="radio"]' && node.type === "radio") return node;
      if (node?.tagName === "input" && selector === 'input[type="range"]' && node.type === "range") return node;
      return node?.children?.map(find).find(Boolean);
    };
    return find(this);
  }
}

const isolated = [];
const controls = createSettingsControls({
  document: {
    createElement: (tagName) => new FakeElement(tagName),
    createTextNode: (text) => ({ text }),
  },
  t: (key) => `t:${key}`,
  isolateComfyKeys: (element) => isolated.push(element),
});

const section = controls.settingsSection("Title", [controls.settingsHelp("Help")]);
assert.equal(section.className, "workspace2-settings-section");
assert.equal(section.children[0].textContent, "Title");
assert.equal(section.children[1].textContent, "Help");

const grid = controls.settingsShortcutGrid();
assert.equal(grid.children.length, 6);
assert.equal(grid.children[0].children[0].textContent, "Shift + 1");
assert.equal(grid.children[0].children[1].textContent, "t:settings.shortcuts.commands.openWorkflows");
assert.equal(grid.children[3].children[0].textContent, "Shift + 4");
assert.equal(grid.children[3].children[1].textContent, "t:settings.shortcuts.commands.openLayout");
assert.equal(grid.children[4].children[0].textContent, "Shift + 5");
assert.equal(grid.children[4].children[1].textContent, "t:settings.shortcuts.commands.openTheme");

let checkboxChanged = false;
const disabledCheckbox = controls.settingsCheckbox("Theme", false, () => { checkboxChanged = true; }, { disabled: true, title: "disabled" });
const disabledInput = disabledCheckbox.children[0].children[0];
assert.equal(disabledInput.disabled, true);
assert.equal(disabledCheckbox.classList.values.has("is-disabled"), true);
assert.equal(disabledCheckbox.title, "disabled");
disabledInput.checked = true;
disabledInput.listeners.get("change")();
assert.equal(checkboxChanged, false);

let changed = null;
const range = controls.settingsRange("Opacity", 20, {
  min: 5, max: 100, snap: () => 25, onChange: (value) => { changed = value; }, disabled: true,
});
const rangeSlider = range.querySelector('input[type="range"]');
assert.equal(rangeSlider.disabled, true);
assert.equal(range.classList.values.has("is-disabled"), true);
rangeSlider.value = "24";
rangeSlider.listeners.get("input")();
assert.equal(rangeSlider.value, "25");
assert.equal(changed, 25);

let selected = null;
const modeRow = controls.settingsModeRange("Glass", "glass", false, 70, {
  min: 5, max: 95, snap: Number, onChange: () => {}, onSelect: (mode) => { selected = mode; },
});
const radio = modeRow.querySelector('input[type="radio"]');
const modeSlider = modeRow.querySelector('input[type="range"]');
assert.equal(modeSlider.disabled, true);
radio.checked = true;
radio.listeners.get("change")();
assert.equal(selected, "glass");
controls.updateSettingsModeRange(modeRow, true);
assert.equal(radio.checked, true);
assert.equal(modeSlider.disabled, false);
assert.equal(modeRow.classList.values.has("is-disabled"), false);

const bindingEvents = [];
const keybindingRow = controls.settingsKeybinding("Open Layout", "workspace.openLayout", "Shift + 4", {
  onCapture: async (event) => {
    bindingEvents.push(["capture", event.code]);
    return true;
  },
  onClear: () => bindingEvents.push(["clear"]),
});
assert.equal(keybindingRow.className, "workspace2-settings-row workspace2-settings-keybinding-row");
assert.equal(keybindingRow.dataset.workspace2CommandRow, "workspace.openLayout");
const bindingControl = keybindingRow.children[1];
const bindingButton = bindingControl.children[0];
const clearButton = bindingControl.children[1];
assert.equal(bindingButton.dataset.workspace2CommandBinding, "workspace.openLayout");
assert.equal(bindingButton.dataset.workspace2KeybindingCapture, "true");
bindingButton.listeners.get("click")();
assert.equal(bindingButton.classList.values.has("is-listening"), true);
assert.equal(bindingButton.textContent, "t:settings.shortcuts.pressKeys");
await bindingButton.listeners.get("keydown")({
  code: "ShiftLeft",
  key: "Shift",
  shiftKey: true,
  preventDefault() {},
  stopPropagation() {},
  stopImmediatePropagation() {},
});
assert.equal(bindingButton.classList.values.has("is-listening"), true, "modifier-only keydown must keep capture active");
assert.equal(bindingEvents.length, 0);
await bindingButton.listeners.get("keydown")({
  code: "KeyK",
  key: "k",
  shiftKey: true,
  preventDefault() {},
  stopPropagation() {},
  stopImmediatePropagation() {},
});
assert.deepEqual(bindingEvents.shift(), ["capture", "KeyK"]);
assert.equal(bindingButton.classList.values.has("is-listening"), false);

bindingButton.textContent = "Ctrl + K";
bindingButton.listeners.get("click")();
await bindingButton.listeners.get("keydown")({
  code: "Escape",
  key: "Escape",
  preventDefault() {},
  stopPropagation() {},
  stopImmediatePropagation() {},
});
assert.equal(bindingButton.textContent, "Ctrl + K", "Escape restores the previous display value");
clearButton.listeners.get("click")();
assert.deepEqual(bindingEvents.shift(), ["clear"]);

const pointerEvents = [];
const pointerRow = controls.settingsPointerBinding(
  "Ignore group",
  "group.toggleIgnore",
  "control",
  "left",
  {
    modifierOptions: [
      { value: "control", label: "Ctrl / Cmd" },
      { value: "none", label: "None" },
      { value: "disabled", label: "Disabled" },
    ],
    buttonOptions: [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ],
    onChange: (part, value) => pointerEvents.push([part, value]),
  },
);
assert.equal(pointerRow.dataset.workspace2GroupPointerAction, "group.toggleIgnore");
const pointerControl = pointerRow.children[1];
const modifierSelect = pointerControl.children[0];
const buttonSelect = pointerControl.children[1];
assert.equal(modifierSelect.value, "control");
assert.equal(buttonSelect.value, "left");
modifierSelect.value = "none";
modifierSelect.listeners.get("change")();
buttonSelect.value = "right";
buttonSelect.listeners.get("change")();
assert.deepEqual(pointerEvents, [["modifier", "none"], ["button", "right"]]);

assert.equal(isolated.length, 6, "range, mode slider, binding button/clear, and two pointer selects must isolate ComfyUI keys");

console.log("Settings controls contract passed.");
