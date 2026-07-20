import assert from "node:assert/strict";
import { createWorkflowFolderMetaService } from "../entry/workflows/folder-meta.js";

const state = {
  folderMeta: {
    "folder/child": { icon: "📁", color: "#0A84FF" },
  },
};
const requests = [];
const renders = [];
let response = null;

const service = createWorkflowFolderMetaService({
  state,
  normalizePath: (path) => String(path || "").replace(/\\/g, "/"),
  postJson: async (url, payload) => {
    requests.push({ url, payload });
    return response || {};
  },
  renderPanel: (el) => renders.push(el),
});

assert.deepEqual(service.get("folder\\child"), { icon: "📁", color: "#0A84FF" });
await service.save("panel-a", "folder\\child", { color: "" });
assert.deepEqual(requests.at(-1), {
  url: "/workspace2/folder-meta",
  payload: { folder_meta: { "folder/child": { icon: "📁" } } },
});
assert.deepEqual(state.folderMeta, { "folder/child": { icon: "📁" } });
assert.deepEqual(renders, ["panel-a"]);

await service.reset("panel-b", { path: "folder/child" });
assert.deepEqual(requests.at(-1), {
  url: "/workspace2/folder-meta",
  payload: { folder_meta: {} },
});
assert.deepEqual(state.folderMeta, {});
assert.deepEqual(renders, ["panel-a", "panel-b"]);

response = { folder_meta: { server: { icon: "⭐" } } };
await service.save("panel-c", "local", { icon: "🧩", color: "  " });
assert.deepEqual(state.folderMeta, { server: { icon: "⭐" } });
assert.deepEqual(renders, ["panel-a", "panel-b", "panel-c"]);

console.log("workflow folder-meta contract passed");
