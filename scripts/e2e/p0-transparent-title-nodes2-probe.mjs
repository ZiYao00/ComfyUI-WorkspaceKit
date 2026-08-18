import { chromium } from "playwright";

const BASE_URL = process.env.COMFY_BASE_URL || "http://127.0.0.1:8190/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.waitForFunction(() => window.app?.graph && window.LiteGraph, null, { timeout: 25_000 });
  const result = await page.evaluate(async () => {
    const node = LiteGraph.createNode("Workspace2Title");
    if (!node) return { created: false };
    node.pos = [200, 200];
    app.graph.add(node);
    app.graph.setDirtyCanvas?.(true, true);
    app.graph.change?.();
    window.__wkNode2TitleProbeId = node.id;
    return { created: true, id: node.id };
  });
  if (result.created) {
    await page.waitForFunction((id) => document.querySelector(`[data-node-id="${id}"]`), result.id, { timeout: 5_000 });
  }
  const details = await page.evaluate(() => {
    const node = app.graph._nodes.find((item) => String(item.id) === String(window.__wkNode2TitleProbeId));
    if (!node) return { created: false };
    const body = document.querySelector(`[data-testid="node-body-${node.id}"]`);
    const element = body?.closest(".lg-node") || null;
    const result = {
      created: true,
      id: node.id,
      size: [...node.size],
      title: node.title,
      dom: Boolean(element),
      text: element?.textContent || "",
      rect: element?.getBoundingClientRect().toJSON() || null,
      overlay: element?.querySelector(":scope > .workspace2-title-node2-overlay")?.textContent || "",
    };
    const rect = element?.getBoundingClientRect();
    const clickPoint = rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
    const targetAtPoint = clickPoint ? document.elementFromPoint(clickPoint.x, clickPoint.y) : null;
    return {
      ...result,
      clickPoint,
      targetAtPoint: targetAtPoint ? { tag: targetAtPoint.tagName, className: targetAtPoint.className, nodeId: targetAtPoint.closest?.('[data-node-id]')?.dataset?.nodeId || null } : null,
    };
  });
  Object.assign(result, details);
  if (!details.dom || !details.overlay) {
    throw new Error(`Node 2.0 title visual was not mounted: ${JSON.stringify(details)}`);
  }
  await page.mouse.dblclick(details.clickPoint.x, details.clickPoint.y);
  await page.waitForSelector('.workspace2-title-editor', { timeout: 3_000 });
  result.editorOpened = true;
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const node = app.graph._nodes.find((item) => String(item.id) === String(window.__wkNode2TitleProbeId));
    if (node) app.graph.remove(node);
    delete window.__wkNode2TitleProbeId;
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
