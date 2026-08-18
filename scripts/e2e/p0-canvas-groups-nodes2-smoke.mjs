// Nodes 2.0 smoke for WK canvas-group creation and overlay alignment.
// This uses only disposable nodes/groups in an isolated browser profile.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups, null, {
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
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    await page.waitForFunction(() => window.Workspace2CanvasGroups?.overlay, null, {
      timeout: 10_000,
      polling: 250,
    }).catch(async () => {
      const diagnostic = await page.evaluate(() => ({
        initialized: window.Workspace2CanvasGroups?.initialized,
        overlay: Boolean(window.Workspace2CanvasGroups?.overlay),
        groupCount: Object.keys(window.Workspace2CanvasGroups?.groups || {}).length,
      }));
      throw new Error(`WK group overlay did not initialize under Nodes 2.0: ${JSON.stringify(diagnostic)}`);
    });

    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      const first = window.LiteGraph.createNode("GetNode");
      const second = window.LiteGraph.createNode("GetNode");
      first.title = "WK Nodes2 Group A";
      second.title = "WK Nodes2 Group B";
      first.pos = [180, 180];
      second.pos = [460, 280];
      app.graph.add(first);
      app.graph.add(second);
      // A person can only select a node after it is visible. Match that real
      // interaction boundary so Nodes 2.0 has completed its DOM layout before
      // WK samples visual bounds for a new group.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id));
      if (!groupId) throw new Error("WK group was not created from the selected nodes");
      groups.updatePositions();
      const element = groups.groupEls[groupId];
      const nodeElements = [first.title, second.title].map((title) => [...document.querySelectorAll(".lg-node")]
        .find((element) => (element.textContent || "").includes(title)));
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      return {
        groupId,
        nodeIds: [first.id, second.id],
        resolvedVisualBounds: [groups.nodeVisualBounds(first), groups.nodeVisualBounds(second)],
        matchingTestIds: [...document.querySelectorAll("[data-testid]")]
          .map((element) => element.dataset.testid)
          .filter((value) => value?.includes(String(first.id)) || value?.includes(String(second.id))),
        groupBounds: groups.groups[groupId].bounds,
        graphNodes: [first, second].map((node) => ({ id: node.id, pos: node.pos, size: node.size, boundingRect: node.boundingRect })),
        canvasTransform: { scale: app.canvas.ds?.scale, offset: app.canvas.ds?.offset },
        groupRect: rect(element),
        nodeRects: nodeElements.filter(Boolean).map(rect),
        groupElementConnected: element?.isConnected === true,
      };
    });
    const contains = fixture.nodeRects.length === 2 && fixture.nodeRects.every((node) => (
      fixture.groupRect.left <= node.left
      && fixture.groupRect.top <= node.top
      && fixture.groupRect.right >= node.right
      && fixture.groupRect.bottom >= node.bottom
    ));
    if (!fixture.groupElementConnected || !contains) {
      throw new Error(`Nodes 2.0 WK group alignment mismatch: ${JSON.stringify({ fixture, contains })}`);
    }
    console.log(JSON.stringify({ nodes2Enabled: true, fixture, contains }, null, 2));
  } finally {
    if (fixture) {
      await page.evaluate(({ groupId, nodeIds }) => {
        const groups = window.Workspace2CanvasGroups;
        groups?.killGroup?.(groupId);
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
