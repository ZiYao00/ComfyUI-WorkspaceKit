import assert from "node:assert/strict";
import { mergeNodeDefinitionSources } from "../entry/nodes/definition-merge.js";

const result = mergeNodeDefinitionSources({
  objectInfo: {
    LoraLoaderBypass: { display_name: "Load LoRA (Bypass)" },
    SharedType: { display_name: "Official definition wins" },
  },
  registeredNodeTypes: {
    "Fast Bypasser (rgthree)": { title: "Fast Bypasser (rgthree)", category: "rgthree" },
    SharedType: { title: "Browser copy must not replace official" },
  },
  wrapObjectInfoNode: (type, definition) => ({ type, title: definition.display_name, source: "official" }),
  wrapRegisteredNode: (type, definition) => ({ type, title: definition.title, source: "browser" }),
});

assert.deepEqual(
  result.map(({ type, source }) => ({ type, source })),
  [
    { type: "Fast Bypasser (rgthree)", source: "browser" },
    { type: "LoraLoaderBypass", source: "official" },
    { type: "SharedType", source: "official" },
  ],
);
console.log("node definition merge tests passed");
