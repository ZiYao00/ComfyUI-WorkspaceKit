// Nodes 2.0 real resize acceptance: resizing a WK group changes only its bounds.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
    // Keep this below the outer command timeout so a failed renderer reload
    // returns a diagnosable Playwright error instead of being terminated first.
    timeout: 15_000,
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
      first.pos = [220, 180];
      second.pos = [500, 300];
      app.graph.add(first);
      app.graph.add(second);
      let stableFrames = 0;
      let previous = '';
      for (let frame = 0; frame < 30 && stableFrames < 2; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const signature = JSON.stringify([first, second].map((node) => groups.nodeVisualBounds(node)));
        stableFrames = signature === previous ? stableFrames + 1 : 0;
        previous = signature;
      }
      if (stableFrames < 2) throw new Error('Nodes 2.0 visual bounds did not stabilize before group creation');
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id));
      if (!groupId) throw new Error('Fixture group creation failed');
      return { groupId, nodeIds: [first.id, second.id] };
    });
    const before = await page.evaluate(({ groupId, nodeIds }) => ({
      scale: window.app.canvas.ds.scale,
      bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
      positions: nodeIds.map((id) => [...window.app.graph.getNodeById(id).pos]),
    }), fixture);
    const handle = page.locator(`#xzg-group-overlay [data-group-id='${fixture.groupId}'] .xzg-resize-handle[data-resize-corner='se']`);
    const box = await handle.boundingBox();
    if (!box) throw new Error('Fixture resize handle is not measurable');
    const handlePoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(handlePoint.x, handlePoint.y);
    await page.waitForTimeout(40);
    const hit = await page.evaluate(({ groupId, point }) => {
      const handle = document.querySelector(`#xzg-group-overlay [data-group-id='${groupId}'] .xzg-resize-handle[data-resize-corner='se']`);
      const target = document.elementFromPoint(point.x, point.y);
      const canvasPoint = window.Workspace2CanvasGroups.getCanvasPointFromPointerEvent({ clientX: point.x, clientY: point.y });
      return {
        handlePointerEvents: getComputedStyle(handle).pointerEvents,
        targetTag: target?.tagName || null,
        hitsHandle: Boolean(target?.closest?.('.xzg-resize-handle')),
        nodeUnderPointer: Boolean(window.app.graph.getNodeOnPos?.(canvasPoint.x, canvasPoint.y, window.app.graph._nodes, 5)),
      };
    }, { groupId: fixture.groupId, point: handlePoint });
    if (hit.handlePointerEvents !== 'auto' || !hit.hitsHandle) {
      throw new Error(`Nodes 2.0 resize handle is not the browser hit target: ${JSON.stringify(hit)}`);
    }
    await page.mouse.down();
    await page.mouse.move(handlePoint.x + 45, handlePoint.y + 30, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(80);
    const after = await page.evaluate(({ groupId, nodeIds }) => ({
      bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
      positions: nodeIds.map((id) => [...window.app.graph.getNodeById(id).pos]),
    }), fixture);
    const expected = { w: before.bounds.w + (45 / before.scale), h: before.bounds.h + (30 / before.scale) };
    const close = (actual, wanted) => Math.abs(actual - wanted) < 0.75;
    if (!close(after.bounds.w, expected.w) || !close(after.bounds.h, expected.h)) {
      throw new Error(`Nodes 2.0 group resize bounds mismatch: ${JSON.stringify({ before, after, expected })}`);
    }
    if (JSON.stringify(before.positions) !== JSON.stringify(after.positions)) {
      throw new Error(`Nodes 2.0 group resize moved member nodes: ${JSON.stringify({ before, after })}`);
    }
    console.log(JSON.stringify({ before, after, expected }, null, 2));
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
