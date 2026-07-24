import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");

assert.match(source, /const cancelModal = \(\) => \{/);
assert.match(source, /modal\.querySelector\('\.xzg-set-cancel'\)\.addEventListener\('click', \(\) => \{\s*cancelModal\(\);/s);
assert.match(source, /if \(e\.key === 'Escape'\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*cancelModal\(\);/s);
assert.match(source, /const cancelModal = \(\) => \{[\s\S]*?revertSnapshot\(\);[\s\S]*?cleanupModal\(\);/);
assert.match(source, /const applyModal = \(\) => \{[\s\S]*?applySettings\(group\);[\s\S]*?cleanupModal\(\);/);
assert.match(source, /e\.key === 'Enter' && !e\.isComposing[\s\S]*?applyModal\(\);/);
assert.match(source, /xzg-preset-btn" data-preset="0"[\s\S]*?width:28px/);
assert.match(source, /const flashActionSuccess = \(button, text, duration = 850\)/);
assert.match(source, /button\.style\.background = 'var\(--p-primary-color, var\(--accent-color, #0A84FF\)\)'/);
assert.match(source, /xzg-save-preset'\)\.addEventListener\('click', async event =>[\s\S]*?flashActionSuccess/);
assert.match(source, /xzg-set-apply-all'\)\.addEventListener\('click', async event =>[\s\S]*?flashActionSuccess/);
assert.match(source, /const rebaseCancelSnapshot = \(\) => Object\.assign\(_snapshot, captureSnapshot\(group\)\);/);
assert.match(source, /writeGroupDataToNodes\(\);\s*\/\/ Keep the dialog open[\s\S]*?rebaseCancelSnapshot\(\);\s*await flashActionSuccess\(event\.currentTarget, t\('groups\.applied'\), 360\);\s*\}\);/);

console.log("group settings Escape contract passed");
