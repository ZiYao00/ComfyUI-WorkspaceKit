import assert from "node:assert/strict";
import { createPanelUiTemplateManifest, sha256, verifyPanelUiTemplateManifest } from "./lib/panel-ui-template-export.mjs";

const files = { "one.js": Buffer.from("one"), "two.js": Buffer.from("two") };
const manifest = createPanelUiTemplateManifest({ uiVersion: "1.0.0", sourceCommit: "abc", files });
assert.equal(manifest.files["one.js"], sha256(Buffer.from("one")));
assert.deepEqual(verifyPanelUiTemplateManifest(manifest, { uiVersion: "1.0.0", files }), { ok: true, errors: [] });
assert.equal(verifyPanelUiTemplateManifest(manifest, { uiVersion: "1.0.0", files: { ...files, "two.js": Buffer.from("changed") } }).ok, false);
assert.equal(verifyPanelUiTemplateManifest(manifest, { uiVersion: "2.0.0", files }).ok, false);
console.log("Panel UI Template export contract passed.");
