import assert from "node:assert/strict";
import { createTemplateGroupContentsRenderer } from "../entry/templates/group-contents-renderer.js";

class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.className = ""; this.style = { values: new Map(), setProperty: (key, value) => this.style.values.set(key, value) }; }
  append(...children) { this.children.push(...children); }
}

const calls = [];
const renderer = createTemplateGroupContentsRenderer({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  makeTemplateDropTarget: (_el, target, groupId) => calls.push(["drop", target.className, groupId]),
  renderTemplateRow: (_el, template) => ({ row: template.id }),
  renderTemplateGroupFolder: (_el, section, group, query, depth) => { calls.push(["child", group.id, query, depth]); section.append({ group: group.id }); },
});

const section = new FakeElement("section");
assert.equal(renderer.renderTemplateGroupContents({
  el: { id: "panel" }, section, group: { id: "parent" }, query: "image", depth: 2, groupOpen: true,
  childGroups: [{ id: "child" }], groupTemplates: [{ id: "a" }, { id: "b" }],
}), true);
assert.deepEqual(calls, [["child", "child", "image", 3], ["drop", "workspace2-node-list workspace2-template-list", "parent"]]);
assert.equal(section.children[1].className, "workspace2-node-list workspace2-template-list");
assert.equal(section.children[1].style.values.get("--indent"), "52px");
assert.deepEqual(section.children[1].children, [{ row: "a" }, { row: "b" }]);

const collapsedSection = new FakeElement("section");
assert.equal(renderer.renderTemplateGroupContents({ el: {}, section: collapsedSection, group: { id: "parent" }, query: "", depth: 0, groupOpen: false, childGroups: [{ id: "child" }], groupTemplates: [{ id: "a" }] }), false);
assert.equal(collapsedSection.children.length, 0);

console.log("Template group contents renderer contract passed.");
