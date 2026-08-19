/**
 * README surface contract.
 *
 * English is the default README (`README.md`): it is what GitHub shows first and
 * what `pyproject.toml`'s `readme` field ships as the Registry description. The
 * Chinese edition is `README.zh-CN.md`.
 *
 * Three fragile properties this test pins down:
 *
 * 1. `scripts/release_version.py` reads both files **by name** and rewrites the
 *    release-status line in each. Swapping the languages between filenames
 *    without updating that script makes `--check` fail immediately (observed on
 *    2026-08-08, in both directions).
 * 2. Every local image and link target must resolve. A broken image is easy to
 *    miss locally and glaring on GitHub, and this is the project's front page.
 *    Retired screenshots live in `Preview/archive/` and must never be referenced.
 * 3. The two editions must agree on facts even though the prose differs.
 */
import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => readFileSync(join(repoRoot, name), "utf8");

const en = read("README.md");
const zh = read("README.zh-CN.md");

// Only two READMEs; a stray third edition would drift out of sync.
assert.ok(!existsSync(join(repoRoot, "README.en.md")), "English lives in README.md, not README.en.md");

// Language identity, so the two cannot be swapped by accident.
assert.ok(en.includes("**English** · [简体中文](README.zh-CN.md)"), "README.md must be the English edition");
assert.ok(zh.includes("[English](README.md) · **简体中文**"), "README.zh-CN.md must be the Chinese edition");
assert.ok(en.includes("Current status: **public beta, "), "English README needs the release-status line release_version.py rewrites");
assert.ok(zh.includes("当前状态：**公开测试版，"), "Chinese README needs the release-status line release_version.py rewrites");

// The release script must point at the same filenames.
const releaseScript = read("scripts/release_version.py");
assert.match(releaseScript, /README_EN = ROOT \/ "README\.md"/, "release_version.py must treat README.md as English");
assert.match(releaseScript, /README_ZH = ROOT \/ "README\.zh-CN\.md"/, "release_version.py must treat README.zh-CN.md as Chinese");

// Every local image and link target must exist.
for (const [name, source] of [["README.md", en], ["README.zh-CN.md", zh]]) {
  const targets = [...source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !target.startsWith("http") && !target.startsWith("#"));
  assert.ok(targets.length > 10, `${name} should reference local assets and docs`);
  for (const target of targets) {
    assert.ok(existsSync(join(repoRoot, target)), `${name} references a missing path: ${target}`);
  }
}

// Both editions must show the section covers the user assigned.
for (const cover of ["Preview/001.jpg", "Preview/002.jpg", "Preview/003.jpg", "Preview/004.jpg", "Preview/005.jpg", "Preview/006.jpg"]) {
  assert.ok(zh.includes(cover), `Chinese README must use ${cover}`);
  assert.ok(en.includes(cover), `English README must use ${cover}`);
}
for (const gif of ["Preview/FileRecovery.gif", "Preview/GroupConversion.gif", "Preview/GroupedMemory.gif"]) {
  assert.ok(zh.includes(gif), `Chinese README must use ${gif}`);
  assert.ok(en.includes(gif), `English README must use ${gif}`);
}

// Retired screenshots were archived, not deleted, on 2026-08-08 because the UI
// changed and they no longer match the product. Referencing them again would put
// stale interface images back on the front page.
for (const [name, source] of [["README.md", en], ["README.zh-CN.md", zh]]) {
  assert.ok(!/Preview\/a[0-9]/.test(source), `${name} references a retired screenshot (see Preview/archive/)`);
  assert.ok(!source.includes("Preview/archive/"), `${name} must not reference the archive directory`);
}
assert.ok(existsSync(join(repoRoot, "Preview/archive/README.md")), "the archive must explain why those assets were retired");

// The node's display name in ComfyUI's menu is the single source of truth. Both
// READMEs called it "Title2" long after the node was renamed, which sent users
// looking for a menu entry that does not exist.
const nodeDisplayName = read("__init__.py");
assert.match(nodeDisplayName, /"Workspace2Title": "WK Transparent Title"/, "node display name changed; update both READMEs");
assert.ok(!en.includes("Title2") && !zh.includes("标题2"), "the retired 'Title2' name must not return");
assert.ok(en.includes("### WK Transparent Title"), "English README needs the WK Transparent Title section");
assert.ok(zh.includes("### WK Transparent Title（透明标题）"), "Chinese README needs the WK Transparent Title section");

// Facts the content audit fixes in place (.dev-docs/README_CONTENT_AUDIT.md).
assert.ok(!zh.includes("复制模板名称"), "the removed 'copy template name' action must not return");
assert.ok(!en.includes("Copy template name"), "the removed 'copy template name' action must not return");
assert.ok(zh.includes("（存在时）"), "the compatible tab stays conditional in Chinese");
assert.ok(en.includes("when present"), "the compatible tab stays conditional in English");

// The Chinese product name changed from 「WK 工作区」 to 「WK 面板」. The old name
// must not survive anywhere user-facing, including the runtime sidebar strings.
const surfaces = {
  "README.md": zh,
  "README.en.md": en,
  "docs/BRANDING_AND_NAMING.zh-CN.md": read("docs/BRANDING_AND_NAMING.zh-CN.md"),
  "entry/locales/zh-CN.json": read("entry/locales/zh-CN.json"),
  "entry/locales/en-US.json": read("entry/locales/en-US.json"),
  "entry/core/fallback-strings.js": read("entry/core/fallback-strings.js"),
};
for (const [name, source] of Object.entries(surfaces)) {
  assert.ok(!source.includes("WK 工作区"), `${name} still uses the retired Chinese name`);
  assert.ok(!source.includes("WK Workspace"), `${name} still uses the retired English label`);
}
assert.ok(zh.includes("WK 面板"), "Chinese README must state the current Chinese product name");

// The locale files and the JS fallback must agree; a mismatch shows a different
// title before and after the locale loads.
const zhLocale = JSON.parse(surfaces["entry/locales/zh-CN.json"]);
const enLocale = JSON.parse(surfaces["entry/locales/en-US.json"]);
assert.equal(zhLocale["workspace.title"], "WK 面板");
assert.equal(zhLocale["app.title"], "WK 面板");
assert.equal(enLocale["workspace.title"], "WK Panel");
assert.ok(surfaces["entry/core/fallback-strings.js"].includes('"workspace.title": "WK 面板"'));
assert.ok(surfaces["entry/core/fallback-strings.js"].includes('"workspace.title": "WK Panel"'));

// GIF demos now ship, so the "GIF tutorials are still being prepared" limitation
// must not remain in either edition's known-limits section.
const zhLimits = zh.split("## 当前状态与已知限制")[1] || "";
const enLimits = en.split("## Current Status and Known Limits")[1] || "";
assert.ok(!zhLimits.includes("GIF"), "Chinese known-limits must not still promise GIF demos");
assert.ok(!/GIF/i.test(enLimits), "English known-limits must not still promise GIF demos");

console.log("README surface contract passed.");
