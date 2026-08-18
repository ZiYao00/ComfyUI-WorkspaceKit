// Nodes 2.0 in-memory save/reload acceptance for a WorkspaceKit group.
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
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    if (!originalValue) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForGroups(page);
    }
    const result = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      // The isolated browser context never saves this temporary graph to disk.
      app.graph.clear();
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = {};
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
      if (stableFrames < 2) throw new Error('Nodes 2.0 visual bounds did not stabilize');
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const groupId = Object.keys(groups.groups)[0];
      const before = {
        title: groups.groups[groupId].title,
        bounds: { ...groups.groups[groupId].bounds },
        nodeIds: [...groups.groups[groupId].nodeIds].map(String).sort(),
        positions: [first, second].map((node) => [...node.pos]),
      };
      const snapshot = app.graph.serialize();
      if (!snapshot?.extra?.xzgGroups?.[groupId]) throw new Error('Group was absent from serialized graph data');
      await app.loadGraphData(snapshot);
      let loaded = null;
      for (let frame = 0; frame < 60; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const currentId = Object.keys(groups.groups)[0];
        if (currentId && app.graph._nodes?.length === 2) {
          loaded = { id: currentId, group: groups.groups[currentId] };
          break;
        }
      }
      if (!loaded) throw new Error('WorkspaceKit group did not restore after in-memory graph reload');
      const after = {
        title: loaded.group.title,
        bounds: { ...loaded.group.bounds },
        nodeIds: [...loaded.group.nodeIds].map(String).sort(),
        positions: app.graph._nodes.map((node) => [...node.pos]).sort((a, b) => a[0] - b[0]),
        overlayCount: document.querySelectorAll('.xzg-group-box').length,
      };
      const close = (actual, expected) => Math.abs(actual - expected) < 0.01;
      const sameBounds = ['x', 'y', 'w', 'h'].every((key) => close(after.bounds[key], before.bounds[key]));
      const samePositions = before.positions.sort((a, b) => a[0] - b[0]).every((position, index) => (
        close(after.positions[index][0], position[0]) && close(after.positions[index][1], position[1])
      ));
      if (after.title !== before.title || JSON.stringify(after.nodeIds) !== JSON.stringify(before.nodeIds)
        || !sameBounds || !samePositions || after.overlayCount !== 1) {
        throw new Error(`Nodes 2.0 group reload mismatch: ${JSON.stringify({ before, after })}`);
      }
      return { before, after, snapshotGroupCount: Object.keys(snapshot.extra.xzgGroups).length };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalValue]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
