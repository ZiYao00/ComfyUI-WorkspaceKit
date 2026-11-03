import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// This acceptance test is deliberately locked to the isolated test package.
const BASE_URL = "http://127.0.0.1:8191";
const prefix = `__WK_TEST__/open-save-${Date.now()}`;
const paths = [`${prefix}-A.json`, `${prefix}-B.json`];
const artifactDir = new URL(`../../artifacts/${prefix.split("/").at(-1)}/`, import.meta.url);
await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const report = { baseUrl: BASE_URL, paths, stages: [], errors: [] };
let rootVerified = false;
page.on("pageerror", (error) => report.errors.push(error.message));
const empty = { nodes: [], links: [], groups: [], extra: {}, config: {}, version: 0.4, last_node_id: 0, last_link_id: 0 };

async function post(path, body) {
  return page.evaluate(async ({ path, body }) => {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok || data.ok === false) throw new Error(data.error || String(r.status));
    return data;
  }, { path, body });
}
const row = (path) => page.locator(".workspace2-current-workflow").filter({ has: page.locator(`.workspace2-current-workflow-info[title="${path}"]`) });
async function capture(label) {
  const state = await page.evaluate(() => {
    const s = window.app.extensionManager.workflow;
    const C = window.comfyAPI.changeTracker.ChangeTracker;
    return {
      active: s.activeWorkflow?.path,
      workflows: s.openWorkflows.filter(Boolean).map(w => ({ path: w.path, modified: w.isModified, temporary: w.isTemporary, equal: w.initialState && w.activeState ? C.graphEqual(w.initialState, w.activeState) : null, extraChangedKeys: [...new Set([...Object.keys(w.initialState?.extra || {}), ...Object.keys(w.activeState?.extra || {})])].filter(k => JSON.stringify(w.initialState?.extra?.[k]) !== JSON.stringify(w.activeState?.extra?.[k])) })),
      rows: [...document.querySelectorAll(".workspace2-current-workflow")].map(r => ({ path: r.querySelector(".workspace2-current-workflow-info")?.title, dirty: !!r.querySelector(".workspace2-current-workflow-dirty-dot"), saves: r.querySelectorAll('[data-workspace2-action="save-workflow"]').length })),
      topbarDisabled: document.querySelector(".workspacekit-topbar-save-button")?.disabled,
    };
  });
  report.stages.push({ label, ...state });
  console.log(label, JSON.stringify(state));
  return state;
}
async function open(path) {
  const browse = page.locator(`[data-workspace2-item-path="${path}"]`);
  await browse.click();
  await page.waitForFunction(p => window.app.extensionManager.workflow.activeWorkflow?.path === `workflows/${p}`, path);
  await row(path).waitFor();
}
async function edit(title) {
  await page.evaluate(title => {
    const app = window.app, tracker = app.extensionManager.workflow.activeWorkflow.changeTracker;
    tracker.beforeChange();
    let node = app.graph._nodes[0];
    if (!node) { node = window.LiteGraph.createNode("Workspace2Title"); app.graph.add(node); }
    node.properties.text = title;
    tracker.afterChange();
  }, title);
}
async function waitClean(path) {
  await page.waitForFunction(p => {
    const r = [...document.querySelectorAll('.workspace2-current-workflow')].find(r => r.querySelector('.workspace2-current-workflow-info')?.title === p);
    return r && !r.querySelector('.workspace2-current-workflow-dirty-dot');
  }, path, { timeout: 10000 });
}

