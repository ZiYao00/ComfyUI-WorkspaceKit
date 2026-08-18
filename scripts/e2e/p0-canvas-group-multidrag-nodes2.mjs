// Nodes 2.0 real-pointer acceptance for Shift-selected WK group multi-drag.
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
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await waitForGroups(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "load", timeout: 30_000 });
    await waitForGroups(page);
    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      const created = [];
      const createGroup = async (offset, labels) => {
        const first = window.LiteGraph.createNode("GetNode");
        const second = window.LiteGraph.createNode("GetNode");
        first.title = labels[0];
        second.title = labels[1];
        first.pos = [offset.x, offset.y];
        second.pos = [offset.x + 220, offset.y + 90];
        app.graph.add(first);
        app.graph.add(second);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        app.canvas.deselectAllNodes?.();
        app.canvas.selectItems?.([first, second]);
        await groups.createGroupFromSelection();
        const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id));
        if (!groupId) throw new Error("Fixture group creation failed");
        created.push(groupId);
        return { groupId, nodeIds: [first.id, second.id] };
      };
      const left = await createGroup({ x: 120, y: 140 }, ["WK Multi A1", "WK Multi A2"]);
      const right = await createGroup({ x: 650, y: 260 }, ["WK Multi B1", "WK Multi B2"]);
      return { groups: [left, right] };
    });

    const headers = fixture.groups.map(({ groupId }) => page.locator(`#xzg-group-overlay [data-group-id='${groupId}'] .xzg-group-header`));
    for (const header of headers) await header.waitFor({ state: "visible", timeout: 10_000 });
    // Real multi-select begins with a normal group selection, then Shift adds
    // another group. Group creation itself does not make prior frames selected.
    await headers[0].click();
    await page.keyboard.down("Shift");
    await headers[1].click();
    await page.keyboard.up("Shift");
    const selection = await page.evaluate(() => [...window.Workspace2CanvasGroups.selectedGroupIds]);
    if (selection.length !== 2 || !fixture.groups.every(({ groupId }) => selection.includes(groupId))) {
      throw new Error(`Shift selection mismatch: ${JSON.stringify({ selection, fixture })}`);
    }
    const before = await page.evaluate((fixtureData) => ({
      scale: window.app.canvas.ds.scale,
      groups: fixtureData.groups.map(({ groupId, nodeIds }) => ({
        groupId,
        bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
        nodes: nodeIds.map((id) => {
          const node = window.app.graph.getNodeById(id);
          const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest('.lg-node');
          const rect = element?.getBoundingClientRect();
          return { id, x: node.pos[0], y: node.pos[1], posType: node.pos?.constructor?.name, domX: rect?.x, domY: rect?.y };
        }),
      })),
    }), fixture);
    const box = await headers[1].boundingBox();
    if (!box) throw new Error("Second group header is not measurable");
    const pixelDelta = { x: 36, y: 18 };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + pixelDelta.x, box.y + box.height / 2 + pixelDelta.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const after = await page.evaluate((fixtureData) => fixtureData.groups.map(({ groupId, nodeIds }) => ({
      groupId,
      bounds: { ...window.Workspace2CanvasGroups.groups[groupId].bounds },
      nodes: nodeIds.map((id) => {
        const node = window.app.graph.getNodeById(id);
        const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest('.lg-node');
        const rect = element?.getBoundingClientRect();
        return { id, x: node.pos[0], y: node.pos[1], posType: node.pos?.constructor?.name, domX: rect?.x, domY: rect?.y };
      }),
    })), fixture);
    const expected = { x: pixelDelta.x / before.scale, y: pixelDelta.y / before.scale };
    const nearly = (actual, anticipated) => Math.abs(actual - anticipated) < 0.01;
    const valid = after.every((group, groupIndex) => {
      const original = before.groups[groupIndex];
      return nearly(group.bounds.x - original.bounds.x, expected.x)
        && nearly(group.bounds.y - original.bounds.y, expected.y)
        && group.nodes.every((node, index) => (
          nearly(node.x - original.nodes[index].x, expected.x)
          && nearly(node.y - original.nodes[index].y, expected.y)
          && node.posType === original.nodes[index].posType
          && Number.isFinite(node.domX)
          && Number.isFinite(node.domY)
          && nearly((node.domX - original.nodes[index].domX) / before.scale, expected.x)
          && nearly((node.domY - original.nodes[index].domY) / before.scale, expected.y)
        ));
    });
    if (!valid) throw new Error(`Nodes 2.0 group multi-drag mismatch: ${JSON.stringify({ before, after, expected })}`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.Workspace2CanvasGroups.selectedGroupIds.size === 0, null, { timeout: 5_000 });
    console.log(JSON.stringify({ selection, before, after, expected, selectionAfterEscape: [] }, null, 2));
  } finally {
    if (fixture) {
      await page.evaluate((fixtureData) => {
        for (const { groupId, nodeIds } of fixtureData.groups) {
          window.Workspace2CanvasGroups?.killGroup?.(groupId);
          for (const nodeId of nodeIds) {
            const node = window.app?.graph?.getNodeById?.(nodeId);
            if (node) window.app.graph.remove(node);
          }
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
