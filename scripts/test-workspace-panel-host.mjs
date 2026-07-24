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
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  click() {
    this.listeners.get("click")?.({ preventDefault() {}, stopPropagation() {} });
  }
}

const activated = [];
const host = createWorkspacePanelHost({
  document: { createElement: (tagName) => new FakeElement(tagName) },
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
assert.equal(host.tabStrip.style["--workspace2-tab-count"], "4");
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
assert.equal(host.contentHost.className, "workspace2-module-body");
assert.equal(host.contentHost.dataset.workspace2ModuleMount, "true");
assert.deepEqual(host.moduleFrame.children, [host.headerHost, host.contextHost, host.contentHost]);

const providerEvents = [];
const overflowHost = createWorkspacePanelHost({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  tabs: [{ id: "workflows", label: "Workflows" }, { id: "nodes", label: "Nodes" }, { id: "templates", label: "Templates" }, { id: "layout", label: "📐 Layout" }],
  activeTabId: "layout",
  onActivate() {}, settingsTitle: "Settings", onOpenSettings() {},
  overflowLabel: "Extensions", pinLabel: "Pin",
  overflowProviders: [{ id: "provider.other", title: "Other" }],
  providerLabel: (provider) => provider.title,
  onActivateProvider: (id) => providerEvents.push(`open:${id}`),
  onPinProvider: (id) => providerEvents.push(`pin:${id}`),
});
const overflow = overflowHost.tabStrip.children.find((child) => child.className === "workspace2-module-overflow");
assert.ok(overflow);
assert.equal(overflow.children[0].textContent, "Extensions ▾");
const overflowRow = overflow.children[1].children[0];
overflowRow.children[0].click();
overflowRow.children[1].click();
assert.deepEqual(providerEvents, ["open:provider.other", "pin:provider.other"]);

console.log("WorkspaceKit panel host contract passed.");
