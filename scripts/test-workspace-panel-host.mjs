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

assert.match(host.shell.className, /\bworkspace2-shell\b/);
assert.match(host.shell.className, /\bworkspacekit-ui-root\b/);
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
assert.equal(host.statusHost.hidden, true);
assert.equal(host.headerHost.dataset.workspacekitPanelSlot, "header");
assert.equal(host.toolbarHost.dataset.workspacekitPanelSlot, "toolbar");
assert.equal(host.controlsHost.dataset.workspacekitPanelSlot, "controls");
assert.equal(host.contentHost.dataset.workspacekitPanelSlot, "content");
assert.equal(host.statusHost.dataset.workspacekitPanelSlot, "status");
assert.equal(host.moduleFrame.dataset.workspacekitPanelBlueprint, "v1");
assert.match(host.contentHost.className, /\bworkspace2-module-body\b/);
assert.match(host.contentHost.className, /\bworkspacekit-ui-panel-content-slot\b/);
assert.equal(host.contentHost.dataset.workspace2ModuleMount, "true");
assert.deepEqual(host.moduleFrame.children, [host.headerHost, host.toolbarHost, host.controlsHost, host.contentHost, host.statusHost]);

// A pre-Blueprint Provider only knows headerHost/contextHost/contentHost and
// ignores the later toolbarHost/controlsHost/ui additions. The context host
// was already opt-in before Blueprint v1, so the Provider keeps ownership of
// showing it while mounted and hiding it during disposal.
let legacyDisposed = false;
const legacyProvider = {
  render({ headerHost, contextHost, contentHost }) {
    assert.equal(headerHost.hidden, true);
    assert.equal(contextHost, host.toolbarHost);
    assert.equal(contentHost, host.contentHost);
    contextHost.hidden = false;
    const legacyToolbar = document.createElement("div");
    legacyToolbar.className = "legacy-provider-toolbar";
    contextHost.append(legacyToolbar);
    const legacyContent = document.createElement("div");
    legacyContent.className = "legacy-provider-content";
    contentHost.append(legacyContent);
    return () => {
      legacyDisposed = true;
      contextHost.hidden = true;
      legacyToolbar.remove();
      legacyContent.remove();
    };
  },
};
const disposeLegacyProvider = legacyProvider.render({
  headerHost: host.headerHost,
  contextHost: host.contextHost,
  contentHost: host.contentHost,
});
assert.equal(host.contextHost.hidden, false);
assert.equal(host.contextHost.children.at(-1).className, "legacy-provider-toolbar");
disposeLegacyProvider();
assert.equal(legacyDisposed, true);
assert.equal(host.contextHost.hidden, true);

const providerEvents = [];
const overflowDocument = makeDocument();
const overflowHost = createWorkspacePanelHost({
  document: overflowDocument,
  tabs: [{ id: "workflows", label: "Workflows" }, { id: "nodes", label: "Nodes" }, { id: "templates", label: "Templates" }, { id: "layout", label: "📐 Layout", overflow: [{ id: "layout", title: "Layout" }, { id: "provider.other", title: "Other" }] }],
  activeTabId: "layout",
  onActivate() {}, settingsTitle: "Settings", onOpenSettings() {},
  overflowLabel: "Extensions",
  providerLabel: (provider) => provider.title,
  onActivateProvider: (id) => providerEvents.push(`open:${id}`),
  onPinProvider: (id) => providerEvents.push(`pin:${id}`),
});
const overflow = overflowHost.tabStrip.children.find((child) => /workspace2-module-overflow-tab/.test(child.className));
assert.ok(overflow);
assert.match(overflow.className, /is-active/, "the overflow wrapper owns the active tab surface");
assert.equal(overflow.children[0].children[0].textContent, "📐 Layout");
overflow.children[2].click();
const overflowMenu = overflowDocument.body.children.at(-1);
assert.match(overflowMenu.className, /workspace2-module-overflow-context/);
assert.equal(overflowMenu.children.length, 3, "menu includes current provider, divider, and another provider");
const currentProviderItem = overflowMenu.children[0];
assert.match(currentProviderItem.className, /is-current/);
assert.equal(currentProviderItem.attributes.get("aria-current"), "page");
assert.equal(currentProviderItem.children[0].textContent, "▸");
currentProviderItem.click();
overflow.children[2].click();
const providerMenu = overflowDocument.body.children.at(-1);
providerMenu.children[2].click();
assert.deepEqual(providerEvents, ["open:layout", "pin:provider.other"]);
overflowHost.dispose();
assert.equal(overflowDocument.listeners.size, 0, "dispose must release document-level overflow listeners");

console.log("WorkspaceKit panel host contract passed.");
