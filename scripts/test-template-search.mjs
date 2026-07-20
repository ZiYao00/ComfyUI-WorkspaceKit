import assert from "node:assert/strict";
import { createTemplateSearch } from "../entry/templates/search.js";

let sortMode = "manual";
const search = createTemplateSearch({
  splitCamelCase: (value) => String(value).replace(/([a-z])([A-Z])/g, "$1 $2"),
  compactSearchFields: (fields) => fields.filter(Boolean).map((value) => String(value).toLocaleLowerCase()),
  genericSearchScores: (fields, query) => [fields.some((field) => field.includes(query)) ? 0 : 9],
  compareSearchScores: (a, b) => a[0] - b[0],
  getSortMode: () => sortMode,
});

const templates = [
  { id: "b", name: "Beta", order: 2, updatedAt: 10, nodes: [{ type: "LoadImage" }] },
  { id: "a", name: "Alpha", order: 1, updatedAt: 30, nodes: [{ title: "Color Adjust" }] },
  { id: "c", name: "Gamma", order: 0, createdAt: 20, nodes: [] },
];

assert.equal(search.templateMatchesQuery(templates[0], "load image"), true);
assert.equal(search.templateMatchesQuery(templates[0], "missing"), false);
assert.deepEqual(search.sortedVisibleTemplates(templates, "").map((template) => template.id), ["c", "a", "b"]);
assert.deepEqual(search.sortedVisibleTemplates(templates, "alpha").map((template) => template.id), ["a"]);

sortMode = "nameAsc";
assert.deepEqual([...templates].sort((a, b) => search.compareTemplatesBySort(a, b)).map((template) => template.id), ["a", "b", "c"]);
sortMode = "nameDesc";
assert.deepEqual([...templates].sort((a, b) => search.compareTemplatesBySort(a, b)).map((template) => template.id), ["c", "b", "a"]);
sortMode = "updatedDesc";
assert.deepEqual([...templates].sort((a, b) => search.compareTemplatesBySort(a, b)).map((template) => template.id), ["a", "c", "b"]);
sortMode = "updatedAsc";
assert.deepEqual([...templates].sort((a, b) => search.compareTemplatesBySort(a, b)).map((template) => template.id), ["b", "c", "a"]);

console.log("Template search contract passed.");
