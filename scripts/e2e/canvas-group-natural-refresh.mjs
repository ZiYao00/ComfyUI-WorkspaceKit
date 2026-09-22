// Natural page-refresh regression for WorkspaceKit groups.
// This intentionally does NOT call Workspace2CanvasGroups.init() or app.loadGraphData()
// after reload. Production startup must restore the group on its own.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";

async function waitForRuntime(page) {
  await page.waitForFunction(() => (
    window.Workspace2CanvasGroups?.initialized
    && window.Workspace2CanvasGroups?.overlay
    && window.app?.graph?._nodes?.length >= 2
    && window.app?.canvas
  ), null, { timeout: 60_000, polling: 250 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForRuntime(page);

    const before = await page.evaluate(async () => {
      const app = window.app;
      const groups = window.Workspace2CanvasGroups;

      // Keep the regression isolated from whatever group state the test package
      // happened to load. Nothing here is saved back to disk.
      for (const gid of Object.keys(groups.groups || {})) groups.killGroup(gid);
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = app.graph.extra || {};
      app.graph.extra.xzgGroups = {};
      localStorage.removeItem("xzg_groups_backup");

      const nodes = app.graph._nodes.slice(0, 2);
      app.canvas.deselectAllNodes?.();
      app.canvas.selectItems?.(nodes);
      await groups.createGroupFromSelection();
      await new Promise((resolve) => setTimeout(resolve, 200));

      const groupId = Object.keys(groups.groups)[0];
      const group = groups.groups[groupId];
      if (!groupId || !group) throw new Error("WorkspaceKit group creation failed before refresh");

      return {
        id: groupId,
        title: group.title,
        nodeIds: [...group.nodeIds].map(String).sort(),
        nodeSignature: groups._currentRecoveryScope().nodeSignature,
        serializedCount: Object.keys(app.graph.serialize()?.extra?.xzgGroups || {}).length,
      };
    });

    if (before.serializedCount !== 1) {
      throw new Error(`Group was absent before refresh: ${JSON.stringify(before)}`);
    }

    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForRuntime(page);

    await page.waitForFunction((groupId) => Boolean(window.Workspace2CanvasGroups?.groups?.[groupId]), before.id, {
      timeout: 15_000,
      polling: 100,
    });

    const after = await page.evaluate((groupId) => {
      const groups = window.Workspace2CanvasGroups;
      const group = groups.groups[groupId];
      return {
        id: group?.id,
        title: group?.title,
        nodeIds: [...(group?.nodeIds || [])].map(String).sort(),
        nodeSignature: groups._currentRecoveryScope().nodeSignature,
        domCount: document.querySelectorAll(".xzg-group-box").length,
        restoreReady: groups._restoreReady,
        lastRestoreCount: window.Workspace2CanvasGroupsLastRestore?.groupCount ?? null,
      };
    }, before.id);

    if (
      after.id !== before.id
      || after.title !== before.title
      || JSON.stringify(after.nodeIds) !== JSON.stringify(before.nodeIds)
      || after.nodeSignature !== before.nodeSignature
      || after.domCount < 1
      || after.restoreReady !== true
      || after.lastRestoreCount < 1
    ) {
      throw new Error(`Natural refresh restore mismatch: ${JSON.stringify({ before, after })}`);
    }

    console.log(JSON.stringify({ before, after }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
