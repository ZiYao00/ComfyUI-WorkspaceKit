// Real-page acceptance for WK Resolution Preset / Video Duration.
// Uses only in-memory graphs and API prompts; never saves a user workflow or image.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";
const TYPES = ["WKResolutionPreset", "WKVideoDuration"];

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph && window.LiteGraph?.createNode
    && window.app?.extensionManager?.setting, null, { timeout: 45_000, polling: 250 });
  await page.waitForTimeout(600);
}

async function objectInfoProbe(page) {
  return page.evaluate(async (types) => {
    const result = {};
    for (const type of types) {
      const response = await fetch(`/object_info/${type}`);
      if (!response.ok) throw new Error(`object_info failed for ${type}: ${response.status}`);
      const payload = await response.json();
      result[type] = payload[type];
    }
    const retiredResponse = await fetch("/object_info/WKFrameCount");
    const retiredPayload = retiredResponse.ok ? await retiredResponse.json() : {};
    result.WKFrameCountRetired = !retiredPayload.WKFrameCount;
    return result;
  }, TYPES);
}

async function apiPromptProbe(page) {
  return page.evaluate(async () => {
    const prompt = {
      "1": {
        class_type: "WKResolutionPreset",
        inputs: {
          aspect_ratio: "▯ 2:3",
          resolution_level: "2K",
          use_custom: false,
          custom_width: 1024,
          custom_height: 1024,
        },
      },
      "2": {
        class_type: "ShowText|pysssss",
        inputs: { text: ["1", 2] },
      },
      "3": {
        class_type: "WKVideoDuration",
        inputs: {
          profile: "MiniMax H3 Local · 17n+5",
          duration_seconds: 5.0,
        },
      },
      "4": {
        class_type: "ShowText|pysssss",
        inputs: { text: ["3", 3] },
      },
    };

    const queued = await fetch("/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const result = await queued.json();
    if (!queued.ok || result.error || !result.prompt_id) {
      throw new Error(`prompt submission failed: ${JSON.stringify(result)}`);
    }

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      const response = await fetch(`/history/${result.prompt_id}`);
      const history = await response.json();
      const item = history[result.prompt_id];
      if (item) {
        const status = item.status || {};
        if (status.status_str === "error" || status.completed === false) {
          throw new Error(`utility prompt execution failed: ${JSON.stringify(item)}`);
        }
        if (status.completed === true || status.status_str === "success") {
          return {
            promptId: result.prompt_id,
            status,
            outputs: item.outputs,
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out waiting for utility-node API prompt history");
  });
}

async function rendererProbe(page) {
  return page.evaluate(async () => {
    const app = window.app;
    const original = app.graph.serialize();
    app.graph.clear();
    const nodes = [];
    try {
      for (const type of ["WKResolutionPreset", "WKVideoDuration"]) {
        const node = window.LiteGraph.createNode(type);
        if (!node) throw new Error(`Could not create ${type}`);
        app.graph.add(node);
        nodes.push(node);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      const resolution = nodes[0];
      const duration = nodes[1];

      resolution.widgets.find((w) => w.name === "aspect_ratio").value = "▭ 16:9";
      resolution.widgets.find((w) => w.name === "resolution_level").value = "3K";
      duration.widgets.find((w) => w.name === "profile").value = "MiniMax H3 Local · 17n+5";
      duration.widgets.find((w) => w.name === "duration_seconds").value = 15.0;

      const report = [];
      for (const node of nodes) {
        const serialized = node.serialize();
        const copy = window.LiteGraph.createNode(node.type);
        if (!copy) throw new Error(`Could not create copy of ${node.type}`);
        copy.configure(serialized);
        report.push({
          type: node.type,
          title: node.title,
          outputs: (node.outputs || []).map((output) => output.type),
          widgets: (node.widgets || []).map((widget) => widget.name),
          values: Object.fromEntries((node.widgets || []).map((widget) => [widget.name, widget.value])),
          restored: Object.fromEntries((copy.widgets || []).map((widget) => [widget.name, widget.value])),
        });
      }
      return report;
    } finally {
      app.graph.clear();
      app.graph.configure(original);
    }
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  let originalSetting;
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
    await waitForApp(page);

    const info = await objectInfoProbe(page);
    assert.ok(info.WKResolutionPreset);
    assert.ok(info.WKVideoDuration);
    assert.equal(info.WKFrameCountRetired, true);
    assert.deepEqual(info.WKResolutionPreset.output, ["INT", "INT", "STRING"]);
    assert.deepEqual(info.WKVideoDuration.output, ["INT", "FLOAT", "FLOAT", "STRING"]);

    const resolutionInputs = info.WKResolutionPreset.input.required;
    assert.deepEqual(resolutionInputs.aspect_ratio[0], [
      "▯ 4:5", "▯ 3:4", "▯ 2:3", "▯ 9:16",
      "■ 1:1",
      "▭ 5:4", "▭ 4:3", "▭ 3:2", "▭ 16:9", "▭ 2:1",
    ]);
    assert.deepEqual(resolutionInputs.resolution_level[0], ["1K", "2K", "3K", "4K", "6K", "8K"]);

    const durationInputs = info.WKVideoDuration.input.required;
    assert.equal(durationInputs.duration_seconds[1].step, 0.1);
    assert.equal(durationInputs.duration_seconds[1].round, 0.1);
    assert.deepEqual(Object.keys(durationInputs), ["profile", "duration_seconds"]);

    const api = await apiPromptProbe(page);
    assert.equal(api.status.completed, true);

    originalSetting = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    const reports = [];

    for (const enabled of [false, true]) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, enabled]);
      await page.reload({ waitUntil: "load", timeout: 45_000 });
      await waitForApp(page);
      const result = await rendererProbe(page);

      const resolution = result.find((item) => item.type === "WKResolutionPreset");
      const duration = result.find((item) => item.type === "WKVideoDuration");

      assert.deepEqual(resolution.outputs, ["INT", "INT", "STRING"]);
      assert.deepEqual(duration.outputs, ["INT", "FLOAT", "FLOAT", "STRING"]);

      assert.deepEqual(resolution.widgets, [
        "aspect_ratio",
        "resolution_level",
        "use_custom",
        "custom_width",
        "custom_height",
      ]);
      assert.deepEqual(duration.widgets, ["profile", "duration_seconds"]);

      assert.equal(resolution.restored.aspect_ratio, "▭ 16:9");
      assert.equal(resolution.restored.resolution_level, "3K");
      assert.equal(duration.restored.duration_seconds, 15);

      reports.push({ nodes2: enabled, result });
    }

    assert.equal(
      errors.filter((error) => /WKResolutionPreset|WKVideoDuration|WKFrameCount/i.test(error)).length,
      0,
      JSON.stringify(errors),
    );
    console.log(JSON.stringify({ info: Object.keys(info), api, reports, errors }, null, 2));
  } finally {
    if (originalSetting !== undefined) {
      try {
        await page.evaluate(([id, value]) => window.app?.extensionManager?.setting?.set?.(id, value),
          [NODES2_SETTING, originalSetting]);
      } catch (error) {
        console.error(`Could not restore isolated renderer setting: ${error.message}`);
      }
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
