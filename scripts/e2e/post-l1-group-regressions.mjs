import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrlArgIndex = process.argv.indexOf("--base-url");
const BASE_URL = baseUrlArgIndex >= 0 && process.argv[baseUrlArgIndex + 1]
  ? `${process.argv[baseUrlArgIndex + 1].replace(/\/$/, "")}/`
  : "http://127.0.0.1:8190/";

const nearly = (actual, expected, epsilon = 0.75) => Math.abs(actual - expected) <= epsilon;

async function waitForGroups(page) {
  await page.waitForFunction(() => (
    window.app?.graph
    && Array.isArray(window.app?.extensions)
    && window.app.extensions.some((extension) => extension?.name === "comfyui.workspace2")
  ), null, { timeout: 45_000, polling: 250 });
  const state = await page.evaluate(async () => {
    const mod = await import('/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260830_post_l1_groups_r1');
    const groups = mod.workspace2CanvasGroups;
    window.__WorkspaceKitGroupTest = groups;
    return { initialized: groups.initialized, overlay: Boolean(groups.overlay) };
  });
  if (!state.initialized || !state.overlay) {
    throw new Error(`Current Canvas Groups singleton is not the initialized production instance: ${JSON.stringify(state)}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let fixture = null;

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);

    fixture = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.__WorkspaceKitGroupTest;
      const emptyTarget = window.LiteGraph.createNode("GetNode");
      const collapsedTarget = window.LiteGraph.createNode("GetNode");
      emptyTarget.title = "WK Empty Group Membership Target";
      collapsedTarget.title = "WK Collapsed Bounds Target";
      emptyTarget.pos = [620, 360];
      collapsedTarget.pos = [940, 180];
      // Give the collapsed node a deliberately large expanded size so stale
      // pos/size or boundingRect geometry is obvious if it leaks into Ctrl+G.
      collapsedTarget.size = [360, 220];
      app.graph.add(emptyTarget);
      app.graph.add(collapsedTarget);
      collapsedTarget.flags ||= {};
      collapsedTarget.flags.collapsed = true;
      app.graph.setDirtyCanvas?.(true, true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const collapsedVisual = groups.nodeVisualBounds(collapsedTarget);
      if (!collapsedVisual) throw new Error("Collapsed target has no visual bounds");
      if (!(collapsedVisual.h < Number(collapsedTarget.size?.[1] || 0))) {
        throw new Error(`Fixture did not expose collapsed visual geometry: ${JSON.stringify({ visual: collapsedVisual, size: collapsedTarget.size })}`);
      }

      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([collapsedTarget]);
      await groups.createGroupFromSelection();
      const collapsedGroupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.some((nodeId) => String(nodeId) === String(collapsedTarget.id)));
      if (!collapsedGroupId) throw new Error("Collapsed target group creation failed");
      const collapsedGroup = groups.groups[collapsedGroupId];
      const padding = Math.max(0, Number(collapsedGroup.contentPadding ?? 12) || 0);
      const headerHeight = Math.max(21, Math.round((collapsedGroup.fontSize || 14) * 1.8));
      const topPad = headerHeight + padding;
      const expectedCollapsedBounds = {
        x: collapsedVisual.x - padding,
        y: collapsedVisual.y - topPad,
        w: collapsedVisual.w + padding * 2,
        h: collapsedVisual.h + topPad + padding,
      };

      groups.lastCanvasContextPoint = { x: 120, y: 140 };
      groups.createEmptyGroupAtContextPoint();
      const emptyGroupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.allowEmpty && groups.groups[id]?.nodeIds?.length === 0);
      if (!emptyGroupId) throw new Error("Empty group creation failed");
      const emptyGroup = groups.groups[emptyGroupId];
      const emptyTargetVisual = groups.nodeVisualBounds(emptyTarget);
      if (!emptyTargetVisual) throw new Error("Empty-group target has no visual bounds");
      const desired = {
        x: emptyTargetVisual.x + emptyTargetVisual.w / 2 - emptyGroup.bounds.w / 2,
        y: emptyTargetVisual.y + emptyTargetVisual.h / 2 - emptyGroup.bounds.h / 2,
      };
      return {
        emptyTargetId: emptyTarget.id,
        collapsedTargetId: collapsedTarget.id,
        emptyGroupId,
        collapsedGroupId,
        emptyStart: { ...emptyGroup.bounds },
        desired,
        scale: Number(app.canvas?.ds?.scale) || 1,
        expectedCollapsedBounds,
        actualCollapsedBounds: { ...collapsedGroup.bounds },
        collapsedVisual,
        collapsedStoredSize: Array.from(collapsedTarget.size || []),
      };
    });

    for (const key of ["x", "y", "w", "h"]) {
      assert.ok(
        nearly(fixture.actualCollapsedBounds[key], fixture.expectedCollapsedBounds[key]),
        `collapsed Ctrl+G group ${key} must follow visible bounds: ${JSON.stringify(fixture)}`,
      );
    }

    const emptyHeader = page.locator(`#xzg-group-overlay [data-group-id='${fixture.emptyGroupId}'] .xzg-group-header`);
    await emptyHeader.waitFor({ state: "visible", timeout: 10_000 });
    const startBox = await emptyHeader.boundingBox();
    if (!startBox) throw new Error("Empty group header is not measurable");
    const firstDelta = {
      x: (fixture.desired.x - fixture.emptyStart.x) * fixture.scale,
      y: (fixture.desired.y - fixture.emptyStart.y) * fixture.scale,
    };
    await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      startBox.x + startBox.width / 2 + firstDelta.x,
      startBox.y + startBox.height / 2 + firstDelta.y,
      { steps: 6 },
    );
    await page.mouse.up();
    // Less than the 10-frame background cadence: this assertion is proving the
    // pointer-up reconciliation, not eventual polling.
    await page.waitForTimeout(30);

    const membership = await page.evaluate(({ emptyGroupId, emptyTargetId, collapsedTargetId }) => {
      const groups = window.__WorkspaceKitGroupTest;
      const group = groups.groups[emptyGroupId];
      const target = window.app.graph.getNodeById(emptyTargetId);
      return {
        emptyTargetId,
        collapsedTargetId,
        nodeIds: [...(group?.nodeIds || [])],
        included: Boolean(group?.nodeIds?.some((id) => String(id) === String(emptyTargetId))),
        groupBounds: group?.bounds ? { ...group.bounds } : null,
        targetVisual: groups.nodeVisualBounds(target),
        targetPos: Array.from(target?.pos || []),
        scale: Number(window.app.canvas?.ds?.scale) || 1,
      };
    }, fixture);
    assert.equal(membership.included, true, `empty group must adopt the target on pointer-up: ${JSON.stringify(membership)}`);

    const secondHeaderBox = await emptyHeader.boundingBox();
    if (!secondHeaderBox) throw new Error("Repositioned empty group header is not measurable");
    const secondPixelDelta = { x: 42, y: 24 };
    await page.mouse.move(secondHeaderBox.x + secondHeaderBox.width / 2, secondHeaderBox.y + secondHeaderBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      secondHeaderBox.x + secondHeaderBox.width / 2 + secondPixelDelta.x,
      secondHeaderBox.y + secondHeaderBox.height / 2 + secondPixelDelta.y,
      { steps: 5 },
    );
    await page.mouse.up();
    await page.waitForTimeout(40);

    const afterSecondDrag = await page.evaluate(({ emptyTargetId }) => ({
      targetPos: Array.from(window.app.graph.getNodeById(emptyTargetId)?.pos || []),
    }), fixture);
    assert.ok(nearly(afterSecondDrag.targetPos[0] - membership.targetPos[0], secondPixelDelta.x / membership.scale, 0.25));
    assert.ok(nearly(afterSecondDrag.targetPos[1] - membership.targetPos[1], secondPixelDelta.y / membership.scale, 0.25));
    assert.deepEqual(errors, [], `Unexpected page errors: ${errors.join(" | ")}`);

    console.log("Post-L1 group regressions passed: empty-group adoption + collapsed visual bounds.");
  } finally {
    if (fixture) {
      await page.evaluate(({ emptyGroupId, collapsedGroupId, emptyTargetId, collapsedTargetId }) => {
        const groups = window.__WorkspaceKitGroupTest;
        for (const groupId of [emptyGroupId, collapsedGroupId]) groups?.killGroup?.(groupId);
        for (const nodeId of [emptyTargetId, collapsedTargetId]) {
          const node = window.app?.graph?.getNodeById?.(nodeId);
          if (node) window.app.graph.remove(node);
        }
      }, fixture).catch(() => {});
    }
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
