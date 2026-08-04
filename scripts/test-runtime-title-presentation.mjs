import assert from "node:assert/strict";
import {
  applyRuntimeNodeTitlePresentation,
  runtimeNodeTitleFingerprint,
} from "../entry/nodes/runtime-title-presentation.js";

const nodes = [{
  type: "CheckpointLoaderSimple",
  title: "Load Checkpoint",
  searchAliases: ["Checkpoint Loader"],
}];

const presented = applyRuntimeNodeTitlePresentation(nodes, {
  CheckpointLoaderSimple: Object.assign(function CheckpointLoaderSimple() {}, {
    title: "Checkpoint加载器（简易）",
  }),
});
assert.equal(presented[0].title, "Checkpoint加载器（简易）");
assert.equal(presented[0].rawTitle, "Load Checkpoint");
assert.deepEqual(presented[0].searchAliases, [
  "Checkpoint Loader",
  "Load Checkpoint",
  "Checkpoint加载器（简易）",
]);

const fallback = applyRuntimeNodeTitlePresentation(nodes, {});
assert.equal(fallback[0].title, "Load Checkpoint");
assert.deepEqual(fallback[0].searchAliases, ["Checkpoint Loader", "Load Checkpoint"]);
assert.equal(nodes[0].rawTitle, undefined);

const withTranslatorAlias = applyRuntimeNodeTitlePresentation(
  [{ type: "Fast Groups Bypasser (rgthree)", title: "忽略多框" }],
  {},
  () => ["Fast Groups Bypasser (rgthree)"],
);
assert.deepEqual(withTranslatorAlias[0].searchAliases, ["忽略多框", "Fast Groups Bypasser (rgthree)"]);

assert.notEqual(
  runtimeNodeTitleFingerprint({ CheckpointLoaderSimple: { title: "Load Checkpoint" } }),
  runtimeNodeTitleFingerprint({ CheckpointLoaderSimple: { title: "Checkpoint加载器（简易）" } }),
);
assert.equal(
  runtimeNodeTitleFingerprint({ B: { title: "B" }, A: { title: "A" } }),
  runtimeNodeTitleFingerprint({ A: { title: "A" }, B: { title: "B" } }),
);

console.log("runtime node title presentation tests passed");
