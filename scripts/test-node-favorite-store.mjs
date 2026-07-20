import assert from "node:assert/strict";
import { createNodeFavoriteStore } from "../entry/nodes/favorite-store.js";

const state = {
  library: {
    favorites: [],
  },
};
const store = createNodeFavoriteStore({
  state,
  defaultGroupId: "root",
  now: () => 1234,
});

assert.equal(store.addFavoriteNode({ type: "A", title: "Alpha" }), true);
assert.equal(store.addFavoriteNode({ type: "B", title: "Beta" }), true);
assert.deepEqual(state.library.favorites.map(({ type, groupId, order, addedAt }) => ({ type, groupId, order, addedAt })), [
  { type: "A", groupId: "root", order: 0, addedAt: 1234 },
  { type: "B", groupId: "root", order: 1, addedAt: 1234 },
]);

assert.equal(store.addFavoriteNode({ type: "C", title: "Gamma" }, "group-1"), true);
assert.equal(store.moveFavoriteToGroup("B", "group-1", "C"), true);
assert.deepEqual(state.library.favorites.filter((item) => item.groupId === "group-1").sort((a, b) => a.order - b.order).map((item) => [item.type, item.order]), [
  ["B", 0],
  ["C", 1],
]);
assert.deepEqual(state.library.favorites.filter((item) => item.groupId === "root").sort((a, b) => a.order - b.order).map((item) => [item.type, item.order]), [
  ["A", 0],
]);

assert.equal(store.addFavoriteNode({ type: "B", title: "Beta" }, "root", "A"), true);
assert.deepEqual(state.library.favorites.filter((item) => item.groupId === "root").sort((a, b) => a.order - b.order).map((item) => [item.type, item.order]), [
  ["B", 0],
  ["A", 1],
]);
assert.equal(store.setFavoriteAlias("A", "  Custom Alpha  "), true);
assert.equal(store.getFavorite("A").alias, "Custom Alpha");
assert.equal(store.setFavoriteAlias("A", "Custom Alpha"), false);
assert.equal(store.removeFavoriteNode("B"), true);
assert.equal(store.removeFavoriteNode("B"), false);
assert.equal(store.getFavorite("B"), null);

console.log("Node favorite store contract passed.");
