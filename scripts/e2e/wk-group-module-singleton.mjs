import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto("http://127.0.0.1:8190/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups && window.app?.rootGraph), null, {
    timeout: 55_000, polling: 250,
  });
  const observation = await page.evaluate(async () => {
    const canonical = await import("/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260922_group_refresh_recovery_r1");
    const bare = await import("/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js");
    return {
      sameModuleInstance: canonical.workspace2CanvasGroups === bare.workspace2CanvasGroups,
      globalMatchesCanonical: window.Workspace2CanvasGroups === canonical.workspace2CanvasGroups,
      globalMatchesBare: window.Workspace2CanvasGroups === bare.workspace2CanvasGroups,
      canonicalInitialized: canonical.workspace2CanvasGroups.initialized,
      bareInitialized: bare.workspace2CanvasGroups.initialized,
    };
  });
  console.log(JSON.stringify(observation, null, 2));
  assert.equal(observation.sameModuleInstance, true, "versioned and unversioned module imports must share one manager");
  assert.equal(observation.globalMatchesCanonical, true);
  assert.equal(observation.globalMatchesBare, true);
  console.log("Group module singleton real-page regression passed.");
} finally {
  await browser.close();
}
