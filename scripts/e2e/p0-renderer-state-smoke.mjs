// Read-only renderer-state smoke: confirms WK initializes in the requested renderer state.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";
const expected = process.argv.includes("--nodes2") ? true : false;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
      timeout: 15_000,
      polling: 250,
    });
    const report = await page.evaluate((settingId) => ({
      nodes2Enabled: Boolean(window.app.extensionManager.setting.get(settingId)),
      graphCanvas: Boolean(document.querySelector('#graph-canvas[data-drop-target-for-element="true"]')),
      wkGroupOverlay: Boolean(window.Workspace2CanvasGroups?.overlay?.isConnected),
      wkSidebarEntry: Boolean(document.querySelector('.workspace2-tab-button')),
      vueNodeCount: document.querySelectorAll('.lg-node').length,
    }), NODES2_SETTING);
    if (report.nodes2Enabled !== expected || !report.graphCanvas || !report.wkGroupOverlay || !report.wkSidebarEntry) {
      throw new Error(`Renderer state mismatch: ${JSON.stringify({ expected, report })}`);
    }
    console.log(JSON.stringify({ expected, report }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
