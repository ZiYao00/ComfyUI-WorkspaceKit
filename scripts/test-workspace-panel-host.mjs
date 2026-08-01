import assert from "node:assert/strict";
import { createWorkspacePanelHost } from "../entry/ui/workspace-panel-host.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
    this.attributes = new Map();
    this.listeners = new Map();
    this.hidden = false;
    this.classList = {
      add: (...tokens) => { this.className = `${this.className} ${tokens.join(" ")}`.trim(); },
      remove: (...tokens) => { this.className = this.className.split(/\s+/).filter((token) => !tokens.includes(token)).join(" "); },
    };
  }
  append(...children) { this.children.push(...children); }
  remove() { this.removed = true; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  contains(target) { return target === this || this.children.some((child) => child?.contains?.(target)); }
  getBoundingClientRect() { return { right: 200, bottom: 40 }; }
  get offsetWidth() { return 200; }
  click() {
    this.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  }
}

const activated = [];
const makeDocument = () => {
  const listeners = new Map();
  return {
    createElement: (tagName) => new FakeElement(tagName),
    body: new FakeElement("body"),
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => { if (listeners.get(type) === listener) listeners.delete(type); },
    listeners,
  };
};
globalThis.window = { innerWidth: 1000 };
const document = makeDocument();
const host = createWorkspacePanelHost({
  document,
  tabs: [
    { id: "workflows", label: "Workflows" },
    { id: "nodes", label: "Nodes" },
    { id: "templates", label: "Templates" },
    { id: "layout", label: "📐 Layout", tooltip: "WorkspaceKit Layout" },
  ],
  activeTabId: "nodes",
  onActivate: (id) => activated.push(id),
  settingsTitle: "Settings",
  onOpenSettings: () => activated.push("settings"),
  createSettingsIcon: () => new FakeElement("svg"),
});

assert.equal(host.shell.className, "workspace2-shell");
assert.equal(host.tabButtons.size, 4);
assert.match(host.tabButtons.get("nodes").className, /is-active/);
assert.equal(host.tabButtons.get("nodes").attributes.get("aria-current"), "page");
assert.equal(host.tabButtons.get("workflows").attributes.get("aria-current"), "false");
host.tabButtons.get("layout").click();
host.settingsButton.click();
assert.deepEqual(activated, ["layout", "settings"]);
assert.equal(host.tabButtons.get("layout").textContent, "📐 Layout");
assert.equal(host.tabButtons.get("layout").title, "WorkspaceKit Layout");
assert.equal(host.tabButtons.get("layout").attributes.get("aria-label"), "WorkspaceKit Layout");
assert.equal(host.headerHost.hidden, true);
assert.equal(host.contextHost.hidden, true);
assert.equal(host.toolbarHost, host.contextHost);
assert.equal(host.controlsHost.hidden, true);
assert.equal(host.headerHost.dataset.workspacekitPanelSlot, "header");
assert.equal(host.toolbarHost.dataset.workspacekitPanelSlot, "toolbar");
assert.equal(host.controlsHost.dataset.workspacekitPanelSlot, "controls");
assert.equal(host.contentHost.dataset.workspacekitPanelSlot, "content");
assert.equal(host.moduleFrame.dataset.workspacekitPanelBlueprint, "v1");
assert.equal(host.contentHost.className, "workspace2-module-body");
assert.equal(host.contentHost.dataset.workspace2ModuleMount, "true");
assert.deepEqual(host.moduleFrame.children, [host.headerHost, host.toolbarHost, host.controlsHost, host.contentHost]);

const providerEvents = [];
const overflowDocument = makeDocument();
const overflowHost = createWorkspacePanelHost({
  document: overflowDocument,
  tabs: [{ id: "workflows", label: "Workflows" }, { id: "nodes", label: "Nodes" }, { id: "templates", label: "Templates" }, { id: "layout", label: "📐 Layout", overflow: [{ id: "provider.other", title: "Other" }] }],
  activeTabId: "layout",
  onActivate() {}, settingsTitle: "Settings", onOpenSettings() {},
  overflowLabel: "Extensions", pinLabel: "Pin",
  providerLabel: (provider) => provider.title,
  onActivateProvider: (id) => providerEvents.push(`open:${id}`),
  onPinProvider: (id) => providerEvents.push(`pin:${id}`),
});
const overflow = overflowHost.tabStrip.children.find((child) => child.className === "workspace2-module-overflow-tab");
assert.ok(overflow);
assert.equal(overflow.children[0].children[0].textContent, "📐 Layout");
overflow.children[2].click();
const overflowMenu = overflowDocument.body.children.at(-1);
assert.match(overflowMenu.className, /workspace2-module-overflow-context/);
const overflowRow = overflowMenu.children[0];
overflowRow.children[0].click();
overflow.children[2].click();
const pinMenu = overflowDocument.body.children.at(-1);
pinMenu.children[0].children[1].click();
assert.deepEqual(providerEvents, ["open:provider.other", "pin:provider.other"]);
overflowHost.dispose();
assert.equal(overflowDocument.listeners.size, 0, "dispose must release document-level overflow listeners");

console.log("WorkspaceKit panel host contract passed.");
