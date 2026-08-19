// T-021-R1 real-pointer acceptance for current WK selection semantics:
// double-click selects a parent group's CONTENTS (not the parent frame), then
// parent + child + an independent group move together without duplicate node
// displacement under Nodes 2.0.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function ready(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups, null, {
    timeout: 45_000,
    polling: 250,
  });
  await page.evaluate(() => window.Workspace2CanvasGroups.init?.());
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?.overlay), null, { timeout: 10_000, polling: 100 });
}

async function header(page, groupId) {
  const target = page.locator(`#xzg-group-overlay [data-group-id='${groupId}'] .xzg-group-header`);
  await target.waitFor({ state: "visible", timeout: 10_000 });
  return target;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let originalNodes2 = false;
  let fixture = null;
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await ready(page);
    originalNodes2 = await page.evaluate(id => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    if (!originalNodes2) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      await ready(page);
    }
    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      app.graph.clear();
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = {};
      const nodes = [
        // Deliberately lower than the parent's direct member: parent/child
        // headers must not overlap, otherwise the parent is physically the
        // topmost hit target and no user can click the child header.
        [170, 340, "T021 child member"],
        [510, 180, "T021 parent direct member"],
        [900, 360, "T021 independent left"],
        [1160, 430, "T021 independent right"],
      ].map(([x, y, title]) => {
        const node = window.LiteGraph.createNode("GetNode");
        node.pos = [x, y];
        node.title = title;
        app.graph.add(node);
        return node;
      });
      let stable = 0;
      let previous = "";
      for (let frame = 0; frame < 60 && stable < 2; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const signature = JSON.stringify(nodes.map(node => groups.nodeVisualBounds(node)));
        stable = signature === previous ? stable + 1 : 0;
        previous = signature;
      }
      if (stable < 2) throw new Error("Nodes 2.0 bounds did not stabilize");
      const create = async (selection, name) => {
        const existingIds = new Set(Object.keys(groups.groups));
        app.canvas.deselectAllNodes?.();
        app.canvas.selectItems?.(selection);
        await groups.createGroupFromSelection();
        const id = Object.keys(groups.groups).find(key => !existingIds.has(key));
        if (!id) throw new Error(`Cannot create ${name}`);
        groups.groups[id].title = name;
        groups.syncGroupsToExtra();
        return id;
      };
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([nodes[0], nodes[1]]);
      await groups.createGroupFromSelection();
      const parentId = Object.keys(groups.groups).find(id => {
        const group = groups.groups[id];
        return group?.nodeIds?.map(String).includes(String(nodes[0].id)) && group?.nodeIds?.map(String).includes(String(nodes[1].id));
      });
      if (!parentId) throw new Error("Cannot create parent group");
      groups.groups[parentId].title = "T021 parent";
      const childId = await create([nodes[0]], "T021 child");
      const independentId = await create([nodes[2], nodes[3]], "T021 independent");
      return { parentId, childId, independentId, nodeIds: nodes.map(node => node.id) };
    });

    const parentHeader = await header(page, fixture.parentId);
    await parentHeader.dblclick();
    await page.waitForTimeout(100);
    const contentsSelection = await page.evaluate(({ parentId, childId, nodeIds }) => ({
      selectedGroups: [...window.Workspace2CanvasGroups.selectedGroupIds],
      selectedNodes: Object.keys(window.app.canvas.selected_nodes || {}).map(String),
      parentId, childId, nodeIds: nodeIds.map(String),
    }), fixture);
    // The independent frame is not a child of the parent; only the parent's
    // two contents and the nested child frame belong in a double-click result.
    const expectedContents = new Set(fixture.nodeIds.slice(0, 2).map(String));
    const selectedNodes = new Set(contentsSelection.selectedNodes);
    if (contentsSelection.selectedGroups.includes(fixture.parentId)
      || !contentsSelection.selectedGroups.includes(fixture.childId)
      || ![...expectedContents].every(id => selectedNodes.has(id))) {
      throw new Error(`Double-click contents selection mismatch: ${JSON.stringify(contentsSelection)}`);
    }

    // Rebuild a joint selection with actual clicks: normal click selects the
    // parent; Shift clicks add child and independent frames without resetting.
    await parentHeader.click();
    await page.keyboard.down("Shift");
    await (await header(page, fixture.childId)).click();
    await (await header(page, fixture.independentId)).click();
    await page.keyboard.up("Shift");
    const jointSelection = await page.evaluate(() => [...window.Workspace2CanvasGroups.selectedGroupIds]);
    const allGroupIds = [fixture.parentId, fixture.childId, fixture.independentId];
    if (jointSelection.length !== 3 || !allGroupIds.every(id => jointSelection.includes(id))) {
      throw new Error(`Joint group selection mismatch: ${JSON.stringify({ jointSelection, allGroupIds })}`);
    }
    const before = await page.evaluate(({ groupIds, nodeIds }) => ({
      scale: window.app.canvas.ds.scale,
      groups: groupIds.map(id => ({ id, bounds: { ...window.Workspace2CanvasGroups.groups[id].bounds } })),
      nodes: nodeIds.map(id => {
        const node = window.app.graph.getNodeById(id);
        const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest(".lg-node");
        const rect = element?.getBoundingClientRect();
        return { id, pos: [...node.pos], dom: rect ? { x: rect.x, y: rect.y } : null };
      }),
    }), { groupIds: allGroupIds, nodeIds: fixture.nodeIds });
    const dragHeader = await header(page, fixture.independentId);
    const box = await dragHeader.boundingBox();
    if (!box) throw new Error("Independent group header is not measurable");
    const pixel = { x: 36, y: 18 };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + pixel.x, box.y + box.height / 2 + pixel.y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(160);
    const after = await page.evaluate(({ groupIds, nodeIds }) => ({
      groups: groupIds.map(id => ({ id, bounds: { ...window.Workspace2CanvasGroups.groups[id].bounds } })),
      nodes: nodeIds.map(id => {
        const node = window.app.graph.getNodeById(id);
        const element = document.querySelector(`[data-testid="node-body-${id}"]`)?.closest(".lg-node");
        const rect = element?.getBoundingClientRect();
        return { id, pos: [...node.pos], dom: rect ? { x: rect.x, y: rect.y } : null };
      }),
    }), { groupIds: allGroupIds, nodeIds: fixture.nodeIds });
    const expected = { x: pixel.x / before.scale, y: pixel.y / before.scale };
    const close = (actual, wanted) => Math.abs(actual - wanted) < 0.75;
    const groupsMoved = after.groups.every((group, index) => (
      close(group.bounds.x, before.groups[index].bounds.x + expected.x)
      && close(group.bounds.y, before.groups[index].bounds.y + expected.y)
    ));
    const nodesMovedOnce = after.nodes.every((node, index) => (
      close(node.pos[0], before.nodes[index].pos[0] + expected.x)
      && close(node.pos[1], before.nodes[index].pos[1] + expected.y)
      && node.dom && before.nodes[index].dom
      && close((node.dom.x - before.nodes[index].dom.x) / before.scale, expected.x)
      && close((node.dom.y - before.nodes[index].dom.y) / before.scale, expected.y)
    ));
    if (!groupsMoved || !nodesMovedOnce) {
      throw new Error(`Joint nested multi-drag mismatch: ${JSON.stringify({ before, after, expected })}`);
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.Workspace2CanvasGroups.selectedGroupIds.size === 0, null, { timeout: 5_000 });
    await page.screenshot({ path: ".dev-docs/artifacts/t021-multiselect-nested-real-pointer.png", fullPage: true });
    console.log(JSON.stringify({ fixture, contentsSelection, jointSelection, before, after, expected, selectionAfterEscape: [] }, null, 2));
  } finally {
    if (fixture) {
      await page.evaluate(({ groupIds, nodeIds }) => {
        for (const id of groupIds) window.Workspace2CanvasGroups?.killGroup?.(id);
        for (const id of nodeIds) {
          const node = window.app?.graph?.getNodeById?.(id);
          if (node) window.app.graph.remove(node);
        }
      }, { groupIds: [fixture.parentId, fixture.childId, fixture.independentId], nodeIds: fixture.nodeIds }).catch(() => {});
    }
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalNodes2]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
