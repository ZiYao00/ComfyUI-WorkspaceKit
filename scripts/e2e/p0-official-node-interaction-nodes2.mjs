// Nodes 2.0 coexistence check: WK's overlay must not block ordinary nodes.
// The graph is created and discarded in an isolated browser page only.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.waitForFunction(
    () => window.app?.graph && window.app?.canvas && window.Workspace2CanvasGroups?.overlay,
    null,
    { timeout: 25_000 },
  );
  const fixture = await page.evaluate(async () => {
    if (!window.app.extensionManager.setting.get("Comfy.VueNodes.Enabled")) {
      throw new Error("Nodes 2.0 must already be enabled for this isolated check.");
    }
    const graph = window.app.graph;
    const groups = window.Workspace2CanvasGroups;
    graph.clear();
    groups.groups = {};
    groups.groupEls = {};
    const first = window.LiteGraph.createNode("GetNode");
    const second = window.LiteGraph.createNode("GetNode");
    const text = window.LiteGraph.createNode("CLIPTextEncode");
    first.title = "WK coexistence A";
    second.title = "WK coexistence B";
    first.pos = [160, 160];
    second.pos = [430, 260];
    text.pos = [160, 420];
    graph.add(first);
    graph.add(second);
    graph.add(text);
    graph.change?.();
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { firstId: first.id, secondId: second.id, textId: text.id };
  });

  const nodeBody = page.locator(`[data-testid="node-body-${fixture.firstId}"]`);
  await nodeBody.waitFor({ state: "visible", timeout: 8_000 });
  const bodyBox = await nodeBody.boundingBox();
  if (!bodyBox) throw new Error("Official Nodes 2.0 node body is not measurable.");

  const before = await page.evaluate((id) => {
    const node = window.app.graph.getNodeById(id);
    return { x: node.pos[0], y: node.pos[1] };
  }, fixture.firstId);
  await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(bodyBox.x + bodyBox.width / 2 + 36, bodyBox.y + 28, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const afterDrag = await page.evaluate((id) => {
    const node = window.app.graph.getNodeById(id);
    return { x: node.pos[0], y: node.pos[1] };
  }, fixture.firstId);
  if (afterDrag.x === before.x && afterDrag.y === before.y) {
    throw new Error(`Official node drag was blocked: ${JSON.stringify({ before, afterDrag })}`);
  }

  const rightClick = await page.evaluate(() => {
    window.__wkNodeContextProbe = 0;
    document.addEventListener("contextmenu", () => { window.__wkNodeContextProbe += 1; }, { capture: true, once: true });
    return true;
  });
  if (!rightClick) throw new Error("Could not install context-menu probe.");
  await page.mouse.click(bodyBox.x + bodyBox.width / 2, bodyBox.y + 8, { button: "right" });
  await page.waitForTimeout(80);
  await page.keyboard.press("Escape");
  await page.mouse.click(bodyBox.x + bodyBox.width / 2, bodyBox.y + 8);
  await page.waitForTimeout(80);
  const selection = await page.evaluate((id) => ({
    selected: Boolean(window.app.canvas.selected_nodes?.[id]),
  }), fixture.firstId);
  if (!selection.selected) {
    throw new Error("Official Nodes 2.0 node selection was blocked.");
  }
  const nodeCountBeforeCopy = await page.evaluate(() => window.app.graph._nodes.length);
  await page.keyboard.press("Control+C");
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(120);
  const nodeCountAfterCopy = await page.evaluate(() => window.app.graph._nodes.length);
  if (nodeCountAfterCopy <= nodeCountBeforeCopy) {
    throw new Error(`Official Nodes 2.0 copy/paste was blocked: ${JSON.stringify({ nodeCountBeforeCopy, nodeCountAfterCopy })}`);
  }
  const textControl = page.locator(`[data-testid="node-body-${fixture.textId}"] textarea, [data-testid="node-body-${fixture.textId}"] input`).first();
  await textControl.waitFor({ state: "visible", timeout: 5_000 });
  await textControl.fill("WK Nodes2 control probe");
  const controlValue = await textControl.inputValue();
  if (controlValue !== "WK Nodes2 control probe") {
    throw new Error(`Official Nodes 2.0 control was blocked: ${controlValue}`);
  }
  const result = await page.evaluate(({ firstId, secondId }) => ({
    firstPosition: window.app.graph.getNodeById(firstId).pos,
    secondPresent: Boolean(window.app.graph.getNodeById(secondId)),
    contextEvents: window.__wkNodeContextProbe,
    overlayPointerEvents: window.getComputedStyle(window.Workspace2CanvasGroups.overlay).pointerEvents,
  }), fixture);
  if (result.contextEvents !== 1 || result.overlayPointerEvents !== "none") {
    throw new Error(`Official node coexistence mismatch: ${JSON.stringify(result)}`);
  }
  console.log(JSON.stringify({ before, afterDrag, selection, nodeCountBeforeCopy, nodeCountAfterCopy, controlValue, result }, null, 2));
} finally {
  await browser.close();
}
