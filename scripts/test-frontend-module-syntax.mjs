/**
 * Parse every shipped frontend file with the **module** goal.
 *
 * `node --check some-file.js` uses the *script* parse goal. That goal accepted a
 * real, page-breaking syntax error on 2026-08-07: a backtick inside a CSS comment
 * nested in a JS template literal ended the string early, and the file still
 * passed `node --check entry/entry.js`. The browser loads these files as ES
 * modules and rejected it with `SyntaxError: Unexpected identifier 'color'`,
 * which took the whole extension down — the sidebar entry disappeared entirely.
 *
 * No other contract test can catch this: the others import the small pure
 * modules and never `entry.js`, because importing it requires a browser. This
 * check needs no browser — it only parses.
 */
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const entryRoot = join(repoRoot, "entry");

// A vendored third-party bundle is not ours to fix, and its version is pinned
// deliberately. See THIRD_PARTY_NOTICES.md.
const SKIP_FILES = new Set(["pinyin-pro.esm.js"]);

function collect(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = join(dir, item.name);
    if (item.isDirectory()) return collect(full);
    if (extname(item.name) !== ".js" || SKIP_FILES.has(item.name)) return [];
    return [full];
  });
}

const files = collect(entryRoot);
if (files.length < 20) {
  throw new Error(`Expected the frontend sources under entry/; found only ${files.length}.`);
}

const failures = [];
for (const file of files) {
  // `--input-type=module` forces the module goal regardless of the .js
  // extension, which is how the browser actually loads these files.
  const result = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
    input: readFileSync(file, "utf8"),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const detail = (result.stderr || "").split("\n").filter(Boolean).slice(0, 6).join("\n");
    failures.push(`${relative(repoRoot, file)}\n${detail}`);
  }
}

if (failures.length) {
  throw new Error(`Module-goal parse failed for ${failures.length} file(s):\n\n${failures.join("\n\n")}`);
}

// Guard the specific mistake as well as the general one. A backtick inside the
// CSS of a styled template literal is what broke the page; prose belongs in JS
// comments above the string, where a backtick is harmless.
const entrySource = readFileSync(join(entryRoot, "entry.js"), "utf8");
const sidebarRule = entrySource.slice(entrySource.indexOf(".workspace2-tab-button .sidebar-icon-wrapper::before"));
const sidebarBody = sidebarRule.slice(0, sidebarRule.indexOf("`"));
if (sidebarBody.includes("/*")) {
  throw new Error("Keep CSS comments out of the sidebar-icon template literal; a backtick there ends the string.");
}

console.log(`Frontend module-goal syntax contract passed: ${files.length} files.`);
