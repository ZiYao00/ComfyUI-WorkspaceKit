import assert from "node:assert/strict";
import { attachOpenHistoryResize } from "../entry/workflows/open-history-resize.js";

class Element {
  constructor(className = "") {
    this.className = className;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = { values: new Map(), setProperty: (name, value) => this.style.values.set(name, value) };
    this.classList = { values: new Set(), add: (name) => this.classList.values.add(name), remove: (name) => this.classList.values.delete(name) };
  }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    if (selector === ".workspace2-open-history-list") return this.list || null;
    if (selector === ".workspace2-current-workflow") return this.row || null;
    return null;
  }
  getBoundingClientRect() { return { height: this.height || 0 }; }
  setPointerCapture(pointerId) { this.pointerId = pointerId; }
  releasePointerCapture(pointerId) { this.releasedPointerId = pointerId; }
}

const previousDocument = globalThis.document;
globalThis.document = { createElement: () => new Element() };
try {
  const section = new Element();
  const list = new Element("workspace2-open-history-list");
  const row = new Element("workspace2-current-workflow");
  row.height = 30;
  list.row = row;
  list.height = 150;
  section.list = list;

  let limit = 5;
  const commits = [];
  attachOpenHistoryResize(section, {
    getLimit: () => limit,
    setLimit: (value) => { limit = value; commits.push(value); },
    snapLimit: (value) => Math.max(2, Math.min(15, Math.round(Number(value) || 0))),
    onCommit: () => commits.push("commit"),
  });

  const handle = section.children[0];
  assert.equal(handle.attributes.get("aria-valuenow"), "5");
  handle.listeners.get("pointerdown")({ button: 0, pointerId: 7, clientY: 100, preventDefault() {}, stopPropagation() {} });
  handle.listeners.get("pointermove")({ pointerId: 7, clientY: 160 });
  assert.equal(list.style.values.get("--workspace2-open-history-rows"), "7");
  assert.deepEqual(commits, [], "live resize must not rebuild or persist before pointer release");
  handle.listeners.get("pointerup")({ pointerId: 7 });
  assert.deepEqual(commits, [7, "commit"]);

  handle.listeners.get("keydown")({ key: "ArrowUp", preventDefault() {} });
  assert.deepEqual(commits, [7, "commit", 6, "commit"]);
  console.log("Workflow Open-history resize contract passed.");
} finally {
  globalThis.document = previousDocument;
}
