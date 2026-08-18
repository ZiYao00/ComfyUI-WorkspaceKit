// Nodes 2.0 acceptance for WK Latent Size in an isolated browser profile.
// The ComfyUI setting is restored before the profile is discarded.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.app?.graph, null, {
    timeout: 30_000,
    polling: 250,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });

  let originalValue = false;
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    originalValue = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
    await page.reload({ waitUntil: "load", timeout: 30_000 });
    await waitForApp(page);
    await page.waitForTimeout(1_000);

    const report = await page.evaluate((id) => {
      const app = window.app;
      const enabled = app.extensionManager.setting.get(id);
      const node = window.LiteGraph?.createNode?.("WKLatentSize");
      if (!node) throw new Error("WKLatentSize could not be created after Nodes 2.0 activation");
      app.graph.add(node);
      try {
        const nodeId = String(node.id);
        const matchingDom = [...document.querySelectorAll("[data-node-id], [data-id]")]
          .filter((element) => element.dataset.nodeId === nodeId || element.dataset.id === nodeId)
          .map((element) => element.tagName.toLowerCase());
        return {
          enabled,
          nodeTitle: node.title,
          widgets: (node.widgets || []).map((widget) => widget.name),
          outputs: (node.outputs || []).map((output) => `${output.name}:${output.type}`),
          canvasPresent: Boolean(app.canvas?.canvas),
          matchingDom,
          vueNodeElementCount: document.querySelectorAll(".comfy-vue-node, .vue-node, [data-node-id]").length,
        };
      } finally {
        app.graph.remove(node);
        app.graph.change?.();
      }
    }, NODES2_SETTING);

    const expectedWidgets = ["megapixels", "aspect_ratio", "divisible_by", "batch_size", "use_custom_ratio", "custom_aspect_ratio"];
    const expectedOutputs = ["latent:LATENT", "width:INT", "height:INT", "resolution:STRING"];
    if (report.enabled !== true
      || JSON.stringify(report.widgets) !== JSON.stringify(expectedWidgets)
      || JSON.stringify(report.outputs) !== JSON.stringify(expectedOutputs)) {
      throw new Error(`Nodes 2.0 WK Latent Size contract mismatch: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify({ originalValue, report, errors }, null, 2));
  } finally {
    try {
      await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalValue]);
    } catch (error) {
      console.error(`Failed to restore isolated Nodes 2.0 setting: ${error.message}`);
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
