// Read-only Nodes 2.0 runtime audit for the WorkspaceKit test package.
//
// This records observable public runtime state only. It does not toggle the
// renderer and it blocks all mutating requests so the audit cannot alter a
// workflow, library, group, template, or queue.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";

function isMutation(request) {
  return !["GET", "HEAD", "OPTIONS"].includes(request.method());
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

  await page.route("**/*", (route) => {
    if (isMutation(route.request())) {
      route.abort();
      return;
    }
    route.continue();
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 30_000 });
    await page.waitForFunction(() => window.app?.extensionManager && Array.isArray(window.app?.extensions), null, {
      timeout: 30_000,
      polling: 250,
    });
    await page.waitForTimeout(2_000);

    const report = await page.evaluate(() => {
      const app = window.app;
      const canvas = app?.canvas;
      const settingStore = app?.extensionManager?.setting;
      const settingCandidates = [
        "Comfy.VueNodes.Enabled",
        "Comfy.VueNodes",
        "Comfy.UseVueNodes",
      ].map((id) => {
        try {
          return { id, value: settingStore?.get?.(id) ?? null };
        } catch (error) {
          return { id, error: String(error?.message || error) };
        }
      });
      return {
        wkExtension: app.extensions.some((extension) => extension?.name === "comfyui.workspace2"),
        canvasPresent: Boolean(canvas?.canvas),
        canvasConstructor: canvas?.constructor?.name || null,
        graphConstructor: app?.graph?.constructor?.name || null,
        liteGraphPresent: Boolean(window.LiteGraph),
        liteGraphVersion: window.LiteGraph?.VERSION || null,
        canvasRendererClass: document.body?.className || "",
        vueNodeElements: document.querySelectorAll(".comfy-vue-node, .vue-node, [data-node-id]").length,
        settingCandidates,
      };
    });
    console.log(JSON.stringify({ baseUrl: BASE_URL, report, errors }, null, 2));
    if (!report.wkExtension || !report.canvasPresent) {
      throw new Error(`Required baseline unavailable: ${JSON.stringify(report)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
