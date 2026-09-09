// Real-page regression: rapid WorkspaceKit Open-row clicks must settle on the
// last target. All server-side workflow mutations are blocked.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import {
  attachErrorCollector,
  installReadOnlyGuard,
  waitForWorkspaceKitReady,
} from "./lib/wk-runtime.mjs";

const BASE_URL = "http://127.0.0.1:8190/";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = attachErrorCollector(page);

try {
  await installReadOnlyGuard(page);
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
  await waitForWorkspaceKitReady(page);

  // Populate several real, persisted tabs without writing any workflow data.
  const prepared = await page.evaluate(async () => {
    const app = window.app;
    const store = app?.extensionManager?.workflow;
    await store?.syncWorkflows?.();
    const targets = (store?.workflows || [])
      .filter((workflow) => workflow && typeof workflow.path === "string" && workflow.path.startsWith("workflows/"))
      .slice(0, 5);
    for (const workflow of targets) {
      const loadFromRemote = !workflow.isLoaded;
      const loaded = workflow.isLoaded ? workflow : await workflow.load();
      await app.loadGraphData(loaded.activeState, true, true, workflow, {
        checkForRerouteMigration: false,
        deferWarnings: true,
        skipAssetScans: !loadFromRemote,
      });
    }
    return targets.map((workflow) => workflow.path);
  });
  assert.ok(prepared.length >= 3, "8190 did not expose enough persisted workflows for switch acceptance.");

  await page.locator(".workspace2-tab-button").first().click();
  await page.locator('[data-workspace2-module-id="workflows"]').first().click();
  await page.waitForSelector(".workspace2-current-workflow-info", { timeout: 20_000 });

  const titles = await page.locator(".workspace2-current-workflow-info")
    .evaluateAll((items) => items.map((item) => item.getAttribute("title")).filter(Boolean));
  const targetIndexes = titles
    .map((path, index) => ({ path, index }))
    .filter(({ path }) => path !== "Unsaved Workflow.json")
    .slice(0, 3);
  const targets = targetIndexes.map(({ path }) => path);
  assert.equal(targets.length, 3, `Expected three open persisted rows, got ${JSON.stringify(titles)}`);

  // Do not await each click's workflow transaction: this is the user-facing
  // rapid-switch case that previously allowed slower, older loads to win.
  for (const { index } of targetIndexes) {
    await page.locator(".workspace2-current-workflow-info").nth(index).click({ timeout: 10_000 });
  }

  const lastPath = `workflows/${targets.at(-1)}`;
  await page.waitForFunction((expectedPath) => window.app?.extensionManager?.workflow?.activeWorkflow?.path === expectedPath, lastPath, {
    timeout: 20_000,
  });
  assert.equal(await page.evaluate(() => window.app.extensionManager.workflow.activeWorkflow?.path), lastPath);
  assert.deepEqual(
    errors.all().filter((message) => /Cannot read properties of undefined \(reading ['"]path['"]\)/i.test(message)),
    [],
  );
  console.log(JSON.stringify({ targets, activePath: lastPath }, null, 2));
} finally {
  await browser.close();
}
