// T-102-R1 real-disk acceptance: WorkspaceKit group -> native group ->
// WorkspaceKit workflow endpoint -> page reload -> endpoint read -> actual
// app.loadGraphData.  This deliberately does not treat in-memory serialize()
// as persistence evidence.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const FIXTURE_PATH = "__WK_TEST__/t102-conversion-disk-persistence.json";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";
const NATIVE_COLOR = "#9f7aea";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups, null, {
    // A cold ComfyUI test-package page can mount the extension after more
    // than 20s while the plugin/node inventory settles.  This is only a
    // readiness boundary; no test mutation begins before it resolves.
    timeout: 45_000,
    polling: 250,
  });
  // Current ComfyUI can expose the module before its startup stage calls
  // init(). T-102 concerns the save/reload boundary, so complete the module's
  // existing idempotent initialization instead of making a timing race look
  // like a persistence failure.
  await page.evaluate(() => window.Workspace2CanvasGroups.init?.());
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?.overlay), null, {
    timeout: 10_000,
    polling: 100,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let originalNodes2 = false;
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    originalNodes2 = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    if (!originalNodes2) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, true]);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForGroups(page);
    }

    const prepared = await page.evaluate(async ({ color }) => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      app.graph.clear();
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = {};

      const first = window.LiteGraph.createNode("GetNode");
      const second = window.LiteGraph.createNode("GetNode");
      first.pos = [220, 180];
      second.pos = [500, 300];
      app.graph.add(first);
      app.graph.add(second);
      for (let frame = 0; frame < 30; frame += 1) await new Promise(resolve => requestAnimationFrame(resolve));
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.([first, second]);
      await groups.createGroupFromSelection();
      const group = Object.values(groups.groups)[0];
      if (!group) throw new Error("Unable to create test WorkspaceKit group");
      group.title = "T102 native colour persistence";
      group.nativeGroupColor = color;
      group.headerBgColor = "rgba(159, 122, 234, 0.62)";
      groups.syncGroupsToExtra();
      const result = groups.convertCurrentWorkflowToNative();
      if (result?.converted !== 1 || app.graph._groups?.length !== 1) {
        throw new Error(`Forward conversion mismatch: ${JSON.stringify(result)}`);
      }
      const workflow = app.graph.serialize();
      const archive = workflow?.extra?.workspacekit?.groupConversion;
      const native = (workflow?.groups || workflow?._groups || [])[0];
      return {
        workflow,
        expected: {
          title: group.title,
          nativeColor: color,
          archiveColor: archive?.groups?.[group.id]?.nativeGroupColor,
          representation: workflow?.extra?.workspacekit?.groupRepresentation,
          nativeColorInGraph: native?.color,
        },
      };
    }, { color: NATIVE_COLOR });

    if (prepared.expected.representation !== "native" || prepared.expected.archiveColor !== NATIVE_COLOR) {
      throw new Error(`Pre-save archive mismatch: ${JSON.stringify(prepared.expected)}`);
    }

    const saved = await page.evaluate(async ({ path, workflow }) => {
      const response = await fetch("/workspace2/workflow/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, workflow }),
      });
      return { status: response.status, body: await response.json() };
    }, { path: FIXTURE_PATH, workflow: prepared.workflow });
    if (saved.status !== 200 || !saved.body?.ok) throw new Error(`Save failed: ${JSON.stringify(saved)}`);

    // A complete page reload ensures neither graph nor in-memory conversion
    // state can satisfy the check.  The following data is fetched from disk
    // through WorkspaceKit's normal workflow-read endpoint.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);
    const reopened = await page.evaluate(async ({ path }) => {
      const response = await fetch(`/workspace2/workflow/read?path=${encodeURIComponent(path)}`);
      const payload = await response.json();
      if (!response.ok || !payload?.ok) return { status: response.status, payload };
      await window.app.loadGraphData(payload.workflow);
      for (let frame = 0; frame < 90; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        if ((window.app.graph?._groups || []).length === 1) break;
      }
      const graph = window.app.graph;
      const archive = graph?.extra?.workspacekit?.groupConversion;
      const native = (graph?._groups || [])[0];
      return {
        status: response.status,
        fileRepresentation: payload.workflow?.extra?.workspacekit?.groupRepresentation,
        fileArchiveColor: Object.values(payload.workflow?.extra?.workspacekit?.groupConversion?.groups || {})[0]?.nativeGroupColor,
        graphRepresentation: graph?.extra?.workspacekit?.groupRepresentation,
        graphNativeCount: (graph?._groups || []).length,
        graphNativeTitle: native?.title,
        graphNativeColor: native?.color,
        graphArchiveColor: Object.values(archive?.groups || {})[0]?.nativeGroupColor,
        overlayCount: document.querySelectorAll(".xzg-group-box").length,
      };
    }, { path: FIXTURE_PATH });

    const expected = prepared.expected;
    const failures = [
      ["file representation", reopened.fileRepresentation === "native"],
      ["file archive colour", reopened.fileArchiveColor === expected.nativeColor],
      ["graph representation", reopened.graphRepresentation === "native"],
      ["native group count", reopened.graphNativeCount === 1],
      ["native group title", reopened.graphNativeTitle === expected.title],
      ["native graph colour", reopened.graphNativeColor === expected.nativeColor],
      ["graph archive colour", reopened.graphArchiveColor === expected.nativeColor],
      ["no WorkspaceKit overlay remains", reopened.overlayCount === 0],
    ].filter(([, ok]) => !ok).map(([name]) => name);
    if (failures.length) {
      throw new Error(`T-102-R1 disk persistence mismatch (${failures.join(", ")}): ${JSON.stringify({ expected, reopened })}`);
    }
    await page.screenshot({ path: ".dev-docs/artifacts/t102-conversion-disk-persistence.png", fullPage: true });
    console.log(JSON.stringify({ fixture: FIXTURE_PATH, expected, saved, reopened }, null, 2));
  } finally {
    await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalNodes2]).catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
