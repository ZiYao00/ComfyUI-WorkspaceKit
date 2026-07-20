import assert from "node:assert/strict";
import { createSettingsDialogShell } from "../entry/settings/dialog-shell.js";

class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.className = ""; this.listeners = new Map(); }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
}

let closeCalls = 0;
const factory = createSettingsDialogShell({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  t: (key) => `t:${key}`,
  toolbarButton: (icon, title, onClick) => ({ icon, title, onClick }),
});
const { backdrop, dialog, header } = factory.createSettingsDialogShell({ onClose: () => { closeCalls += 1; } });

assert.equal(backdrop.className, "workspace2-settings-backdrop");
assert.equal(dialog.className, "workspace2-settings-dialog");
assert.equal(header.className, "workspace2-settings-header");
assert.equal(header.children[0].textContent, "t:settings.title");
assert.deepEqual({ icon: header.children[1].icon, title: header.children[1].title }, { icon: "x", title: "t:settings.close" });
header.children[1].onClick();
assert.equal(closeCalls, 1);

let stopped = 0;
dialog.listeners.get("pointerdown")({ stopPropagation: () => { stopped += 1; } });
dialog.listeners.get("click")({ stopPropagation: () => { stopped += 1; } });
assert.equal(stopped, 2);
backdrop.listeners.get("pointerdown")({ target: dialog });
assert.equal(closeCalls, 1);
backdrop.listeners.get("pointerdown")({ target: backdrop });
assert.equal(closeCalls, 2);

console.log("Settings dialog shell contract passed.");
