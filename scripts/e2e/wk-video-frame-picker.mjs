// Real-page acceptance for WK Video Frame Picker.
// Uses an existing video from the isolated :8190 ComfyUI input directory.
// It does not save or modify the source video.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const TEST_VIDEO = process.env.WK_TEST_VIDEO || "v1.mp4";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph
    && window.LiteGraph?.createNode
    && window.app?.extensionManager?.setting, null, {
    timeout: 45_000,
    polling: 250,
  });
  await page.waitForTimeout(500);
}

async function fetchContract(page) {
  return page.evaluate(async (video) => {
    const infoResponse = await fetch("/object_info/WKVideoFramePicker");
    const infoPayload = await infoResponse.json();
    if (!infoResponse.ok || !infoPayload.WKVideoFramePicker) {
      throw new Error(`WKVideoFramePicker object_info failed: ${infoResponse.status}`);
    }
    const metadataResponse = await fetch(
      `/workspacekit/video-frame/metadata?video=${encodeURIComponent(video)}`,
    );
    const metadataPayload = await metadataResponse.json();
    if (!metadataResponse.ok || !metadataPayload?.metadata) {
      throw new Error(metadataPayload?.error || `metadata failed: ${metadataResponse.status}`);
    }
    return {
      info: infoPayload.WKVideoFramePicker,
      metadata: metadataPayload.metadata,
    };
  }, TEST_VIDEO);
}

async function createTestNode(page) {
  return page.evaluate((video) => {
    const app = window.app;
    const original = app.graph.serialize();
    app.graph.clear();

    const node = window.LiteGraph.createNode("WKVideoFramePicker");
    if (!node) throw new Error("WKVideoFramePicker could not be created");
    node.pos = [240, 120];
    app.graph.add(node);

    const videoWidget = node.widgets?.find((item) => item.name === "video");
    const frameWidget = node.widgets?.find((item) => item.name === "frame_index");
    const keyFramesWidget = node.widgets?.find((item) => item.name === "key_frames");
    if (!videoWidget || !frameWidget || !keyFramesWidget) {
      throw new Error("Required picker widgets are missing");
    }

    frameWidget.value = 1;
    frameWidget.callback?.(1);
    videoWidget.value = video;
    videoWidget.callback?.(video);

    window.__wkVfpTest = { original, nodeId: node.id };
    return {
      id: node.id,
      widgets: node.widgets.map((item) => item.name),
      keyFramesHidden: keyFramesWidget.hidden,
      outputs: (node.outputs || []).map((item) => `${item.name}:${item.type}`),
    };
  }, TEST_VIDEO);
}

async function restoreGraph(page) {
  await page.evaluate(() => {
    const state = window.__wkVfpTest;
    if (!state) return;
    const app = window.app;
    const node = app.graph.getNodeById?.(state.nodeId);
    if (node) app.graph.remove(node);
    app.graph.clear();
    app.graph.configure(state.original);
    delete window.__wkVfpTest;
  });
}

async function frameWidgetValue(page) {
  return page.evaluate(() => {
    const state = window.__wkVfpTest;
    const node = state ? window.app.graph.getNodeById?.(state.nodeId) : null;
    return node?.widgets?.find((item) => item.name === "frame_index")?.value;
  });
}

async function keyFramesWidgetValue(page) {
  return page.evaluate(() => {
    const state = window.__wkVfpTest;
    const node = state ? window.app.graph.getNodeById?.(state.nodeId) : null;
    return node?.widgets?.find((item) => item.name === "key_frames")?.value;
  });
}

