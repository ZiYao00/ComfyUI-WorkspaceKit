import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
const entry = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
const sections = await readFile(new URL("../entry/settings/dialog-sections.js", import.meta.url), "utf8");

assert.match(source, /convertCurrentWorkflowToNative\(expectedSnapshot = null\)/);
assert.match(source, /convertCurrentWorkflowToWorkspaceKit\(\)/);
assert.match(source, /createNativeToWorkspaceKitConversionPlan/);
assert.match(source, /verifyWorkspaceKitConversionResult/);
assert.match(source, /group\._bounding/);
assert.match(source, /typeof value\[Symbol\.iterator\] !== "function"/);
assert.match(source, /const copied = \[\.\.\.value\]/);
assert.match(source, /isConversionSnapshotCurrent\(snapshot\)/);
assert.match(source, /this\._conversionInProgress/);
assert.match(source, /createConversionArchive\(\)/);
assert.match(source, /validateWorkspaceKitGroupConversionArchive\(archive\)/);
assert.match(source, /validateNativeGroupConversionResult/);
assert.match(source, /verifyNativeConversionResult\(/);
assert.match(source, /graph\.add\(native\)/);
assert.match(source, /graph\.remove\(native\)/);
assert.match(source, /groupRepresentation = 'native'/);
assert.match(source, /groupConversion/);
assert.match(source, /if \(this\._nativeRepresentation \|\| app\.graph\.extra\?\.workspacekit\?\.groupRepresentation === 'native'\)/);
assert.match(source, /delete n\._xzgGroup;/);
assert.match(source, /querySelectorAll\?\.\('\.xzg-group-box'\)/);
assert.match(source, /for \(const node of app\.graph\._nodes \|\| \[\]\) this\._clearNodeGroupData\(node\)/);
assert.match(entry, /convertGroupsToNative/);
assert.match(sections, /groups\.convertToNative/);
assert.match(sections, /groups\.conversionStateChanged/);
assert.match(sections, /groups\.conversionLoading/);
assert.match(sections, /groups\.conversionMixed/);

console.log("Native group conversion contract passed.");
