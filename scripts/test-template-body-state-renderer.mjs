import assert from "node:assert/strict";
import { createTemplateBodyStateRenderer } from "../entry/templates/body-state-renderer.js";

class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.className = ""; this.textContent = ""; this.children = []; }
  append(...children) { this.children.push(...children); }
}

const renderer = createTemplateBodyStateRenderer({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  translate: (key, values = {}) => `${key}:${values.message || ""}`,
});
const loadingBody = new FakeElement("body");
assert.equal(renderer.renderTemplateBodyState({ body: loadingBody, loading: true, error: "ignored" }), true);
assert.equal(loadingBody.children[0].className, "workspace2-empty");
assert.equal(loadingBody.children[0].textContent, "status.loading:");
const errorBody = new FakeElement("body");
assert.equal(renderer.renderTemplateBodyState({ body: errorBody, loading: false, error: "network" }), true);
assert.equal(errorBody.children[0].textContent, "status.error:network");
const readyBody = new FakeElement("body");
assert.equal(renderer.renderTemplateBodyState({ body: readyBody, loading: false, error: "" }), false);
assert.equal(readyBody.children.length, 0);

console.log("Template body-state renderer contract passed.");
