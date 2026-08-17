// Read-only smoke probe for the WorkspaceKit test package at http://127.0.0.1:8190/.
//
// PURPOSE
//   Confirm that on a real ComfyUI page:
//     1. window.app + extensionManager become ready.
//     2. WorkspaceKit's main extension "comfyui.workspace2" registers.
//     3. WorkspaceKit's Provider API globals are exposed.
//     4. WorkspaceKit's DOM style hooks land.
//   This is the minimum "the plugin is alive" signal for the test package.
//
// SAFETY
//   Read-only. No workflow / group / template / setting is mutated. The test
//   installs a route guard that fails fast if any POST goes to a mutation
//   endpoint (workflow, groups, templates, workspacekit, queue).
//
// USAGE
//   node scripts/e2e/smoke-workspacekit-sidebar.mjs
//   Requires the test package to already be running on port 8190.

import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:8190/';
const NAV_TIMEOUT_MS = 30_000;
const APP_READY_TIMEOUT_MS = 30_000;
const SETTLE_MS = 3_000;

const EXPECTED_EXT_NAMES = ['comfyui.workspace2', 'WorkspaceKit.ThemeLab'];
const EXPECTED_GLOBALS = [
  'WorkspaceKitPanelAPI',
  'WorkspaceKitPanelUITemplate',
];
const EXPECTED_STYLE_IDS = [
  'workspacekit-sidebar-icon-style',
];

function log(step, detail) {
  const stamp = new Date().toISOString();
  const line = detail === undefined ? `[${stamp}] ${step}` : `[${stamp}] ${step}: ${detail}`;
  console.log(line);
}

async function installReadOnlyGuard(page) {
  await page.route('**/*', (route) => {
    const req = route.request();
    const method = req.method();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      route.continue();
      return;
    }
    const path = new URL(req.url()).pathname.toLowerCase();
    const forbidden = [
      '/workflow', '/workflows',
      '/queue', '/prompt',
      '/group', '/groups',
      '/template', '/templates',
      '/workspacekit', '/workspace2'
    ];
    if (method === 'POST' && forbidden.some((n) => path.includes(n))) {
      // Fail loudly. Abort makes the caller see a NetworkError, and we exit non-zero.
      log('guard_tripped', `${method} ${req.url()}`);
      route.abort();
      return;
    }
    route.continue();
  });
}

async function verifyRecycleBinToolbarStates(page) {
  // This only changes transient panel state in the fresh headless browser
  // context. The route guard above rejects all WorkspaceKit data mutations.
  await page.locator('.workspace2-tab-button').click();
  await page.waitForSelector('.workspace2-button.is-trash-toggle', { timeout: 10_000 });

  async function verifyCurrentPanel(label) {
    const toggle = page.locator('.workspace2-button.is-trash-toggle');
    const before = await toggle.evaluate((element) => ({
      icon: element.querySelector('svg')?.dataset.workspacekitIcon,
      returnState: element.classList.contains('is-trash-return'),
    }));
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('.workspace2-button.is-trash-toggle svg')?.dataset.workspacekitIcon === 'arrowLeft', null, { timeout: 10_000 });
    const after = await toggle.evaluate((element) => ({
      icon: element.querySelector('svg')?.dataset.workspacekitIcon,
      returnState: element.classList.contains('is-trash-return'),
    }));
    if (before.icon !== 'trash' || before.returnState || after.icon !== 'arrowLeft' || !after.returnState) {
      throw new Error(`${label} recycle-bin icon state mismatch: ${JSON.stringify({ before, after })}`);
    }
    log('recycle_toolbar', `${label}: trash -> arrowLeft`);
  }

  await verifyCurrentPanel('workflows');
  // Core module order is a stable host contract (Workflows / Nodes / Templates)
  // while the visible label is localized. Do not hard-code the English word
  // "Templates" here or Chinese smoke runs produce a false regression.
  await page.locator('.workspace2-module-tab').nth(2).click();
  await page.waitForSelector('.workspace2-button.is-trash-toggle', { timeout: 10_000 });
  await verifyCurrentPanel('templates');
}

