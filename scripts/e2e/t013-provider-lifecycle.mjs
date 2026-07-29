// T-013 (Panel UI Template Batch 2): real-page Provider lifecycle acceptance.
//
// Verifies the public WorkspaceKitPanelAPI on the running test package:
//   - register() exposes a provider through getProviders()
//   - subscribe() fires "registered" / "unregistered" events
//   - unregister() removes it (no duplicate/leftover entry)
//   - setProvidersEnabled(false) hides providers from getProviders() but
//     keeps them registered (deferred), and re-enabling restores them
//   - a second register() of the same id is idempotent (no duplicate)
//
// This exercises the Provider registry contract that the sidebar host reads,
// which is the deterministic half of Batch 2. Pure visual placement stays a
// manual/visual item.
//
// SAFETY: read-only against workflow data. It only registers and unregisters
// an ephemeral fake provider on window.WorkspaceKitPanelAPI; nothing is saved.

import { chromium } from 'playwright';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady,
} from './lib/wk-runtime.mjs';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errs = attachErrorCollector(page);
  const failures = [];

  try {
    await installReadOnlyGuard(page);
    tsLog('navigate', BASE_URL_DEFAULT);
    await page.goto(BASE_URL_DEFAULT, { waitUntil: 'load', timeout: 30_000 });
    await waitForWorkspaceKitReady(page);
    tsLog('ready');

    const result = await page.evaluate(() => {
      const api = window.WorkspaceKitPanelAPI;
      if (!api) return { ok: false, reason: 'WorkspaceKitPanelAPI missing' };

      const events = [];
      const unsub = api.subscribe((e) => events.push(e.type + ':' + (e.id || '')));
      const has = (id) => api.getProviders().some((p) => p && p.id === id);

      const ID = '__t013_fake_provider__';
      let renderCalls = 0;
      let disposeCalls = 0;
      const provider = {
        apiVersion: 1,
        id: ID,
        label: 'T013 Fake',
        render() { renderCalls += 1; return () => { disposeCalls += 1; }; },
      };

      const out = {};

      // 1. register
      const reg = api.register(provider);
      out.registerOk = reg.ok === true && reg.code === 'registered';
      out.visibleAfterRegister = has(ID);

      // 2. idempotent re-register (same object) -> already-registered, no duplicate
      const reg2 = api.register(provider);
      out.reRegisterAlready = reg2.code === 'already-registered';
      out.noDuplicate = api.getProviders().filter((p) => p && p.id === ID).length === 1;

      // 3. duplicate id with a different object -> rejected
      const regDup = api.register({ apiVersion: 1, id: ID, render() {} });
      out.duplicateRejected = regDup.ok === false && regDup.code === 'duplicate-id';

      // 4. disable integrations -> provider hidden from getProviders but retained
      api.setProvidersEnabled(false);
      out.hiddenWhenDisabled = !has(ID);
      // re-registering while disabled reports deferred-disabled
      // (unregister first so we can observe the deferred path cleanly)

      // 5. re-enable -> provider visible again (still registered, not lost)
      api.setProvidersEnabled(true);
      out.visibleWhenReEnabled = has(ID);

      // 6. unregister -> gone, event fired
      const unreg = api.unregister(ID, provider);
      out.unregisterOk = unreg.ok === true && unreg.code === 'unregistered';
      out.goneAfterUnregister = !has(ID);

      // 7. unregister again -> not-found (no crash, no duplicate removal)
      const unreg2 = api.unregister(ID);
      out.secondUnregisterNotFound = unreg2.code === 'not-found';

      unsub();
      out.events = events;
      out.renderCalls = renderCalls;   // registry alone does not call render()
      out.disposeCalls = disposeCalls;
      out.ok = true;
      return out;
    });

    tsLog('lifecycle', JSON.stringify(result));
    if (!result.ok) { failures.push('setup: ' + result.reason); }
    else {
      const checks = [
        ['register ok', result.registerOk],
        ['visible after register', result.visibleAfterRegister],
        ['re-register idempotent', result.reRegisterAlready],
        ['no duplicate entry', result.noDuplicate],
        ['duplicate id rejected', result.duplicateRejected],
        ['hidden when integrations disabled', result.hiddenWhenDisabled],
        ['visible when re-enabled (not lost)', result.visibleWhenReEnabled],
        ['unregister ok', result.unregisterOk],
        ['gone after unregister', result.goneAfterUnregister],
        ['second unregister -> not-found', result.secondUnregisterNotFound],
        ['registered + unregistered events fired', Array.isArray(result.events)
          && result.events.some((e) => e.startsWith('registered:'))
          && result.events.some((e) => e.startsWith('unregistered:'))],
        ['availability-changed events fired', Array.isArray(result.events)
          && result.events.filter((e) => e.startsWith('availability-changed')).length >= 2],
      ];
      for (const [n, ok] of checks) if (!ok) failures.push(n);
    }

    const wkErrs = errs.workspacekitRelated();
    tsLog('errs_workspace', String(wkErrs.length));
    for (const e of wkErrs.slice(0, 8)) tsLog('  wk_err', e);
    if (wkErrs.length) failures.push('workspacekit console errors: ' + wkErrs.length);

    if (!failures.length) { tsLog('result', 'ok'); process.exitCode = 0; }
    else { tsLog('result', 'fail'); failures.forEach((f) => tsLog('  failure', f)); process.exitCode = 1; }
  } catch (err) {
    tsLog('result', 'fail');
    tsLog('error', err && err.stack ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
