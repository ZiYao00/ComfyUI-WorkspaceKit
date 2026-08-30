import assert from "node:assert/strict";
import {
  WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY,
  publishWorkspaceKitPanelUiTemplate,
} from "../entry/integrations/panel-ui-template-api.js";

class FakeElement {
  constructor() { this.children = []; this.style = { setProperty() {} }; this.classList = { add() {} }; }
  append(...items) { this.children.push(...items); }
  setAttribute() {}
  addEventListener() {}
}

class FakeDocument {
  constructor() { this.head = new FakeElement(); this.elements = new Map(); }
  createElement() {
    const element = new FakeElement();
    Object.defineProperty(element, "id", { set: (value) => this.elements.set(value, element), get: () => "" });
    return element;
  }
  getElementById(id) { return this.elements.get(id) || null; }
}

const target = {};
const published = publishWorkspaceKitPanelUiTemplate(target);
assert.equal(published.ok, true);
assert.equal(published.code, "published");
assert.equal(target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].supports(1), true);
assert.equal(target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].supports(2), false);
assert.equal(target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].contract.major, 1);
assert.equal(target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].contract.capabilities.includes("command-grid"), true);
assert.equal(target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].contract.capabilities.includes("dropzone-surface"), true);
const ui = target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].create({ document: new FakeDocument() });
assert.equal(ui.major, 1);
assert.equal(ui.contract.capabilities.includes("module-header"), true);
assert.equal(typeof ui.createCommandGrid, "function");
assert.equal(typeof ui.createDisclosureSection, "function");
assert.equal(typeof ui.createCompactActionBar, "function");
assert.equal(typeof ui.createDropzoneSurface, "function");
assert.equal(publishWorkspaceKitPanelUiTemplate(target).template, target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY]);

const staleTarget = {
  [WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY]: {
    major: 1,
    version: "1.5.0",
    supports: () => true,
    create: () => ({ createPanelBlueprint: () => ({}) }),
  },
};
const refreshed = publishWorkspaceKitPanelUiTemplate(staleTarget);
assert.equal(refreshed.ok, true);
assert.equal(refreshed.code, "refreshed");
assert.equal(staleTarget[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].version, target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].version);
assert.equal(typeof staleTarget[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY].create({ document: new FakeDocument() }).createPanelBlueprint, "function");

assert.equal(publishWorkspaceKitPanelUiTemplate({ [WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY]: { major: 99 } }).code, "template-conflict");
assert.equal(publishWorkspaceKitPanelUiTemplate(null).code, "invalid-target");
console.log("WorkspaceKit Panel UI Template runtime contract passed.");
