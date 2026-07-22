import assert from "node:assert/strict";
import {
  emptyTemplateTrash,
  moveTemplateToTrash,
  permanentlyDeleteTemplateFromTrash,
  restoreTemplateFromTrash,
} from "../entry/templates/trash-store.js";

const group = { id: "favorites", name: "Favorites" };
const template = {
  id: "template-a",
  name: "A template",
  groupId: "favorites",
  nodes: [{ id: 1, title: "Keep node data" }],
  links: [[1, 0, 2, 0, "*"]],
  createdAt: 1,
  updatedAt: 2,
};
const library = { version: 2, groups: [group], templates: [template], trash: [] };

const trashed = moveTemplateToTrash(library, template, 101);
assert.equal(library.templates.length, 1, "source library must not be mutated");
assert.equal(trashed.templates.length, 0);
assert.equal(trashed.trash.length, 1);
assert.equal(trashed.trash[0].originalGroupId, "favorites");
assert.deepEqual(trashed.trash[0].template.nodes, template.nodes);

const restored = restoreTemplateFromTrash(trashed, trashed.trash[0], 202);
assert.equal(restored.trash.length, 0);
assert.equal(restored.templates.length, 1);
assert.equal(restored.templates[0].groupId, "favorites");
assert.equal(restored.templates[0].updatedAt, 202);

const missingGroupLibrary = { ...trashed, groups: [] };
const restoredToRoot = restoreTemplateFromTrash(missingGroupLibrary, missingGroupLibrary.trash[0], 303);
assert.equal(restoredToRoot.templates[0].groupId, "", "removed group restores to template root");

const permanent = permanentlyDeleteTemplateFromTrash(trashed, trashed.trash[0]);
assert.equal(permanent.trash.length, 0);
assert.equal(emptyTemplateTrash({ ...trashed, trash: [trashed.trash[0], { id: "other", template }] }).trash.length, 0);

console.log("Template trash store contract passed.");
