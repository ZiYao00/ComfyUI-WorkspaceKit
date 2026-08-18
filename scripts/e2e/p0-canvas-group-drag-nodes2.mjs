// Nodes 2.0 real-pointer acceptance for one WK group and its member nodes.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
    timeout: 45_000,
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
    // Manager registry activity can keep `load` pending even though the graph
    // is interactive.  The explicit WK overlay wait below is the readiness
    // condition this test actually needs.
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await waitForGroups(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    if (!originalValue) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
      await waitForGroups(page);
    }

    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      const first = window.LiteGraph.createNode("GetNode");
      const second = window.LiteGraph.createNode("GetNode");
      first.title = "WK Nodes2 Drag A";
      second.title = "WK Nodes2 Drag B";
      first.pos = [160, 160];
      second.pos = [410, 260];
      app.graph.add(first);
      app.graph.add(second);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id));
      if (!groupId) throw new Error("Fixture group creation failed");
      return { groupId, nodeIds: [first.id, second.id] };
    });

    const header = page.locator(`#xzg-group-overlay [data-group-id='${fixture.groupId}'] .xzg-group-header`);
    await header.waitFor({ state: "visible", timeout: 10_000 });
    await page.mouse.move(20, 850);
    await page.waitForTimeout(180);
    const hiddenHandles = await page.locator(`#xzg-group-overlay [data-group-id='${fixture.groupId}'] .xzg-resize-handle`).evaluateAll((handles) => handles.map((handle) => ({
      opacity: getComputedStyle(handle).opacity,
      pointerEvents: getComputedStyle(handle).pointerEvents,
    })));
    if (hiddenHandles.length !== 4 || hiddenHandles.some((handle) => handle.opacity !== "0" || handle.pointerEvents !== "none")) {
      throw new Error(`WK resize handles should stay hidden outside the group: ${JSON.stringify(hiddenHandles)}`);
    }
    const before = await page.evaluate(({ groupId, nodeIds }) => {
      const groups = window.Workspace2CanvasGroups;
      return {
        scale: window.app.canvas.ds.scale,
        group: { ...groups.groups[groupId].bounds },
        nodes: nodeIds.map((id) => {
          const node = window.app.graph.getNodeById(id);
          const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest('.lg-node');
          const rect = element?.getBoundingClientRect();
          return { id, x: node.pos[0], y: node.pos[1], posType: node.pos?.constructor?.name, domX: rect?.x, domY: rect?.y };
        }),
      };
    }, fixture);
    const box = await header.boundingBox();
    if (!box) throw new Error("Fixture group header is not measurable");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(180);
    const visibleHandles = await page.locator(`#xzg-group-overlay [data-group-id='${fixture.groupId}'] .xzg-resize-handle`).evaluateAll((handles) => handles.map((handle) => ({
      opacity: getComputedStyle(handle).opacity,
      pointerEvents: getComputedStyle(handle).pointerEvents,
    })));
    if (visibleHandles.length !== 4 || visibleHandles.some((handle) => handle.opacity !== "0.6" || handle.pointerEvents !== "auto")) {
      throw new Error(`WK resize handles should appear inside the group: ${JSON.stringify(visibleHandles)}`);
    }
    const pixelDelta = { x: 45, y: 27 };
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + pixelDelta.x, box.y + box.height / 2 + pixelDelta.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const after = await page.evaluate(({ groupId, nodeIds }) => {
      const groups = window.Workspace2CanvasGroups;
      return {
        group: { ...groups.groups[groupId].bounds },
        nodes: nodeIds.map((id) => {
          const node = window.app.graph.getNodeById(id);
          const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest('.lg-node');
          const rect = element?.getBoundingClientRect();
          return { id, x: node.pos[0], y: node.pos[1], posType: node.pos?.constructor?.name, domX: rect?.x, domY: rect?.y };
        }),
      };
    }, fixture);
    const expected = { x: pixelDelta.x / before.scale, y: pixelDelta.y / before.scale };
    const nearly = (actual, anticipated) => Math.abs(actual - anticipated) < 0.01;
    const groupMoved = nearly(after.group.x - before.group.x, expected.x) && nearly(after.group.y - before.group.y, expected.y);
    const nodesMoved = after.nodes.every((node, index) => (
      nearly(node.x - before.nodes[index].x, expected.x)
      && nearly(node.y - before.nodes[index].y, expected.y)
    ));
    const nodesDomMoved = after.nodes.every((node, index) => (
      Number.isFinite(node.domX)
      && Number.isFinite(node.domY)
      && node.posType === before.nodes[index].posType
      && nearly((node.domX - before.nodes[index].domX) / before.scale, expected.x)
      && nearly((node.domY - before.nodes[index].domY) / before.scale, expected.y)
    ));
    if (!groupMoved || !nodesMoved || !nodesDomMoved) {
      throw new Error(`Nodes 2.0 group drag mismatch: ${JSON.stringify({ before, after, expected, groupMoved, nodesMoved, nodesDomMoved })}`);
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
