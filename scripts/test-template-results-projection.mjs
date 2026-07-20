import assert from "node:assert/strict";
import { createTemplateResultsProjection } from "../entry/templates/results-projection.js";

const groups = [
  { id: "root-a", name: "Images", parentId: "" },
  { id: "child-a", name: "Loaders", parentId: "root-a" },
  { id: "root-b", name: "Text", parentId: "" },
];
const projection = createTemplateResultsProjection({
  getChildGroups: (parentId) => groups.filter((group) => group.parentId === parentId),
  templateMatchesQuery: (template, query) => !query || template.name.toLowerCase().includes(query.toLowerCase()),
  compareTemplatesBySort: (a, b) => a.order - b.order || a.name.localeCompare(b.name),
});
const templates = [
  { id: "root", name: "Root", groupId: "", order: 2 },
  { id: "image", name: "Image Resize", groupId: "root-a", order: 1 },
  { id: "load", name: "Load Image", groupId: "child-a", order: 0 },
  { id: "text", name: "Text Prompt", groupId: "root-b", order: 0 },
];

const rootAll = projection.projectTemplateRootResults({ query: "", templates });
assert.deepEqual(rootAll.rootTemplates.map((template) => template.id), ["root"]);
assert.deepEqual(rootAll.rootGroups.map((group) => group.id), ["root-a", "root-b"]);

const imageSearch = projection.projectTemplateRootResults({ query: "image", templates });
assert.deepEqual(imageSearch.rootGroups.map((group) => group.id), ["root-a"]);
const parentResults = projection.projectTemplateGroupResults({ group: groups[0], query: "image", templates });
assert.deepEqual(parentResults.groupTemplates.map((template) => template.id), ["image"]);
assert.deepEqual(parentResults.childGroups.map((group) => group.id), ["child-a"]);

const nameSearch = projection.projectTemplateRootResults({ query: "text", templates });
assert.deepEqual(nameSearch.rootGroups.map((group) => group.id), ["root-b"]);
assert.equal(projection.templateMatchesGroup(groups[0], "load", templates), true);
assert.equal(projection.templateMatchesGroup(groups[1], "missing", templates), false);

console.log("Template results projection contract passed.");
