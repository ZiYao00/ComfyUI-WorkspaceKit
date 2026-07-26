import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPanelUiTemplate } from "../entry/ui-kit/template.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.style = { values: new Map(), setProperty: (key, value) => this.style.values.set(key, value) };
    const values = new Set();
    this.classList = { add: (...items) => items.forEach((item) => values.add(item)), contains: (item) => values.has(item) };
  }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = [...items]; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  addEventListener() {}
}

class FakeDocument {
  constructor() { this.head = new FakeElement("head"); this.byId = new Map(); }
  createElement(tagName) {
    const element = new FakeElement(tagName);
    Object.defineProperty(element, "id", { set: (value) => this.byId.set(value, element), get: () => "" });
    return element;
  }
  getElementById(id) { return this.byId.get(id) || null; }
}

const document = new FakeDocument();
const ui = createPanelUiTemplate({ document });
assert.equal(ui.version, "1.3.0");
assert.equal(ui.supports(1), true);
assert.equal(ui.supports(2), false);
assert.equal(ui.installed, true);
assert.equal(document.head.children.length, 1);
const header = ui.createModuleHeader({ title: "Layout", status: "0 selected" });
assert.equal(header.element.children.length, 2);
assert.match(header.element.className, /workspace2-header/);
assert.match(header.title.className, /workspace2-title/);
assert.match(header.status.className, /workspace2-status/);
header.setStatus("4 selected");
assert.equal(header.status.textContent, "4 selected");
const range = ui.createRangeControl({ label: "Size", value: 22, formatValue: (value) => `${value}px` });
assert.equal(range.value.textContent, "22px");
const grid = ui.createCommandGrid({ columns: 6, commands: [{ id: "left", label: "Left" }] });
assert.equal(grid.buttons.size, 1);
const shell = ui.createStandaloneShell({ title: "Layout", settingsLabel: "Settings", settingsContent: "⚙" });
assert.equal(shell.shell.className, "workspacekit-ui-root");
assert.equal(shell.content.className, "workspacekit-ui-standalone-content");
const blueprint = ui.createPanelBlueprint();
assert.equal(blueprint.element.children.length, 4);
blueprint.setToolbar(document.createElement("div"));
assert.equal(blueprint.toolbar.hidden, false);
blueprint.setToolbar();
assert.equal(blueprint.toolbar.hidden, true);

// The Vendor must receive this one product-theme bridge rather than a
// separately maintained Layout palette. These assertions protect transparent
// and frosted host themes as well as standalone ComfyUI fallbacks.
const styles = await readFile(new URL("../entry/ui-kit/styles.js", import.meta.url), "utf8");
assert.match(styles, /--workspacekit-ui-control:\s*var\(--workspace2-control-bg-glass/);
assert.match(styles, /--workspacekit-ui-tab-bg:\s*var\(--workspace2-tab-bg/);
assert.match(styles, /workspacekit-ui-standalone-tab:hover/);
assert.match(styles, /Exact product-header geometry/);
assert.match(styles, /Product control band/);
assert.match(styles, /workspacekit-ui-button, \.workspacekit-ui-icon-button, \.workspacekit-ui-segment \{ display:inline-flex; align-items:center; justify-content:center; \}/);
console.log("Panel UI Template primitive contract passed.");
