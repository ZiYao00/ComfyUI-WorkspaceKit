// Nodes 2.0 in-memory conversion acceptance: WK group -> native group -> WK group.
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
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    const result = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      // This browser context is disposable. Clear only its in-memory graph so
      // conversion never touches a loaded test-package workflow or saves data.
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
        id: groupId,
        title: groups.groups[groupId].title,
        bounds: { ...groups.groups[groupId].bounds },
        positions: [first, second].map((node) => [...node.pos]),
      };
      const forward = groups.convertCurrentWorkflowToNative();
      const nativeCount = (app.graph._groups || []).length;
      const overlayCountAfterForward = document.querySelectorAll('.xzg-group-box').length;
      const reverse = groups.convertCurrentWorkflowToWorkspaceKit();
      const recoveredId = Object.keys(groups.groups)[0];
      const after = {
        representation: groups.getGroupRepresentation(app.graph),
        nativeCount: (app.graph._groups || []).length,
        group: recoveredId ? { title: groups.groups[recoveredId].title, bounds: { ...groups.groups[recoveredId].bounds } } : null,
        positions: [first, second].map((node) => [...node.pos]),
      };
      // Nodes 2.0 visual bounds can be fractional after DOM→graph conversion,
      // whereas LiteGraph native groups serialize integer positions. A one-unit
      // coordinate quantization is the native round-trip boundary, not movement.
      const close = (actual, expected) => Math.abs(actual - expected) <= 1;
      const sameBounds = after.group && ['x', 'y', 'w', 'h'].every((key) => close(after.group.bounds[key], before.bounds[key]));
      const samePositions = before.positions.every((position, index) => (
        close(after.positions[index][0], position[0]) && close(after.positions[index][1], position[1])
      ));
      if (forward.converted !== 1 || nativeCount !== 1 || overlayCountAfterForward !== 0
        || reverse.converted !== 1 || after.nativeCount !== 0 || after.representation !== 'workspacekit'
        || !sameBounds || !samePositions) {
        throw new Error(`Nodes 2.0 group conversion mismatch: ${JSON.stringify({ before, forward, nativeCount, overlayCountAfterForward, reverse, after })}`);
      }
      return { before, forward, nativeCount, overlayCountAfterForward, reverse, after };
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
