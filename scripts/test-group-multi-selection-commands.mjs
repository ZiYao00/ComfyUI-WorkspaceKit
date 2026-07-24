import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
const ungroupStart = source.indexOf("    ungroupSelection() {");
const selectedGroupLoop = source.indexOf("for (const gid of this.selectedGroupIds)", ungroupStart);
const nativeNodeScan = source.indexOf("for (const node of selected)", ungroupStart);

if (ungroupStart < 0 || selectedGroupLoop < 0 || nativeNodeScan < 0) {
  throw new Error("WorkspaceKit multi-group ungroup selection contract is incomplete.");
}
if (selectedGroupLoop > nativeNodeScan) {
  throw new Error("WorkspaceKit transient group selection must be included before native-node fallback selection.");
}
if (!source.includes("this.removeSelectedGroups();")) {
  throw new Error("Delete must execute the batched selected-group removal path.");
}

console.log("Canvas-group multi-selection command contract passed.");
