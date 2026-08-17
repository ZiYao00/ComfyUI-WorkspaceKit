import assert from "node:assert/strict";
import { createWorkflowFavoriteStore } from "../entry/workflows/favorite-store.js";

let saved = [];
const store = createWorkflowFavoriteStore({
  fetchJson: async () => ({ favorites: ["Folder/One.json"] }),
  postJson: async (_path, payload) => {
    saved = payload.favorites;
    return { favorites: payload.favorites };
  },
});

await store.load();
assert.equal(store.has("Folder/One.json"), true);
await store.toggle("Two.json");
assert.deepEqual(saved, ["Folder/One.json", "Two.json"]);
store.remap("Folder", "Moved");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(store.has("Moved/One.json"), true);
assert.equal(store.has("Folder/One.json"), false);
store.remove("Moved");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(store.snapshot(), ["Two.json"]);

console.log("workflow favorite-store contract passed");
