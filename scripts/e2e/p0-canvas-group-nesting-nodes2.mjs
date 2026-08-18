// Nodes 2.0 real nested-group acceptance: a parent group moves its child group and all members.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
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
      const nodes = [0, 1, 2].map((index) => window.LiteGraph.createNode("GetNode"));
      nodes[0].pos = [220, 180];
      nodes[1].pos = [490, 180];
      nodes[2].pos = [760, 180];
      nodes.forEach((node) => app.graph.add(node));
      let stableFrames = 0;
      let previous = '';
      for (let frame = 0; frame < 30 && stableFrames < 2; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const signature = JSON.stringify(nodes.map((node) => groups.nodeVisualBounds(node)));
        stableFrames = signature === previous ? stableFrames + 1 : 0;
        previous = signature;
      }
      if (stableFrames < 2) throw new Error('Nodes 2.0 visual bounds did not stabilize');

      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([nodes[0]]);
      await groups.createGroupFromSelection();
      const childId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(nodes[0].id));
      if (!childId) throw new Error('Child group creation failed');

      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.(nodes);
      await groups.createGroupFromSelection();
      const childBounds = groups.groups[childId].bounds;
      const parentId = Object.keys(groups.groups).find((id) => {
        if (id === childId) return false;
        const bounds = groups.groups[id]?.bounds;
        return bounds
          && bounds.x <= childBounds.x
          && bounds.y <= childBounds.y
          && bounds.x + bounds.w >= childBounds.x + childBounds.w
          && bounds.y + bounds.h >= childBounds.y + childBounds.h;
      });
      if (!parentId) throw new Error(`Parent group creation failed: ${JSON.stringify(groups.groups)}`);
      return { childId, parentId, nodeIds: nodes.map((node) => node.id) };
    });
    const before = await page.evaluate(({ parentId, childId, nodeIds }) => ({
      scale: window.app.canvas.ds.scale,
      parent: { ...window.Workspace2CanvasGroups.groups[parentId].bounds },
      child: { ...window.Workspace2CanvasGroups.groups[childId].bounds },
      positions: nodeIds.map((id) => [...window.app.graph.getNodeById(id).pos]),
    }), fixture);
    const header = page.locator(`#xzg-group-overlay [data-group-id='${fixture.parentId}'] .xzg-group-header`);
    const box = await header.boundingBox();
    if (!box) throw new Error('Parent header is not measurable');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 27, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(80);
    const after = await page.evaluate(({ parentId, childId, nodeIds }) => ({
      parent: { ...window.Workspace2CanvasGroups.groups[parentId].bounds },
      child: { ...window.Workspace2CanvasGroups.groups[childId].bounds },
      positions: nodeIds.map((id) => [...window.app.graph.getNodeById(id).pos]),
    }), fixture);
    const dx = 45 / before.scale;
    const dy = 27 / before.scale;
    const close = (actual, wanted) => Math.abs(actual - wanted) < 0.75;
    const moved = (pointBefore, pointAfter) => close(pointAfter[0], pointBefore[0] + dx) && close(pointAfter[1], pointBefore[1] + dy);
    if (!close(after.parent.x, before.parent.x + dx) || !close(after.parent.y, before.parent.y + dy)
      || !close(after.child.x, before.child.x + dx) || !close(after.child.y, before.child.y + dy)
      || !before.positions.every((position, index) => moved(position, after.positions[index]))) {
      throw new Error(`Nodes 2.0 nested group drag mismatch: ${JSON.stringify({ before, after, dx, dy })}`);
    }
    console.log(JSON.stringify({ before, after, dx, dy }, null, 2));
  } finally {
    if (fixture) {
      await page.evaluate(({ parentId, childId, nodeIds }) => {
        window.Workspace2CanvasGroups?.killGroup?.(parentId);
        window.Workspace2CanvasGroups?.killGroup?.(childId);
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
