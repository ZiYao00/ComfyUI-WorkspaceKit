import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const entry = readFileSync(new URL("../entry/entry.js", import.meta.url), "utf8");

// Settings action buttons are entry-owned because they use WorkspaceKit SVGs
// and risk styling. They must not be destructured from controls.js, whose
// contract intentionally contains only generic form controls.
const controlsEnd = entry.indexOf("} = createSettingsControls(");
const controlsStart = entry.lastIndexOf("const {", controlsEnd);
assert.ok(controlsStart >= 0 && controlsEnd >= controlsStart, "The generic Settings controls factory must be initialized once.");
assert.doesNotMatch(entry.slice(controlsStart, controlsEnd), /\bsettingsActionButton\b/);

const sectionsStart = entry.indexOf("createSettingsDialogSections({");
assert.ok(sectionsStart >= 0, "The Settings sections factory must be initialized once.");
assert.match(entry.slice(sectionsStart, sectionsStart + 1800), /\bsettingsActionButton\b/);

console.log("Settings action wiring contract passed.");
