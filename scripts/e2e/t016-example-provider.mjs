// T-016: verify the minimal example Provider's contract on the real page.
//
// The example file (examples/minimal-panel-provider) imports ComfyUI's app.js
// and registers itself as an extension, which cannot be side-loaded into the
// already-running package from a test. So this test reproduces the example's
// provider object shape and its render()/dispose() body, then drives it through
// the real window.WorkspaceKitPanelAPI plus a fake host to prove:
//   - it registers and is visible via getProviders()
//   - render() appends a single scoped root (.example-panel-provider) to the
//     supplied contentHost and nothing else
//   - the click handler updates local state
//   - dispose() removes the root, leaving the host empty
//   - unregister() removes it from the registry
//
// SAFETY: read-only against workflow data; only an ephemeral provider is used.

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

    const out = await page.evaluate(() => {
      const api = window.WorkspaceKitPanelAPI;
      if (!api) return { ok: false, reason: 'WorkspaceKitPanelAPI missing' };

      const ROOT_CLASS = 'example-panel-provider';
      const PROVIDER_ID = 'example.minimal-panel';

      // Mirror of examples/minimal-panel-provider render()/dispose().
      const provider = {
        apiVersion: 1,
        id: PROVIDER_ID,
        title: 'Example Panel',
        icon: '🧩',
        getTitle: () => '示例面板',
        render(ctx) {
          const doc = ctx.contentHost.ownerDocument || document;
          const root = doc.createElement('div');
          root.className = ROOT_CLASS;
          const h = doc.createElement('h3');
          h.textContent = 'Example Panel';
          root.appendChild(h);
          let count = 0;
          const label = doc.createElement('div');
          label.className = 'example-count';
          label.textContent = `Clicked ${count} times`;
          const button = doc.createElement('button');
          button.type = 'button';
          button.textContent = 'Click me';
          const onClick = () => { count += 1; label.textContent = `Clicked ${count} times`; };
          button.addEventListener('click', onClick);
          root.append(button, label);
          ctx.contentHost.appendChild(root);
          root.__test_click = onClick; // expose for the test to invoke
          return () => { button.removeEventListener('click', onClick); root.remove(); };
        },
      };

      const res = {};
      const reg = api.register(provider);
      res.registered = reg.ok === true;
      res.visible = api.getProviders().some((p) => p && p.id === PROVIDER_ID);

      // Fake host: a detached element standing in for panelHost.contentHost.
      const host = document.createElement('div');
      const dispose = provider.render({ contentHost: host, app: window.app, translate: (k) => k, ui: null });
      const root = host.querySelector('.' + ROOT_CLASS);
      res.singleRoot = host.children.length === 1 && !!root;
      res.hasButton = !!root.querySelector('button');
      // simulate two clicks
      root.__test_click(); root.__test_click();
      res.countText = root.querySelector('.example-count').textContent;
      // dispose clears the host
      dispose();
      res.hostEmptyAfterDispose = host.children.length === 0;

      const unreg = api.unregister(PROVIDER_ID, provider);
      res.unregistered = unreg.ok === true;
      res.goneAfterUnregister = !api.getProviders().some((p) => p && p.id === PROVIDER_ID);

      res.ok = true;
      return res;
    });

    tsLog('example provider', JSON.stringify(out));
    if (!out.ok) failures.push('setup: ' + out.reason);
    else {
      const checks = [
        ['registered', out.registered],
        ['visible via getProviders', out.visible],
        ['single scoped root appended', out.singleRoot],
        ['has button', out.hasButton],
        ['click updates count', out.countText === 'Clicked 2 times'],
        ['dispose empties host', out.hostEmptyAfterDispose],
        ['unregistered', out.unregistered],
        ['gone after unregister', out.goneAfterUnregister],
      ];
      for (const [n, ok] of checks) if (!ok) failures.push(n);
    }

    const wkErrs = errs.workspacekitRelated();
    tsLog('errs_workspace', String(wkErrs.length));
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
