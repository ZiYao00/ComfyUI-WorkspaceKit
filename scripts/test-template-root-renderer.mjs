import assert from "node:assert/strict";
import { createTemplateRootRenderer } from "../entry/templates/root-renderer.js";

class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.className = ""; this.textContent = ""; }
  append(...children) { this.children.push(...children); }
}

const calls = [];
const renderer = createTemplateRootRenderer({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  translate: (key) => `t:${key}`,
  makeTemplateDropTarget: (_el, target, groupId) => calls.push(["drop", target.className, groupId]),
  renderTemplateRow: (_el, template) => ({ row: template.id }),
  renderTemplateGroupFolder: (_el, section, group, query, depth) => { calls.push(["group", group.id, query, depth]); section.append({ group: group.id }); },
});

const body = new FakeElement("body");
renderer.renderTemplateRootResults({
  el: { id: "panel" }, body, query: "", rootTemplates: [{ id: "root" }], rootGroups: [{ id: "images" }],
});
assert.equal(body.children.length, 1);
assert.equal(body.children[0].className, "workspace2-node-section");
assert.equal(body.children[0].children[0].className, "workspace2-node-list workspace2-template-list");
assert.deepEqual(body.children[0].children[0].children, [{ row: "root" }]);
assert.deepEqual(calls, [["drop", "workspace2-node-list workspace2-template-list", ""], ["group", "images", "", 0]]);

const emptyBody = new FakeElement("body");
renderer.renderTemplateRootResults({ el: {}, body: emptyBody, query: "needle", rootTemplates: [], rootGroups: [] });
assert.equal(emptyBody.children[0].className, "workspace2-empty");
assert.equal(emptyBody.children[0].textContent, "t:templates.noMatches");
const emptyRootBody = new FakeElement("body");
renderer.renderTemplateRootResults({ el: {}, body: emptyRootBody, query: "", rootTemplates: [], rootGroups: [] });
assert.equal(emptyRootBody.children[0].textContent, "t:templates.empty");

console.log("Template root renderer contract passed.");
