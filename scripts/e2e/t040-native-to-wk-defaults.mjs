// T-040 real-page acceptance.  It uses an in-memory test graph only: no
// workflow endpoint, user workflow, or browser setting is written.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:8190/";

async function waitForGroups(page) {
  await page.waitForFunction(() => window.app?.graph && window.Workspace2CanvasGroups, null, {
    timeout: 45_000,
    polling: 250,
  });
  await page.evaluate(() => window.Workspace2CanvasGroups.init?.());
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?.overlay), null, {
    timeout: 10_000,
    polling: 100,
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForGroups(page);

    const result = await page.evaluate(async () => {
      const { app, LiteGraph } = window;
      const groups = window.Workspace2CanvasGroups;
      app.graph.clear();
      groups.groups = {};
      groups.groupEls = {};
      groups.selectedGroupIds.clear();
      app.graph.extra = {};

      // A fresh native group has no WK archive. It must receive T-040's
      // conversion landing style, while keeping this native title colour.
      const native = new LiteGraph.LGraphGroup("T040 fresh native");
      native.pos = [160, 150];
      native.size = [320, 180];
      native.color = "#3f789e";
      app.graph.add(native);
      const first = groups.convertCurrentWorkflowToWorkspaceKit();
      const fresh = Object.values(groups.groups)[0];

      // Build a WK-origin group with deliberately non-default styling. The
      // forward archive must restore that exact style rather than T-040's
      // fresh-native defaults.
      app.graph.clear();
      groups.groups = {
        "t040-archived": {
          ...groups.getBuiltInStyle(),
          id: "t040-archived",
          title: "T040 archived WK",
          nodeIds: [],
          allowEmpty: true,
          bounds: { x: 200, y: 210, w: 300, h: 160 },
          fontSize: 23,
          titleColor: "#12AB34",
          borderWidth: 5,
          borderOpacity: 0.77,
          backgroundFillEnabled: true,
          backgroundOpacity: 0.22,
          shadowSize: 9,
        },
      };
      groups.groupEls = {};
      groups.syncGroupsToExtra();
      groups.rebuildAllEls();
      const forward = groups.convertCurrentWorkflowToNative();
      const reverse = groups.convertCurrentWorkflowToWorkspaceKit();
      const restored = groups.groups["t040-archived"];
      return { first, fresh, forward, reverse, restored };
    });

    assert.equal(result.first.converted, 1, "fresh native group should convert once");
    assert.equal(result.fresh.fontSize, 16);
    assert.equal(result.fresh.titleColor, "#F2F2F2");
    assert.equal(result.fresh.useUnifiedColor, true);
    assert.equal(result.fresh.colorSat, 0);
    assert.equal(result.fresh.colorLit, 95);
    assert.equal(result.fresh.borderWidth, 2);
    assert.equal(result.fresh.borderOpacity, 0.4);
    assert.equal(result.fresh.headerBgColor, "rgba(63,120,158,0.5)");
    assert.equal(result.fresh.nativeGroupColor, "#3f789e");
    assert.equal(result.fresh.backgroundFillEnabled, false);
    assert.equal(result.fresh.shadowSize, 0);
    assert.equal(result.fresh.cornerRadius, 8);
    assert.equal(result.fresh.contentPadding, 12);
    assert.equal(result.fresh.effect, "none");

    assert.equal(result.forward.converted, 1, "WK group should convert to native once");
    assert.equal(result.reverse.converted, 1, "archived native group should restore once");
    assert.equal(result.restored.fontSize, 23, "archive must retain its own font size");
    assert.equal(result.restored.titleColor, "#12AB34", "archive must retain its own title colour");
    assert.equal(result.restored.borderWidth, 5, "archive must retain its own border width");
    assert.equal(result.restored.borderOpacity, 0.77, "archive must retain its own border opacity");
    assert.equal(result.restored.backgroundFillEnabled, true, "archive must retain its own fill setting");
    assert.equal(result.restored.backgroundOpacity, 0.22, "archive must retain its own fill opacity");
    assert.equal(result.restored.shadowSize, 9, "archive must retain its own shadow");
    console.log(JSON.stringify({ fresh: result.fresh, restored: result.restored }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
