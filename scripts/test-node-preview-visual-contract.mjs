import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/ui/styles.js", import.meta.url), "utf8");

assert.match(
  source,
  /grid-template-columns:\s*7px minmax\(0, 0\.85fr\) minmax\(72px, 1\.25fr\) minmax\(0, 0\.85fr\) 7px/,
  "Preview ports must fit inside the narrow sidebar card",
);
assert.match(
  source,
  /\.workspace2-node-preview-mini-port\.is-output\s*\{\s*justify-self:\s*end;/,
  "Output ports must anchor to the right edge",
);
const widgetRule = source.match(/\.workspace2-node-preview-mini-widget\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
assert.match(widgetRule, /inset 0 1px 0/);
assert.match(widgetRule, /inset 0 -1px 0/);
assert.doesNotMatch(widgetRule, /\n\s*0 1px 0 rgba\(0, 0, 0, 0\.25\)/);
assert.match(source, /\.workspace2-node-preview-surface\.is-image,/);
assert.match(source, /\.workspace2-node-preview-surface\.is-audio/);
assert.match(source, /\.workspace2-node-preview-surface\.is-video/);
assert.match(source, /\.workspace2-node-preview-surface\.is-text/);
assert.match(source, /\.workspace2-node-preview-surface-file\s*\{/);
assert.match(source, /\.workspace2-node-preview-audio-player\s*\{/);
assert.match(source, /\.workspace2-node-preview-audio-waveform\s*\{/);

console.log("node preview visual contract passed");
