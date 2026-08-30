import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createPanelUiTemplate } from "../entry/ui-kit/template.js";
import { workspaceKitIconMaskDataUri } from "../entry/ui-kit/icons.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.style = { values: new Map(), setProperty: (key, value) => this.style.values.set(key, value) };
    this.dataset = {};
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
  createElementNS(namespace, tagName) {
    const element = new FakeElement(tagName);
    element.namespaceURI = namespace;
    element.className = { baseVal: "" };
    return element;
  }
  getElementById(id) { return this.byId.get(id) || null; }
}

const document = new FakeDocument();
const ui = createPanelUiTemplate({ document });
assert.equal(ui.version, "1.5.1");
assert.equal(ui.supports(1), true);
assert.equal(ui.supports(2), false);
assert.equal(ui.contract.capabilities.includes("icon-kit"), true);
const icon = ui.createIcon("theme", { size: 20 });
assert.equal(icon.tagName, "svg");
assert.equal(icon.attributes.get("width"), "20");
assert.equal(icon.dataset.workspacekitIcon, "theme");
assert.equal(icon.children.length, 5);
assert.equal(ui.createIcon("trash").dataset.workspacekitIcon, "trash");
assert.equal(ui.createIcon("restore").dataset.workspacekitIcon, "restore");
assert.equal(ui.createIcon("arrowLeft").dataset.workspacekitIcon, "arrowLeft");
assert.equal(ui.createIcon("sort").dataset.workspacekitIcon, "sort");
assert.equal(ui.createIcon("refresh").dataset.workspacekitIcon, "refresh");
assert.equal(ui.createIcon("folderOpen").dataset.workspacekitIcon, "folderOpen");
assert.equal(ui.createIcon("download").dataset.workspacekitIcon, "download");
assert.equal(ui.createIcon("upload").dataset.workspacekitIcon, "upload");
assert.equal(ui.createIcon("arrowsUpDown").dataset.workspacekitIcon, "arrowsUpDown");
assert.equal(ui.createIcon("folderPlus").dataset.workspacekitIcon, "folderPlus");
assert.equal(ui.createIcon("copy").dataset.workspacekitIcon, "copy");
assert.equal(ui.createIcon("edit").dataset.workspacekitIcon, "edit");
assert.equal(ui.createIcon("rootArrow").dataset.workspacekitIcon, "rootArrow");
assert.equal(ui.createIcon("palette").dataset.workspacekitIcon, "palette");
for (const key of ["filePlus", "save", "trashPage", "archiveTray", "systemTrash", "files", "open", "badge", "template", "previewDetailed", "previewCompact", "target", "sync", "star", "starFilled", "chevronDown", "keyboard", "x"]) {
  assert.equal(ui.createIcon(key).dataset.workspacekitIcon, key);
}
assert.match(workspaceKitIconMaskDataUri("layout"), /^data:image\/svg\+xml,/);
assert.throws(() => workspaceKitIconMaskDataUri("unknown"), /Unknown WorkspaceKit icon/);
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
const disclosure = ui.createDisclosureSection({ title: "Reference image", description: "Optional", content: "Drop an image" });
assert.equal(disclosure.element.tagName, "details");
assert.equal(disclosure.body.textContent, "Drop an image");
disclosure.setOpen(true);
assert.equal(disclosure.element.open, true);
const actionBar = ui.createCompactActionBar({ leading: [ui.createButton({ label: "Save" })] });
assert.equal(actionBar.leading.children.length, 1);
const dropzone = ui.createDropzoneSurface({ label: "Upload", description: "PNG only" });
assert.equal(dropzone.element.tagName, "button");
assert.equal(dropzone.element.attributes.get("aria-label"), "Upload");
const shell = ui.createStandaloneShell({ title: "Layout", settingsLabel: "Settings", settingsContent: "⚙" });
assert.equal(shell.shell.className, "workspacekit-ui-root");
assert.equal(shell.content.className, "workspacekit-ui-standalone-content");
const blueprint = ui.createPanelBlueprint();
assert.equal(blueprint.element.children.length, 4);
blueprint.setToolbar(document.createElement("div"));
assert.equal(blueprint.toolbar.hidden, false);
blueprint.setToolbar();
assert.equal(blueprint.toolbar.hidden, true);
assert.equal(typeof blueprint.setStatus, "function");
assert.doesNotThrow(() => blueprint.setStatus({ text: "ready", tone: "neutral" }));

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
assert.match(styles, /workspacekit-ui-disclosure-summary/);
assert.match(styles, /workspacekit-ui-compact-action-bar/);
assert.match(styles, /workspacekit-ui-dropzone/);
console.log("Panel UI Template primitive contract passed.");