async function verifyCorePanelHostSlots(page) {
  const cases = [
    { index: 0, blueprint: 'workspace2-workflow-blueprint', label: 'workflows' },
    { index: 1, blueprint: 'workspace2-node-blueprint', label: 'nodes' },
    { index: 2, blueprint: 'workspace2-templates-blueprint', label: 'templates' },
  ];
  for (const item of cases) {
    await page.locator('.workspace2-module-tab').nth(item.index).click();
    const selector = `.workspace2-module-frame.${item.blueprint}`;
    await page.waitForSelector(selector, { timeout: 10_000 });
    const report = await page.locator(selector).evaluate((frame) => {
      const slot = (name) => frame.querySelector(name);
      const header = slot('.workspace2-module-header-host');
      const toolbar = slot('.workspace2-module-context-host');
      const controls = slot('.workspace2-module-controls-host');
      const content = slot('.workspace2-module-body');
      const status = slot('.workspace2-module-status-host');
      return {
        headerChildren: header?.childElementCount || 0,
        toolbarChildren: toolbar?.childElementCount || 0,
        controlsChildren: controls?.childElementCount || 0,
        contentChildren: content?.childElementCount || 0,
        statusText: status?.textContent?.trim() || '',
        legacyStatusDisplay: header ? getComputedStyle(header.querySelector('.workspace2-status')).display : '',
      };
    });
    if (report.headerChildren !== 1 || report.toolbarChildren !== 1 || report.controlsChildren < 1 || report.contentChildren !== 1 || !report.statusText || report.legacyStatusDisplay !== 'none') {
      throw new Error(`${item.label} shared-slot mismatch: ${JSON.stringify(report)}`);
    }
    log('shared_slots', `${item.label}: ${JSON.stringify(report)}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });

  const failures = [];

  try {
    await installReadOnlyGuard(page);
    log('navigate', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });

    await page.waitForSelector('canvas', { state: 'attached', timeout: 20_000 });
    log('canvas_ready');

    // Wait for window.app + extensionManager.
    const ready = await page.waitForFunction(() => {
      const a = window.app;
      if (!a) return null;
      if (!a.extensionManager) return null;
      if (!Array.isArray(a.extensions)) return null;
      return { extCount: a.extensions.length };
    }, null, { timeout: APP_READY_TIMEOUT_MS, polling: 500 });
    log('app_ready', JSON.stringify(await ready.jsonValue()));

    await page.waitForTimeout(SETTLE_MS);

    const report = await page.evaluate((cfg) => {
      const a = window.app;
      const names = a.extensions.map((e) => e && e.name).filter(Boolean);
      const found = {};
      for (const target of cfg.expectedExtNames) {
        found[target] = names.includes(target);
      }
      const globalsFound = {};
      for (const g of cfg.expectedGlobals) {
        globalsFound[g] = typeof window[g] !== 'undefined';
      }
      const styleFound = {};
      for (const sid of cfg.expectedStyleIds) {
        styleFound[sid] = document.getElementById(sid) !== null;
      }
      return {
        extCount: names.length,
        extFound: found,
        globalsFound,
        styleFound,
        rootSidebarMark: (() => {
          const wrapper = document.querySelector('.workspace2-tab-button .sidebar-icon-wrapper');
          if (!wrapper) return false;
          const pseudo = getComputedStyle(wrapper, '::before');
          return pseudo.content.includes('🧩')
            && pseudo.display === 'flex'
            && pseudo.opacity !== '0';
        })(),
        providers: typeof window.WorkspaceKitPanelAPI?.getProviders === 'function'
          ? window.WorkspaceKitPanelAPI.getProviders().map((provider) => ({
            id: provider.id,
            title: typeof provider.getTitle === 'function' ? provider.getTitle() : provider.title,
            tabLabel: provider.tabLabel,
            iconKey: provider.iconKey,
          }))
          : [],
      };
    }, { expectedExtNames: EXPECTED_EXT_NAMES, expectedGlobals: EXPECTED_GLOBALS, expectedStyleIds: EXPECTED_STYLE_IDS });

    log('report', JSON.stringify(report));

    for (const [k, v] of Object.entries(report.extFound)) if (!v) failures.push('missing extension: ' + k);
    for (const [k, v] of Object.entries(report.globalsFound)) if (!v) failures.push('missing global: ' + k);
    for (const [k, v] of Object.entries(report.styleFound)) if (!v) failures.push('missing style#' + k);
    if (!report.rootSidebarMark) failures.push('WorkspaceKit sidebar emoji mark is missing or hidden');

    try {
      await verifyRecycleBinToolbarStates(page);
    } catch (error) {
      failures.push(`recycle-bin toolbar verification failed: ${error.message || String(error)}`);
    }
    try {
      await verifyCorePanelHostSlots(page);
    } catch (error) {
      failures.push(`shared-slot verification failed: ${error.message || String(error)}`);
    }

    // Report console errors, but only fail on the ones that look tied to WorkspaceKit.
    const wkErrs = errs.filter((e) => /workspacekit|workspace2|WorkspaceKit/i.test(e));
    log('console_errors_total', String(errs.length));
    log('console_errors_workspacekit', String(wkErrs.length));
    for (const line of wkErrs.slice(0, 20)) log('  wk_err', line);
    if (wkErrs.length > 0) failures.push(`workspacekit-related console errors: ${wkErrs.length}`);

    if (failures.length === 0) {
      log('result', 'ok');
      process.exitCode = 0;
    } else {
      log('result', 'fail');
      for (const f of failures) log('  failure', f);
      process.exitCode = 1;
    }
  } catch (err) {
    log('result', 'fail');
    log('error', err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
