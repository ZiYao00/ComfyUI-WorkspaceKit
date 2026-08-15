import assert from "node:assert/strict";
import { createWorkspacePanelStatusController } from "../entry/ui/panel-status.js";

class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = new Map();
    this.hidden = false;
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
}

const document = { createElement: () => new FakeElement() };
const host = new FakeElement();
const status = createWorkspacePanelStatusController({ host, document });

assert.equal(status.show({ text: "3 selected", tone: "success" }), true);
assert.equal(host.hidden, false);
assert.equal(host.children.length, 1);
assert.equal(host.children[0].textContent, "3 selected");
assert.match(host.children[0].className, /is-success/);
assert.equal(host.children[0].attributes.get("role"), "status");
assert.equal(host.children[0].attributes.get("aria-live"), "polite");
assert.equal(status.show({ text: "", tone: "error" }), false);
assert.equal(host.hidden, true);
assert.equal(host.children.length, 0);
status.show({ text: "Failed", tone: "invalid", live: "assertive" });
assert.match(host.children[0].className, /is-neutral/);
assert.equal(host.children[0].attributes.get("aria-live"), "assertive");
status.dispose();
assert.equal(host.hidden, true);
assert.equal(host.children.length, 0);

console.log("WorkspaceKit bottom status-slot contract passed.");
