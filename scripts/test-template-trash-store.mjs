import assert from "node:assert/strict";
import {
  dissolveTemplateGroup,
  flattenTemplateGroup,
  emptyTemplateTrash,
  moveTemplateGroupToTrash,
  moveTemplateToTrash,
  permanentlyDeleteTemplateFromTrash,
  restoreTemplateFromTrash,
  templateGroupSubtreeIds,
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

const nestedLibrary = {
  version: 2,
  groups: [
    { id: "parent", parentId: "", name: "Parent" },
    { id: "child", parentId: "parent", name: "Child" },
    { id: "grandchild", parentId: "child", name: "Grandchild" },
    { id: "sibling", parentId: "", name: "Sibling" },
  ],
  templates: [
    { ...template, id: "parent-template", groupId: "parent" },
    { ...template, id: "child-template", groupId: "child" },
    { ...template, id: "grandchild-template", groupId: "grandchild" },
    { ...template, id: "sibling-template", groupId: "sibling" },
  ],
  trash: [],
};
assert.deepEqual([...templateGroupSubtreeIds(nestedLibrary, "parent")].sort(), ["child", "grandchild", "parent"]);

const dissolved = dissolveTemplateGroup(nestedLibrary, "parent");
assert.equal(dissolved.groups.some((item) => item.id === "parent"), false);
assert.equal(dissolved.groups.find((item) => item.id === "child").parentId, "");
assert.equal(dissolved.templates.find((item) => item.id === "parent-template").groupId, "");
assert.equal(dissolved.templates.find((item) => item.id === "grandchild-template").groupId, "grandchild");

// T-048: flatten removes the whole subtree, so unlike dissolve no inner group
// survives. Every template lands in the removed group's parent.
const flattened = flattenTemplateGroup(nestedLibrary, "parent");
assert.deepEqual(flattened.groups.map((item) => item.id), ["sibling"]);
for (const id of ["parent-template", "child-template", "grandchild-template"]) {
  assert.equal(flattened.templates.find((item) => item.id === id).groupId, "", id);
}
// Flatten must never lose a template - that would make it a silent delete.
assert.equal(flattened.templates.length, nestedLibrary.templates.length);
// A group outside the subtree keeps its own templates untouched.
assert.equal(flattened.templates.find((item) => item.id === "sibling-template").groupId, "sibling");
assert.deepEqual(flattened.trash, []);

// Flattening a mid-level group promotes into that group's parent, not the root.
const midFlattened = flattenTemplateGroup(nestedLibrary, "child");
assert.deepEqual(midFlattened.groups.map((item) => item.id).sort(), ["parent", "sibling"]);
assert.equal(midFlattened.templates.find((item) => item.id === "grandchild-template").groupId, "parent");
assert.equal(midFlattened.templates.find((item) => item.id === "parent-template").groupId, "parent");

// An unknown id is a no-op rather than a library-wiping edge case.
assert.equal(flattenTemplateGroup(nestedLibrary, "missing"), nestedLibrary);

const groupTrashed = moveTemplateGroupToTrash(nestedLibrary, "parent", 404);
assert.equal(groupTrashed.groups.some((item) => item.id === "parent"), false);
assert.equal(groupTrashed.groups.some((item) => item.id === "child"), false);
assert.equal(groupTrashed.templates.length, 1);
assert.equal(groupTrashed.templates[0].id, "sibling-template");
assert.deepEqual(groupTrashed.trash.map((entry) => entry.template.id).sort(), ["child-template", "grandchild-template", "parent-template"]);
assert.ok(groupTrashed.trash.every((entry) => entry.deletedAt === 404));

console.log("Template trash store contract passed.");
