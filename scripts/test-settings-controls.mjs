import assert from "node:assert/strict";
import { createSettingsControls } from "../entry/settings/controls.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.listeners = new Map();
    this.classList = {
      values: new Set(),
      toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name),
    };
    this.style = {};
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
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
assert.equal(grid.children.length, 8);
assert.equal(grid.children[0].children[0].textContent, "Shift + 1");
assert.equal(grid.children[0].children[1].textContent, "t:settings.shortcuts.workflow");
assert.equal(grid.children[3].children[0].textContent, "Shift + 4");
assert.equal(grid.children[3].children[1].textContent, "t:settings.shortcuts.extension");

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
assert.equal(isolated.length, 2);

console.log("Settings controls contract passed.");
