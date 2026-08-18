// Read-only Nodes 2.0 acceptance for the test package's selected complex workflow.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const WORKFLOW_PATH = "VIDEO/wan22-i2v-SVI_Kenpechi_v3.5.json";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups?.overlay, null, {
      timeout: 15_000,
      polling: 250,
    });
    const report = await page.evaluate(async (workflowPath) => {
      if (!window.app.extensionManager.setting.get('Comfy.VueNodes.Enabled')) {
        throw new Error('This acceptance requires Nodes 2.0 to be enabled before launch');
      }
      const response = await fetch(`/workspace2/workflow/read?path=${encodeURIComponent(workflowPath)}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.workflow) throw new Error(`Workflow read failed: ${JSON.stringify(payload)}`);
      const expected = {
        nodes: payload.workflow.nodes?.length || 0,
        nativeGroups: payload.workflow.groups?.length || 0,
        wkGroups: Object.keys(payload.workflow.extra?.xzgGroups || {}).length,
      };
      await window.app.loadGraphData(payload.workflow);
      for (let frame = 0; frame < 90; frame += 1) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (window.app.graph?._nodes?.length === expected.nodes && Object.keys(window.Workspace2CanvasGroups.groups || {}).length === expected.wkGroups) break;
      }
      const actual = {
        nodes: window.app.graph?._nodes?.length || 0,
        nativeGroups: (window.app.graph?._groups || []).length,
        wkGroups: Object.keys(window.Workspace2CanvasGroups.groups || {}).length,
        wkOverlays: document.querySelectorAll('.xzg-group-box').length,
        vueNodeCount: document.querySelectorAll('.lg-node').length,
      };
      if (actual.nodes !== expected.nodes || actual.nativeGroups !== expected.nativeGroups
        || actual.wkGroups !== expected.wkGroups || actual.wkOverlays !== expected.wkGroups
        || actual.vueNodeCount !== expected.nodes) {
        throw new Error(`Complex Nodes 2.0 workflow mismatch: ${JSON.stringify({ expected, actual })}`);
      }
      return { workflowPath, expected, actual };
    }, WORKFLOW_PATH);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
