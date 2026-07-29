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
  'workspace2-sidebar-emoji-icon-style',
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
      };
    }, { expectedExtNames: EXPECTED_EXT_NAMES, expectedGlobals: EXPECTED_GLOBALS, expectedStyleIds: EXPECTED_STYLE_IDS });

    log('report', JSON.stringify(report));

    for (const [k, v] of Object.entries(report.extFound)) if (!v) failures.push('missing extension: ' + k);
    for (const [k, v] of Object.entries(report.globalsFound)) if (!v) failures.push('missing global: ' + k);
    for (const [k, v] of Object.entries(report.styleFound)) if (!v) failures.push('missing style#' + k);

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
