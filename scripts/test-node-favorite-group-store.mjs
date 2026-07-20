import assert from "node:assert/strict";
import { createNodeFavoriteGroupStore } from "../entry/nodes/favorite-group-store.js";

let tick = 100;
const state = {
  library: {
    groups: [{ id: "root", name: "Favorites", parentId: "", order: 0 }],
    favorites: [{ type: "A", groupId: "group-parent", order: 0 }],
  },
};
const store = createNodeFavoriteGroupStore({
  state,
  defaultGroupId: "root",
  now: () => tick++,
});

assert.equal(store.uniqueNodeGroupName("Group"), "Group");
const parent = store.createNodeGroup("Group");
assert.equal(parent.id, "group-2s");
assert.equal(parent.parentId, "");
assert.equal(store.uniqueNodeGroupName("Group"), "Group 2");
const child = store.createNodeGroup("Child", parent.id);
assert.equal(child.parentId, parent.id);
assert.equal(store.isNodeGroupDescendant(child.id, parent.id), true);
assert.equal(store.isNodeGroupDescendant(parent.id, child.id), false);

assert.equal(store.moveNodeGroupToParent(parent.id, child.id), null);
assert.equal(parent.parentId, "");
assert.equal(store.moveNodeGroupToParent(child.id, "root").parentId, "");
assert.equal(child.order, 2);

const orphan = store.createNodeGroup("Orphan", parent.id);
state.library.favorites[0].groupId = parent.id;
assert.equal(store.deleteNodeGroup(parent.id), true);
assert.equal(state.library.favorites[0].groupId, "root");
assert.equal(store.getNodeGroup(parent.id), null);
assert.equal(store.getNodeGroup(orphan.id).parentId, parent.id);
assert.equal(store.deleteNodeGroup("root"), false);
assert.equal(store.moveNodeGroupToParent("root", child.id), null);

console.log("Node favorite-group store contract passed.");
