// Real Nodes 2.0 click-to-place acceptance for the WK Templates panel.
// The test restores the exact template-library snapshot and removes all graph
// nodes created after its initial graph snapshot.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.app?.graph, null, {
    timeout: 30_000,
    polling: 250,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let originalValue = false;
  let librarySnapshot = null;
  let nodeIdsBefore = [];
  try {
    const snapshotResponse = await page.request.get(`${BASE_URL}workspace2/templates/library`);
    if (!snapshotResponse.ok()) throw new Error(`Template-library snapshot failed: ${snapshotResponse.status()}`);
    librarySnapshot = (await snapshotResponse.json()).library;

    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    await page.waitForTimeout(1_000);

    await page.locator(".workspace2-tab-button").click();
    await page.locator(".workspace2-module-tab").nth(2).click();
    const row = page.locator(".workspace2-template-row").first();
    await row.waitFor({ state: "visible", timeout: 20_000 });
    const templateId = await row.getAttribute("data-workspace2-template-id");
    nodeIdsBefore = await page.evaluate(() => window.app.graph._nodes.map((node) => node.id));
    await row.click();

    const canvasBox = await page.locator("#graph-canvas[data-drop-target-for-element='true']").boundingBox();
    if (!canvasBox) throw new Error("Graph canvas box unavailable");
    await page.mouse.click(canvasBox.x + canvasBox.width - 170, canvasBox.y + canvasBox.height - 170);
    await page.waitForFunction((before) => window.app.graph._nodes.length > before.length, nodeIdsBefore, { timeout: 15_000 });
    const report = await page.evaluate(({ before, expectedTemplateId }) => {
      const added = window.app.graph._nodes.filter((node) => !before.includes(node.id));
      return {
        nodes2Enabled: window.app.extensionManager.setting.get("Comfy.VueNodes.Enabled"),
        expectedTemplateId,
        addedCount: added.length,
        addedTypes: added.map((node) => node.type),
      };
    }, { before: nodeIdsBefore, expectedTemplateId: templateId });
    if (!report.nodes2Enabled || !report.expectedTemplateId || report.addedCount < 1) {
      throw new Error(`Nodes 2.0 template placement mismatch: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (nodeIdsBefore.length) {
      await page.evaluate((before) => {
        for (const node of [...(window.app?.graph?._nodes || [])]) {
          if (!before.includes(node.id)) window.app.graph.remove(node);
        }
      }, nodeIdsBefore).catch(() => {});
    }
    if (librarySnapshot) {
      await page.request.post(`${BASE_URL}workspace2/templates/library`, { data: { library: librarySnapshot } }).catch(() => {});
    }
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalValue]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
