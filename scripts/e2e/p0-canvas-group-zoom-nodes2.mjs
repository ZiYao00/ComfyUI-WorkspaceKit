// Nodes 2.0 real-wheel acceptance: WK group overlay remains aligned on zoom.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
    timeout: 30_000,
    polling: 250,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let originalValue = false;
  let fixture = null;
  try {
    // ComfyUI-Manager keeps background registry requests alive after the app is usable.
    // `load` can therefore make an otherwise valid canvas acceptance test wait indefinitely.
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      const first = window.LiteGraph.createNode("GetNode");
      const second = window.LiteGraph.createNode("GetNode");
      first.title = "WK Nodes2 Zoom A";
      second.title = "WK Nodes2 Zoom B";
      first.pos = [220, 180];
      second.pos = [500, 300];
      app.graph.add(first);
      app.graph.add(second);
      // Vue nodes mount their measured body after graph.add().  A group must be
      // created from stable visual bounds, not the first intermediate layout.
      let stableFrames = 0;
      let previous = '';
      for (let frame = 0; frame < 30 && stableFrames < 2; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const measured = [first, second].map((node) => groups.nodeVisualBounds(node));
        const signature = JSON.stringify(measured);
        stableFrames = signature === previous ? stableFrames + 1 : 0;
        previous = signature;
      }
      if (stableFrames < 2) throw new Error('Nodes 2.0 visual bounds did not stabilize before group creation');
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id));
      if (!groupId) throw new Error("Fixture group creation failed");
      return { groupId, nodeIds: [first.id, second.id] };
    });
    const header = page.locator(`#xzg-group-overlay [data-group-id='${fixture.groupId}'] .xzg-group-header`);
    const box = await header.boundingBox();
    if (!box) throw new Error("Fixture header is not measurable");
    const before = await page.evaluate(({ groupId, nodeIds }) => ({
      scale: window.app.canvas.ds.scale,
      offset: [...window.app.canvas.ds.offset],
      bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
      visualBounds: nodeIds.map((id) => window.Workspace2CanvasGroups.nodeVisualBounds(window.app.graph.getNodeById(id))),
    }), fixture);
    const beforeScale = before.scale;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -120);
    await page.waitForFunction((scale) => window.app.canvas.ds.scale > scale, beforeScale, { timeout: 5_000 });
    await page.waitForTimeout(120);
    const report = await page.evaluate(({ groupId, nodeIds }) => {
      const groupElement = window.Workspace2CanvasGroups.groupEls[groupId];
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom };
      };
      const nodes = nodeIds.map((id) => document.querySelector(`[data-testid="node-body-${id}"]`)?.closest(".lg-node"));
      const groupRect = rect(groupElement);
      const nodeRects = nodes.map(rect);
      return {
        scale: window.app.canvas.ds.scale,
        offset: [...window.app.canvas.ds.offset],
        bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
        visualBounds: nodeIds.map((id) => window.Workspace2CanvasGroups.nodeVisualBounds(window.app.graph.getNodeById(id))),
        groupRect,
        nodeRects,
      };
    }, fixture);
    const contains = report.nodeRects.every((node) => (
      report.groupRect.left <= node.left
      && report.groupRect.top <= node.top
      && report.groupRect.right >= node.right
      && report.groupRect.bottom >= node.bottom
    ));
    if (!contains) throw new Error(`Nodes 2.0 group zoom alignment mismatch: ${JSON.stringify({ before, report })}`);
    console.log(JSON.stringify({ before, report, contains }, null, 2));
  } finally {
    if (fixture) {
      await page.evaluate(({ groupId, nodeIds }) => {
        window.Workspace2CanvasGroups?.killGroup?.(groupId);
        for (const nodeId of nodeIds) {
          const node = window.app?.graph?.getNodeById?.(nodeId);
          if (node) window.app.graph.remove(node);
        }
      }, fixture).catch(() => {});
    }
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalValue]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
