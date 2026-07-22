import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/workspace2_canvas_groups.js", import.meta.url), "utf8");
const scaleStart = source.indexOf("const delBtn = el.querySelector('.xzg-delete-btn')");
const scaleEnd = source.indexOf("['xzg-border-left', 'xzg-border-right']", scaleStart);
assert.ok(scaleStart >= 0 && scaleEnd > scaleStart, "header-control scaling boundary must exist");
const scaling = source.slice(scaleStart, scaleEnd);

assert.match(scaling, /const buttonSize = headerHeight \* 0\.78;/, "button size must follow header/title scale");
assert.match(scaling, /const iconSize = buttonSize \* 0\.72;/, "icon size must follow button scale");
assert.match(scaling, /actions\.style\.gap = `\$\{headerHeight \* 0\.07\}px`;/, "action spacing must follow header scale");
assert.match(scaling, /btn\.style\.display = 'inline-flex';/, "action glyphs must use a centered flex box");
assert.match(scaling, /btn\.style\.alignItems = 'center';/, "action glyphs must center vertically");
assert.match(scaling, /btn\.style\.justifyContent = 'center';/, "action glyphs must center horizontally");
assert.doesNotMatch(scaling, /Math\.max\(14|Math\.max\(12/, "icons must not stop shrinking before the title");

assert.equal((source.match(/class="xzg-group-action-icon"/g) || []).length, 3, "three header action icons must share one scalable class");
assert.match(source, /M2\.4 10s2\.7-4\.5 7\.6-4\.5 7\.6 4\.5 7\.6 4\.5-2\.7 4\.5-7\.6 4\.5S2\.4 10 2\.4 10Z/, "bypass icon must use the eye-off path");
assert.match(source, /stroke-width="1\.9"/, "eye-off stroke must remain visually light");
assert.match(source, /stroke-width="2\.1"/, "disable stroke must remain balanced");
assert.match(source, /<circle cx="10" cy="10" r="7\.05"\/>/, "disable icon must use the bolder ban mark");

console.log("Canvas group action icon contract passed.");
