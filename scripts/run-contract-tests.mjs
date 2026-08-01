/**
 * Run every standalone JavaScript contract test in a deterministic order.
 *
 * Keep this dependency-free: GitHub CI and a local contributor checkout can
 * verify the plugin's static contracts without installing Playwright or
 * starting a ComfyUI server. Browser acceptance tests remain opt-in under
 * `npm run e2e`.
 */
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(scriptsDir)
  .filter((name) => /^test-.+\.mjs$/.test(name))
  .sort();

if (!tests.length) throw new Error("No JavaScript contract tests were found.");

for (const test of tests) {
  process.stdout.write(`\n[contracts] ${test}\n`);
  const result = spawnSync(process.execPath, [join(scriptsDir, test)], {
    cwd: dirname(scriptsDir),
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nJavaScript contract tests passed: ${tests.length}`);
