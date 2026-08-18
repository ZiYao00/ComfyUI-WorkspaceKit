// Real Nodes 2.0 click-to-place acceptance for the WK Nodes panel.
// Uses an isolated browser profile and removes the disposable graph node.
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
  let insertedNodeId = null;
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    await page.waitForTimeout(1_000);

    await page.locator(".workspace2-tab-button").click();
    await page.locator(".workspace2-module-tab").nth(1).click();
    const row = page.locator(".workspace2-node-row:not([data-workspace2-favorite-region])").first();
    await row.waitFor({ state: "visible", timeout: 20_000 });
    const before = await page.evaluate(() => window.app.graph._nodes.length);
    const nodeType = await row.getAttribute("data-workspace2-node-type");
    await row.click();

    // Nodes 2.0 retains an auxiliary pointer-events-none canvas.  The actual
    // graph surface is explicitly marked by the ComfyUI frontend.
    const canvasBox = await page.locator("#graph-canvas[data-drop-target-for-element='true']").boundingBox();
    if (!canvasBox) throw new Error("Canvas box unavailable");
    await page.mouse.click(canvasBox.x + canvasBox.width - 140, canvasBox.y + canvasBox.height - 140);
    await page.waitForFunction((count) => window.app.graph._nodes.length === count + 1, before, { timeout: 10_000 });
    const report = await page.evaluate(({ count, expectedType }) => {
      const nodes = window.app.graph._nodes;
      const inserted = nodes[nodes.length - 1];
      return {
        nodes2Enabled: window.app.extensionManager.setting.get("Comfy.VueNodes.Enabled"),
        before: count,
        after: nodes.length,
        expectedType,
        inserted: { id: inserted?.id, type: inserted?.type, pos: inserted?.pos },
      };
    }, { count: before, expectedType: nodeType });
    insertedNodeId = report.inserted.id;
    if (!report.nodes2Enabled || report.inserted.type !== nodeType) {
      throw new Error(`Nodes 2.0 panel placement mismatch: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (insertedNodeId !== null) {
      await page.evaluate((nodeId) => {
        const node = window.app?.graph?.getNodeById?.(nodeId);
        if (node) window.app.graph.remove(node);
      }, insertedNodeId).catch(() => {});
    }
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalValue]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