try {
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction(() => !!window.app?.extensionManager?.workflow, null, { timeout: 60000 });
  report.system = await page.evaluate(async () => (await (await fetch('/system_stats')).json()).system);
  const roots = await page.evaluate(async () => await (await fetch('/workspace2/workflows')).json());
  report.workflowRoot = roots.root;
  assert.match(roots.root.replaceAll('\\', '/'), /^G:\/AIGC\/ComfyUI_test\/_wk_validation\/[^/]+\/user\/default\/workflows$/i, 'Refuse shared or production workflow storage before creating any fixture');
  rootVerified = true;
  for (const path of paths) await post("/workspace2/workflow/save", { path, workflow: empty });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => !!window.app?.extensionManager?.workflow, null, { timeout: 60000 });
  await page.locator('[aria-label="WorkspaceKit"]').first().click();
  await page.locator('[data-workspace2-module-id="workflows"]').click();
  const folder = page.locator('[data-workspace2-item-path="__WK_TEST__"] .workspace2-disclosure');
  if (await folder.count() && !(await folder.getAttribute("class")).includes("is-open")) await folder.click();
  await open(paths[0]);
  await page.waitForTimeout(1200);
  await capture("first-open-A");
  await open(paths[1]);
  await page.waitForTimeout(1200);
  await capture("first-open-B");
  if (process.argv.includes("--probe")) {
    await page.screenshot({ path: new URL("probe.png", artifactDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true });
  } else {
    await waitClean(paths[0]);
    await waitClean(paths[1]);
    await open(paths[0]);
    await waitClean(paths[0]);
    await open(paths[1]);
    await waitClean(paths[1]);
    // A stale boolean with equal snapshots must not enable either Save surface.
    await page.evaluate(() => { window.app.extensionManager.workflow.activeWorkflow.isModified = true; });
    await waitClean(paths[1]);
    assert.equal(await page.locator('.workspacekit-topbar-save-button').isEnabled(), false);
    await edit("B-edited");
    await row(paths[1]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    await open(paths[0]);
    await edit("A-edited");
    await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    await capture("both-dirty");
    await page.screenshot({ path: new URL("both-dirty.png", artifactDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true });
    const saveB = row(paths[1]).locator('[data-workspace2-action="save-workflow"]');
    await page.route('**/api/userdata/**', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, body: 'background-save-failure' }) : route.continue());
    await saveB.click();
    await page.waitForTimeout(500);
    assert.equal(await row(paths[1]).locator('.workspace2-current-workflow-dirty-dot').count(), 1);
    await page.unroute('**/api/userdata/**');
    await saveB.click();
    await waitClean(paths[1]);
    assert.equal(await page.evaluate(() => window.app.extensionManager.workflow.activeWorkflow.path), `workflows/${paths[0]}`);
    assert.equal(await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').count(), 1);
    const diskB = await page.evaluate(async p => (await (await fetch(`/workspace2/workflow/read?path=${encodeURIComponent(p)}`)).json()).workflow, paths[1]);
    assert.equal(diskB.nodes[0].properties.text, "B-edited");
    await page.locator('.workspacekit-topbar-save-button').click();
    await waitClean(paths[0]);
    await edit("A-second-edit");
    await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    await page.evaluate(() => window.app.extensionManager.workflow.activeWorkflow.changeTracker.undo());
    await waitClean(paths[0]);
    await page.evaluate(() => window.app.extensionManager.workflow.activeWorkflow.changeTracker.redo());
    await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    await capture("undo-redo");
    // Failed persistence must keep the unsaved content and both Save controls.
    await page.route('**/api/userdata/**', route => route.request().method() === 'POST' ? route.fulfill({ status: 500, body: 'injected-save-failure' }) : route.continue());
    await page.locator('.workspacekit-topbar-save-button').click();
    await page.waitForTimeout(500);
    assert.equal(await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').count(), 1);
    await page.unroute('**/api/userdata/**');
    await page.locator('.workspacekit-topbar-save-button').click();
    await waitClean(paths[0]);
    // The pending write holds the first edit; a second edit must remain unsaved.
    await edit("A-before-slow-save");
    await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    let releaseSave;
    const hold = new Promise(resolve => { releaseSave = resolve; });
    let requestStarted;
    const started = new Promise(resolve => { requestStarted = resolve; });
    await page.route('**/api/userdata/**', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      requestStarted();
      await hold;
      return route.continue();
    });
    await page.locator('.workspacekit-topbar-save-button').click();
    await started;
    await edit("A-during-slow-save");
    releaseSave();
    await page.waitForFunction(() => document.querySelector('.workspacekit-topbar-save-button')?.dataset.busy === 'false');
    assert.equal(await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').count(), 1);
    assert.equal(await page.locator('.workspacekit-topbar-save-button').isEnabled(), true);
    await page.unroute('**/api/userdata/**');
    const diskA = await page.evaluate(async p => (await (await fetch(`/workspace2/workflow/read?path=${encodeURIComponent(p)}`)).json()).workflow, paths[0]);
    assert.equal(diskA.nodes[0].properties.text, "A-before-slow-save");
    await capture("edit-during-save-still-dirty");
    await page.locator('.workspacekit-topbar-save-button').click();
    await waitClean(paths[0]);
    await capture("edit-during-save-preserved");
    // Background first Save uses the native naming prompt. Cancel is read-only.
    const temporary = row("Unsaved Workflow.json");
    if (await temporary.count()) {
      await temporary.locator('[data-workspace2-action="save-workflow"]').click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await temporary.locator('[data-workspace2-action="save-workflow"]').count(), 1);
      assert.equal(await page.evaluate(() => window.app.extensionManager.workflow.activeWorkflow.path), `workflows/${paths[0]}`);
    }
    // The toolbar action creates a persisted workflow in the selected folder.
    const folderRow = page.locator('[data-workspace2-item-path="__WK_TEST__"]');
    await folderRow.click();
    const create = page.locator('.workspace2-workflow-blueprint').getByRole('button', { name: /^(新建工作流|New Workflow)$/i });
    await create.click();
    await page.waitForFunction(p => window.app.extensionManager.workflow.activeWorkflow?.path?.startsWith(`workflows/${p}/New Workflow`), '__WK_TEST__');
    const created = await page.evaluate(() => ({ path: window.app.extensionManager.workflow.activeWorkflow.path, persisted: window.app.extensionManager.workflow.activeWorkflow.isPersisted }));
    report.created = created;
    assert.equal(created.persisted, true);
    await waitClean(created.path.replace(/^workflows\//, ''));
    await capture('new-workflow-created');
    // Reopen A through its Open row; the folder may now be collapsed.
    await row(paths[0]).locator('.workspace2-current-workflow-info').click();
    await page.waitForFunction(p => window.app.extensionManager.workflow.activeWorkflow?.path === `workflows/${p}`, paths[0]);
    // A local integer/text queue verifies the existing execution-only policy;
    // it requires no model, cloud request, image generation or paid service.
    await page.evaluate(() => {
      const app = window.app, tracker = app.extensionManager.workflow.activeWorkflow.changeTracker;
      const generator = window.LiteGraph.createNode('WKIntegerGenerator');
      const text = window.LiteGraph.createNode('ShowText|pysssss');
      if (!generator || !text) throw new Error('Local queue regression nodes are unavailable');
      generator.widgets.find(w => w.name === 'value').value = 0;
      generator.widgets.find(w => w.name === 'control_before_generate').value = 'increment';
      tracker.beforeChange();
      app.graph.add(generator); app.graph.add(text); generator.connect(1, text, 0);
      tracker.afterChange();
    });
    await row(paths[0]).locator('.workspace2-current-workflow-dirty-dot').waitFor();
    await page.locator('.workspacekit-topbar-save-button').click();
    await waitClean(paths[0]);
    const prompt = page.waitForRequest(r => new URL(r.url()).pathname.endsWith('/prompt') && r.method() === 'POST');
    await page.evaluate(() => window.app.queuePrompt(0));
    const promptBody = (await prompt).postDataJSON();
    assert.equal(Object.values(promptBody.prompt).find(n => n.class_type === 'WKIntegerGenerator').inputs.value, 1);
    await page.waitForTimeout(500);
    await capture('after-local-queue');
    await waitClean(paths[0]);
    assert.equal(await page.locator('.workspacekit-topbar-save-button').isEnabled(), false);
    await capture('local-queue-remains-clean');
    const secondPrompt = page.waitForRequest(r => new URL(r.url()).pathname.endsWith('/prompt') && r.method() === 'POST');
    await page.evaluate(() => window.app.queuePrompt(0));
    assert.equal(Object.values((await secondPrompt).postDataJSON().prompt).find(n => n.class_type === 'WKIntegerGenerator').inputs.value, 2);
    await page.waitForTimeout(500);
    await waitClean(paths[0]);
    assert.equal(await page.locator('.workspacekit-topbar-save-button').isEnabled(), false);
    await capture('repeated-local-queue-remains-clean');
    await capture("saved");
    assert.deepEqual(report.errors, [], "unexpected page exceptions");
    await page.screenshot({ path: new URL("passed.png", artifactDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true });
    console.log("Workflow Open/save acceptance passed");
  }
} finally {
  await page.screenshot({ path: new URL("last-state.png", artifactDir).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true }).catch(() => {});
  await writeFile(new URL("last-dom.txt", artifactDir), await page.locator('body').innerText().catch(() => ""));
  report.cleanup = [];
  for (const path of rootVerified ? [...paths, ...(report.created ? [report.created.path.replace(/^workflows\//, '')] : [])] : []) {
    try {
      const moved = await post('/workspace2/trash/move', { path });
      report.cleanup.push({ path, trashId: moved.item?.id });
    } catch (error) {
      report.cleanup.push({ path, error: error.message });
    }
  }
  await writeFile(new URL("report.json", artifactDir), JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
