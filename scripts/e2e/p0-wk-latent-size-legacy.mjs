// Real-page Legacy Canvas acceptance for WK Latent Size.
// Creates one disposable in-memory node and always removes it before exit.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await page.waitForFunction(() => window.app?.graph && window.LiteGraph?.createNode, null, {
      timeout: 30_000,
      polling: 250,
    });
    await page.waitForTimeout(1_000);
    const report = await page.evaluate(() => {
      const node = window.LiteGraph.createNode("WKLatentSize");
      if (!node) throw new Error("LiteGraph could not create WKLatentSize");
      window.app.graph.add(node);
      try {
        return {
          title: node.title,
          inputNames: (node.inputs || []).map((input) => input.name),
          inputTypes: (node.inputs || []).map((input) => input.type),
          outputNames: (node.outputs || []).map((output) => output.name),
          outputTypes: (node.outputs || []).map((output) => output.type),
          widgetNames: (node.widgets || []).map((widget) => widget.name),
        };
      } finally {
        window.app.graph.remove(node);
        window.app.graph.change?.();
      }
    });
    const expectedInputs = ["megapixels", "aspect_ratio", "divisible_by", "batch_size", "use_custom_ratio", "custom_aspect_ratio"];
    const expectedOutputs = ["latent", "width", "height", "resolution"];
    if (JSON.stringify(report.inputNames) !== JSON.stringify(expectedInputs)
      || JSON.stringify(report.outputNames) !== JSON.stringify(expectedOutputs)
      || JSON.stringify(report.outputTypes) !== JSON.stringify(["LATENT", "INT", "INT", "STRING"])) {
      throw new Error(`WK Latent Size page contract mismatch: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify({ report, errors }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
