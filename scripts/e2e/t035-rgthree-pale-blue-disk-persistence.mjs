// T-035 real rgthree acceptance: two WK groups with distinct persisted native
// colours must leave exactly the pale_blue group in a real Fast Groups Bypasser
// after save -> full page reload -> workflow-read -> app.loadGraphData.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";
const FIXTURE_PATH = "__WK_TEST__/t035-rgthree-pale-blue-persistence.json";
const MATCH_TITLE = "T035 pale-blue target";
const NON_MATCH_TITLE = "T035 red control";
const PALE_BLUE = "#3f789e";
const RED = "#aa8888";

async function ready(page) {
  await page.waitForFunction(() => window.app?.extensionManager?.setting && window.Workspace2CanvasGroups, null, {
    timeout: 45_000,
    polling: 250,
  });
  await page.evaluate(() => window.Workspace2CanvasGroups.init?.());
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?.overlay), null, { timeout: 10_000, polling: 100 });
  await page.waitForFunction(() => window.WorkspaceKitRgthreeFastGroups?.getDiagnostics?.().status === "installed", null, {
    timeout: 12_000,
    polling: 250,
  });
}

async function verifyFilter(page, { expectRestore }) {
  return page.evaluate(async ({ matchTitle, nonMatchTitle, expectRestore: restored }) => {
    const app = window.app;
    const groups = window.Workspace2CanvasGroups;
    // Drive the actual rgthree service once before asking its node to render.
    // This avoids mistaking its 400ms service cache for a WK colour-filter
    // result, while still exercising the patched public service method.
    const serviceModule = await import("/extensions/rgthree-comfy/services/fast_groups_service.js");
    serviceModule.SERVICE.getGroupsUnsorted(Date.now() + 1_000);
    const bypasser = (app.graph?._nodes || []).find(node => /Fast Groups Bypasser/.test(String(node.type || node.title || "")));
    if (!bypasser) throw new Error("Fast Groups Bypasser node is absent");
    bypasser.properties = bypasser.properties || {};
    bypasser.properties["matchColors"] = "pale_blue";
    bypasser.refreshWidgets?.();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const diagnostics = window.WorkspaceKitRgthreeFastGroups?.getDiagnostics?.();
    const labels = (bypasser.widgets || []).map(widget => widget.label || "").filter(Boolean);
    const groupMap = Object.values(groups.groups || {}).map(group => ({
      title: group.title,
      nativeGroupColor: group.nativeGroupColor,
    }));
    return {
      restored,
      diagnostics,
      labels,
      groupMap,
      expected: { matchTitle, nonMatchTitle },
    };
  }, { matchTitle: MATCH_TITLE, nonMatchTitle: NON_MATCH_TITLE, expectRestore });
}

function assertFiltered(result, phase) {
  const labels = result.labels || [];
  const matching = labels.filter(label => label === `Enable ${MATCH_TITLE}`);
  const nonMatching = labels.filter(label => label.includes(NON_MATCH_TITLE));
  const adapterByTitle = new Map((result.diagnostics?.adapters || []).map(group => [group.title, group]));
  const pale = adapterByTitle.get(MATCH_TITLE);
  const red = adapterByTitle.get(NON_MATCH_TITLE);
  const failures = [
    ["exactly one pale-blue widget row", matching.length === 1],
    ["no red widget row", nonMatching.length === 0],
    ["pale-blue adapter exists", pale?.color === PALE_BLUE],
    ["red adapter exists", red?.color === RED],
    ["two WK group records", (result.groupMap || []).length === 2],
    ["pale-blue persisted group field", result.groupMap?.some(group => group.title === MATCH_TITLE && group.nativeGroupColor === PALE_BLUE)],
    ["red persisted group field", result.groupMap?.some(group => group.title === NON_MATCH_TITLE && group.nativeGroupColor === RED)],
  ].filter(([, ok]) => !ok).map(([name]) => name);
  if (failures.length) throw new Error(`T-035 ${phase} mismatch (${failures.join(", ")}): ${JSON.stringify(result)}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await ready(page);
    const prepared = await page.evaluate(async ({ matchTitle, nonMatchTitle, paleBlue, red }) => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;
      app.graph.clear();
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = {};
      const specs = [
        { title: matchTitle, color: paleBlue, pos: [220, 180] },
        { title: nonMatchTitle, color: red, pos: [680, 180] },
      ];
      for (const spec of specs) {
        const node = window.LiteGraph.createNode("GetNode");
        node.pos = spec.pos;
        app.graph.add(node);
        for (let frame = 0; frame < 20; frame += 1) await new Promise(resolve => requestAnimationFrame(resolve));
        app.canvas.deselectAllNodes?.();
        app.canvas.selectItems?.([node]);
        await groups.createGroupFromSelection();
        const group = Object.values(groups.groups).find(item => item.nodeIds?.map(String).includes(String(node.id)));
        if (!group) throw new Error(`Unable to create ${spec.title}`);
        group.title = spec.title;
        group.nativeGroupColor = spec.color;
        group.headerBgColor = spec.color === paleBlue ? "rgba(63,120,158,0.5)" : "rgba(170,136,136,0.5)";
      }
      const bypasser = window.LiteGraph.createNode("Fast Groups Bypasser (rgthree)");
      if (!bypasser) throw new Error("rgthree Fast Groups Bypasser is unavailable");
      bypasser.pos = [220, 540];
      bypasser.properties = bypasser.properties || {};
      bypasser.properties["matchColors"] = "pale_blue";
      app.graph.add(bypasser);
      groups.syncGroupsToExtra();
      return app.graph.serialize();
    }, { matchTitle: MATCH_TITLE, nonMatchTitle: NON_MATCH_TITLE, paleBlue: PALE_BLUE, red: RED });

    const before = await verifyFilter(page, { expectRestore: false });
    assertFiltered(before, "before-save");
    const saved = await page.evaluate(async ({ path, workflow }) => {
      const response = await fetch("/workspace2/workflow/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, workflow }),
      });
      return { status: response.status, body: await response.json() };
    }, { path: FIXTURE_PATH, workflow: prepared });
    if (saved.status !== 200 || !saved.body?.ok) throw new Error(`Save failed: ${JSON.stringify(saved)}`);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await ready(page);
    const read = await page.evaluate(async ({ path }) => {
      const response = await fetch(`/workspace2/workflow/read?path=${encodeURIComponent(path)}`);
      const payload = await response.json();
      if (!response.ok || !payload?.ok) return { status: response.status, payload };
      await window.app.loadGraphData(payload.workflow);
      for (let frame = 0; frame < 120; frame += 1) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (Object.keys(window.Workspace2CanvasGroups?.groups || {}).length === 2) break;
      }
      return { status: response.status, stored: payload.workflow?.extra?.xzgGroups || {} };
    }, { path: FIXTURE_PATH });
    if (read.status !== 200 || Object.keys(read.stored || {}).length !== 2) throw new Error(`Disk read mismatch: ${JSON.stringify(read)}`);
    const reopened = await verifyFilter(page, { expectRestore: true });
    assertFiltered(reopened, "after-reload");
    await page.screenshot({ path: ".dev-docs/artifacts/t035-rgthree-pale-blue-persistence.png", fullPage: true });
    console.log(JSON.stringify({ fixture: FIXTURE_PATH, saved, before, reopened }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
