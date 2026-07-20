import assert from "node:assert/strict";
import { createWorkflowCustomOrderStore } from "../entry/workflows/custom-order-store.js";

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
const store = createWorkflowCustomOrderStore({ storage, key: "workflow.order" });

assert.deepEqual(store.read(), {});
values.set("workflow.order", '{"folder":["folder/a.json"]}');
assert.deepEqual(store.read(), { folder: ["folder/a.json"] });
values.set("workflow.order", "[]");
assert.deepEqual(store.read(), {});
values.set("workflow.order", "{invalid");
assert.deepEqual(store.read(), {});
store.save({ "": ["root.json"] });
assert.equal(values.get("workflow.order"), '{"":["root.json"]}');
store.save(null);
assert.equal(values.get("workflow.order"), "{}");

console.log("workflow custom-order store contract passed");
