import assert from "node:assert/strict";
import { collectRuntimeNodeTitleProbe } from "../entry/nodes/runtime-title-probe.js";

const result = collectRuntimeNodeTitleProbe({
  type: "CheckpointLoaderSimple",
  rawDefinition: { display_name: "Load Checkpoint" },
  registeredNodeTypes: {
    CheckpointLoaderSimple: Object.assign(function CheckpointLoaderSimple() {}, {
      title: "Checkpoint加载器（简易）",
      nodeData: { name: "CheckpointLoaderSimple" },
    }),
  },
  nodeDefinitionSources: [{
    source: "app.nodeDefStore.nodeDefs",
    container: new Map([["CheckpointLoaderSimple", { displayName: "Checkpoint加载器（简易）" }]]),
  }],
});

assert.equal(result.type, "CheckpointLoaderSimple");
assert.deepEqual(result.candidates, [
  { source: "object_info.display_name", title: "Load Checkpoint" },
  { source: "LiteGraph.registered_node_types.title", title: "Checkpoint加载器（简易）" },
  { source: "app.nodeDefStore.nodeDefs.displayName", title: "Checkpoint加载器（简易）" },
]);
assert.deepEqual(collectRuntimeNodeTitleProbe({ type: "" }), { type: "", candidates: [] });

console.log("runtime node title probe tests passed");