async function rendererProbe(page, nodes2) {
  const nodeReport = await createTestNode(page);
  assert.deepEqual(nodeReport.widgets.slice(0, 3), ["video", "frame_index", "key_frames"]);
  assert.equal(nodeReport.keyFramesHidden, true);
  assert.deepEqual(nodeReport.outputs, ["frame_image:IMAGE", "batch_frame_image:IMAGE"]);

  const root = page.locator(".wk-vfp").first();
  await root.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const root = document.querySelector(".wk-vfp");
    const timeline = root?.querySelector(".wk-vfp-timeline");
    return timeline
      && timeline.getAttribute("aria-valuemax")
      && Number(timeline.getAttribute("aria-valuemax")) > 1
      && root.querySelector(".wk-vfp-message")?.hidden === true;
  }, null, { timeout: 25_000, polling: 100 });

  await page.waitForFunction(() =>
    document.querySelectorAll(".wk-vfp-thumb.is-ready").length >= 6,
  null, { timeout: 30_000, polling: 100 });

  const initial = await frameWidgetValue(page);
  assert.equal(initial, 1);

  const timeline = page.locator(".wk-vfp-timeline").first();
  const box = await timeline.boundingBox();
  assert.ok(box && box.width > 100 && box.height > 20, "timeline must have a usable pointer target");

  const startX = box.x + box.width * 0.18;
  const endX = box.x + box.width * 0.74;
  const y = box.y + box.height * 0.55;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.waitForTimeout(150);

  const duringDrag = await frameWidgetValue(page);
  const previewDuringDrag = await page.evaluate(() => {
    const root = document.querySelector(".wk-vfp");
    return {
      aria: Number(root?.querySelector(".wk-vfp-timeline")?.getAttribute("aria-valuenow")),
      label: root?.querySelector(".wk-vfp-meta span")?.textContent,
    };
  });

  // The preview/playhead moves while scrubbing, but the persisted backend
  // frame_index is not written until pointerup.
  assert.equal(duringDrag, 1);
  assert.ok(previewDuringDrag.aria > 1, JSON.stringify(previewDuringDrag));

  await page.mouse.up();
  await page.waitForFunction(() => {
    const state = window.__wkVfpTest;
    const node = state ? window.app.graph.getNodeById?.(state.nodeId) : null;
    return Number(node?.widgets?.find((item) => item.name === "frame_index")?.value) > 1;
  }, null, { timeout: 5_000 });

  const afterDrag = Number(await frameWidgetValue(page));
  const contract = await fetchContract(page);
  const expected = 1 + Math.round(0.74 * (contract.metadata.total_frames - 1));
  assert.ok(Math.abs(afterDrag - expected) <= 2, `expected about ${expected}, got ${afterDrag}`);

  const nextButton = root.getByRole("button", { name: "Next frame" });
  await nextButton.click();
  await page.waitForTimeout(100);
  assert.equal(Number(await frameWidgetValue(page)), Math.min(contract.metadata.total_frames, afterDrag + 1));

  // Marker V2: toggle add/remove, navigate by Marker, and clear all without
  // changing the V1 frame output contract.
  const markerButton = root.getByRole("button", { name: "Toggle marker" });
  const clearButton = root.getByRole("button", { name: "Clear markers" });
  const firstMarkerFrame = Number(await frameWidgetValue(page));
  await markerButton.click();
  await page.waitForTimeout(80);
  assert.equal(await keyFramesWidgetValue(page), `[${firstMarkerFrame}]`);
  assert.equal(await markerButton.getAttribute("aria-pressed"), "true");
  assert.equal(await root.locator(".wk-vfp-marker").count(), 1);

  await nextButton.click();
  await page.waitForTimeout(80);
  const secondMarkerFrame = Number(await frameWidgetValue(page));
  await markerButton.click();
  await page.waitForTimeout(80);
  assert.equal(await keyFramesWidgetValue(page), `[${firstMarkerFrame},${secondMarkerFrame}]`);
  assert.equal(await root.locator(".wk-vfp-marker").count(), 2);

  await root.getByRole("button", { name: `Go to marker at frame ${firstMarkerFrame}` }).click();
  await page.waitForTimeout(80);
  assert.equal(Number(await frameWidgetValue(page)), firstMarkerFrame);
  assert.equal(await markerButton.getAttribute("aria-pressed"), "true");

  await markerButton.click();
  await page.waitForTimeout(80);
  assert.equal(await keyFramesWidgetValue(page), `[${secondMarkerFrame}]`,
    "toggling a marked current frame must remove only that Marker");

  await clearButton.click();
  await page.waitForTimeout(80);
  assert.equal(await keyFramesWidgetValue(page), "[]");
  assert.equal(await root.locator(".wk-vfp-marker").count(), 0);

  const serialized = await page.evaluate(() => {
    const state = window.__wkVfpTest;
    const node = window.app.graph.getNodeById?.(state.nodeId);
    const data = node.serialize();
    const copy = window.LiteGraph.createNode("WKVideoFramePicker");
    copy.configure(data);

    // Simulate a real V1 workflow written before key_frames existed: only the
    // original positional widget values are present and there is no named map.
    const legacyData = structuredClone(data);
    legacyData.widgets_values = data.widgets_values.slice(0, 2);
    delete legacyData.widgets_values_named;
    const legacyCopy = window.LiteGraph.createNode("WKVideoFramePicker");
    legacyCopy.configure(legacyData);

    return {
      values: Object.fromEntries(node.widgets.map((item) => [item.name, item.value])),
      restored: Object.fromEntries(copy.widgets.map((item) => [item.name, item.value])),
      legacyRestored: Object.fromEntries(legacyCopy.widgets.map((item) => [item.name, item.value])),
      domWidgetSerialized: data.widgets_values?.length,
      uiWidgetSerialize: node.widgets.find((item) => item.name === "video_frame_picker_ui")?.serialize,
      nodes2: window.app.extensionManager.setting.get("Comfy.VueNodes.Enabled"),
    };
  });

  assert.equal(serialized.values.video, TEST_VIDEO);
  assert.equal(serialized.restored.video, TEST_VIDEO);
  assert.equal(serialized.restored.frame_index, serialized.values.frame_index);
  assert.equal(serialized.values.key_frames, "[]");
  assert.equal(serialized.restored.key_frames, "[]");
  assert.equal(serialized.legacyRestored.video, TEST_VIDEO);
  assert.equal(serialized.legacyRestored.frame_index, serialized.values.frame_index);
  assert.equal(serialized.legacyRestored.key_frames, "[]",
    "V1 workflows must acquire the V2 Marker default without migration");
  assert.equal(serialized.uiWidgetSerialize, false);
  assert.equal(serialized.domWidgetSerialized, 3,
    "video, frame_index, and hidden key_frames must enter widgets_values");
  assert.equal(serialized.nodes2, nodes2);

  const thumbnailsReady = await page.locator(".wk-vfp-thumb.is-ready").count();
  const markerLayer = await page.locator(".wk-vfp-marker-layer[data-future-marker-layer='true']").count();
  assert.ok(thumbnailsReady >= 6);
  assert.equal(markerLayer, 1);

  return {
    nodes2,
    metadata: contract.metadata,
    afterDrag,
    thumbnailsReady,
    serialized,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const relevantErrors = [];

  page.on("pageerror", (error) => {
    if (/WKVideoFramePicker|video-frame-picker|wk-vfp/i.test(error.message || "")) {
      relevantErrors.push(`pageerror: ${error.message}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /WKVideoFramePicker|video-frame-picker|wk-vfp/i.test(message.text())) {
      relevantErrors.push(`console.error: ${message.text()}`);
    }
  });

  let originalSetting;
  const reports = [];
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
    await waitForApp(page);

    const contract = await fetchContract(page);
    assert.deepEqual(contract.info.output, ["IMAGE", "IMAGE"]);
    assert.deepEqual(contract.info.output_name, ["frame_image", "batch_frame_image"]);
    assert.deepEqual(Object.keys(contract.info.input.required), ["video", "frame_index", "key_frames"]);
    assert.equal(contract.info.input.required.key_frames[1].default, "[]");
    assert.ok(contract.info.input.required.video[0].includes(TEST_VIDEO));
    assert.equal(contract.metadata.fps, 24);
    assert.equal(contract.metadata.total_frames, 328);

    originalSetting = await page.evaluate((id) =>
      window.app.extensionManager.setting.get(id), NODES2_SETTING);

    for (const nodes2 of [false, true]) {
      await page.evaluate(([id, value]) =>
        window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, nodes2]);
      await page.reload({ waitUntil: "load", timeout: 45_000 });
      await waitForApp(page);
      try {
        reports.push(await rendererProbe(page, nodes2));
      } finally {
        await restoreGraph(page);
      }
    }

    assert.deepEqual(relevantErrors, []);
    console.log(JSON.stringify({ video: TEST_VIDEO, reports, relevantErrors }, null, 2));
  } finally {
    if (originalSetting !== undefined) {
      try {
        await page.evaluate(([id, value]) =>
          window.app?.extensionManager?.setting?.set?.(id, value), [NODES2_SETTING, originalSetting]);
      } catch (error) {
        console.error(`Could not restore Nodes 2.0 setting: ${error.message}`);
      }
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
