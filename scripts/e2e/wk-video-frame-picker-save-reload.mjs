// Persisted-workflow acceptance for WK Video Frame Picker.
// Creates exactly one temporary __WK_TEST__ workflow, verifies save/reload state,
// then removes only that test workflow through WorkspaceKit trash APIs.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const TEST_VIDEO = process.env.WK_TEST_VIDEO || "v1.mp4";
const TEST_FRAME = 123;
const TEST_PATH = `__WK_TEST__/wk-video-frame-picker-save-reload-${Date.now()}.json`;
const OFFICIAL_PATH = `workflows/${TEST_PATH}`;
const WORKSPACEKIT_SIDEBAR_SELECTOR = [
  '[data-tab-id="workspace2"]',
  '[data-sidebar-tab-id="workspace2"]',
  '[aria-label="WorkspaceKit"]',
  '.workspace2-tab-button',
].join(", ");

const EMPTY_GRAPH = Object.freeze({
  last_node_id: 0,
  last_link_id: 0,
  nodes: [],
  links: [],
  groups: [],
  config: {},
  extra: {},
  version: 0.4,
});

async function postJson(page, path, body) {
  return page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `${response.status} ${response.statusText}`);
    }
    return payload;
  }, { path, body });
}

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph
    && window.app?.extensionManager?.workflow
    && window.LiteGraph?.createNode, null, { timeout: 45_000, polling: 250 });
  await page.waitForTimeout(500);
}

async function openWorkspaceWorkflows(page) {
  const sidebarButton = page.locator(WORKSPACEKIT_SIDEBAR_SELECTOR).first();
  await sidebarButton.waitFor({ state: "visible", timeout: 45_000 });
  if (!(await sidebarButton.evaluate((el) => el.classList.contains("side-bar-button-selected")))) {
    await sidebarButton.click();
  }
  await page.waitForSelector('[data-workspace2-module-id="workflows"]', { timeout: 15_000 });
  await page.locator('[data-workspace2-module-id="workflows"]').click();
  await page.waitForSelector(".workspace2-module-frame.workspace2-workflow-blueprint", { timeout: 15_000 });
}

async function openTestWorkflow(page) {
  await page.evaluate(async () => window.app.extensionManager.workflow.syncWorkflows?.());
  await openWorkspaceWorkflows(page);

  const folderRow = page.locator('[data-workspace2-item-path="__WK_TEST__"]');
  if (await folderRow.count()) {
    const disclosure = folderRow.locator(".workspace2-disclosure");
    if (await disclosure.count() && !(await disclosure.evaluate((el) => el.classList.contains("is-open")))) {
      await disclosure.click();
    }
  }

  const browseRow = page.locator(`[data-workspace2-item-path="${TEST_PATH}"]`);
  await browseRow.waitFor({ state: "visible", timeout: 15_000 });
  await browseRow.click();
  await page.waitForFunction(
    (officialPath) => window.app?.extensionManager?.workflow?.activeWorkflow?.path === officialPath,
    OFFICIAL_PATH,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(350);
}

async function pickerState(page) {
  return page.evaluate(() => {
    const node = (window.app?.graph?._nodes || []).find((item) => item.type === "WKVideoFramePicker");
    if (!node) return null;
    const video = node.widgets?.find((item) => item.name === "video")?.value;
    const frameIndex = node.widgets?.find((item) => item.name === "frame_index")?.value;
    const keyFrames = node.widgets?.find((item) => item.name === "key_frames")?.value;
    const serialized = node.serialize();
    return {
      video,
      frameIndex,
      keyFrames,
      outputNames: (node.outputs || []).map((item) => item.name),
      widgetsValues: serialized.widgets_values,
      hasUiWidget: Boolean(node.widgets?.find((item) => item.name === "video_frame_picker_ui")),
    };
  });
}

async function waitForVisualRestore(page, frame = TEST_FRAME) {
  await page.locator(".wk-vfp").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction((expectedFrame) => {
    const timeline = document.querySelector(".wk-vfp-timeline");
    const root = document.querySelector(".wk-vfp");
    return Number(timeline?.getAttribute("aria-valuenow")) === expectedFrame
      && Number(timeline?.getAttribute("aria-valuemax")) >= expectedFrame
      && root?.querySelector(".wk-vfp-message")?.hidden === true;
  }, frame, { timeout: 25_000, polling: 100 });
}

async function cleanup(page) {
  try {
    await page.evaluate(async (officialPath) => {
      const store = window.app?.extensionManager?.workflow;
      const workflow = store?.getWorkflowByPath?.(officialPath);
      if (workflow && store?.activeWorkflow === workflow) {
        await window.app?.loadGraphData?.();
      }
      if (workflow && store?.openWorkflows?.includes?.(workflow)) {
        await store.closeWorkflow?.(workflow);
      }
    }, OFFICIAL_PATH);
  } catch {}

  try {
    const moved = await postJson(page, "/workspace2/trash/move", { path: TEST_PATH });
    if (moved?.item?.id) {
      await postJson(page, "/workspace2/trash/system_delete", { trash_id: moved.item.id });
    }
  } catch {}
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];

page.on("pageerror", (error) => {
  if (/workspacekit|workspace2|WKVideoFramePicker|video-frame-picker|wk-vfp/i.test(error.message || "")) {
    errors.push(`pageerror: ${error.message}`);
  }
});
page.on("console", (message) => {
  if (message.type() === "error"
    && /WKVideoFramePicker|video-frame-picker|wk-vfp/i.test(message.text())) {
    errors.push(`console.error: ${message.text()}`);
  }
});

try {
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
  await waitForApp(page);

  await postJson(page, "/workspace2/workflow/save", { path: TEST_PATH, workflow: EMPTY_GRAPH });
  await openTestWorkflow(page);

  await page.evaluate(([video, frame]) => {
    const app = window.app;
    const workflow = app?.extensionManager?.workflow?.activeWorkflow;
    const tracker = workflow?.changeTracker;
    const picker = window.LiteGraph.createNode("WKVideoFramePicker");
    if (!picker) throw new Error("WKVideoFramePicker unavailable");

    picker.pos = [180, 100];
    picker.widgets.find((item) => item.name === "video").value = video;
    picker.widgets.find((item) => item.name === "frame_index").value = frame;

    tracker?.beforeChange?.();
    app.graph.add(picker);
    tracker?.afterChange?.();
  }, [TEST_VIDEO, TEST_FRAME]);

  await waitForVisualRestore(page);

  const topbarSave = page.locator(".workspacekit-topbar-save-button");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === true,
  null, { timeout: 15_000 });
  await topbarSave.click();
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === false,
  null, { timeout: 20_000 });
  await page.waitForTimeout(250);

  assert.equal(await topbarSave.getAttribute("data-dirty"), "false");

  // Marker edits are persisted state and must dirty the workflow exactly like
  // a normal widget edit.
  const markerButton = page.locator(".wk-vfp").first().getByRole("button", { name: "Toggle marker" });
  await markerButton.click();
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === true,
  null, { timeout: 5_000 });
  let markerState = await pickerState(page);
  assert.equal(markerState.keyFrames, `[${TEST_FRAME}]`);
  assert.equal(await page.locator(".wk-vfp-marker").count(), 1);

  await topbarSave.click();
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === false,
  null, { timeout: 20_000 });

  // Scrubbing is preview-only until pointerup: the persisted frame_index and
  // workflow dirty state must stay unchanged throughout pointermove.
  const timeline = page.locator(".wk-vfp-timeline").first();
  const box = await timeline.boundingBox();
  assert.ok(box && box.width > 100 && box.height > 20);
  const currentFraction = (TEST_FRAME - 1) / 327;
  const startX = box.x + box.width * currentFraction;
  const endFraction = 0.68;
  const endX = box.x + box.width * endFraction;
  const y = box.y + box.height * 0.55;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.waitForTimeout(150);

  const duringDrag = await pickerState(page);
  assert.equal(Number(duringDrag.frameIndex), TEST_FRAME,
    "pointermove must not write frame_index");
  assert.equal(await page.evaluate(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified), false,
  "pointermove must not dirty the workflow");
  assert.ok(Number(await timeline.getAttribute("aria-valuenow")) > TEST_FRAME,
    "visual Playhead must move during scrub");

  await page.mouse.up();
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === true,
  null, { timeout: 5_000 });

  const afterScrub = await pickerState(page);
  const scrubbedFrame = Number(afterScrub.frameIndex);
  const totalFrames = Number(await timeline.getAttribute("aria-valuemax"));
  const expectedScrubbedFrame = 1 + Math.round(endFraction * (totalFrames - 1));
  assert.ok(Math.abs(scrubbedFrame - expectedScrubbedFrame) <= 2,
    `expected scrubbed frame about ${expectedScrubbedFrame}, got ${scrubbedFrame}`);
  assert.equal(await topbarSave.getAttribute("data-dirty"), "true");

  await markerButton.click();
  await page.waitForTimeout(100);
  markerState = await pickerState(page);
  assert.equal(markerState.keyFrames, `[${TEST_FRAME},${scrubbedFrame}]`);
  assert.equal(await page.locator(".wk-vfp-marker").count(), 2);

  // Persist the Playhead + Marker result, then verify the exact selection survives a
  // browser reload and remains clean.
  await topbarSave.click();
  await page.waitForFunction(() =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.isModified === false,
  null, { timeout: 20_000 });
  await page.waitForTimeout(250);

  const beforeReload = await pickerState(page);
  assert.ok(beforeReload);
  assert.equal(beforeReload.video, TEST_VIDEO);
  assert.equal(Number(beforeReload.frameIndex), scrubbedFrame);
  assert.equal(beforeReload.keyFrames, `[${TEST_FRAME},${scrubbedFrame}]`);
  assert.deepEqual(beforeReload.outputNames, ["frame_image", "batch_frame_image"]);
  assert.deepEqual(beforeReload.widgetsValues, [
    TEST_VIDEO,
    scrubbedFrame,
    `[${TEST_FRAME},${scrubbedFrame}]`,
  ],
    "video, frame_index, and hidden key_frames must serialize; visual DOM must not");
  assert.equal(beforeReload.hasUiWidget, true);
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false");

  await page.reload({ waitUntil: "load", timeout: 45_000 });
  await waitForApp(page);
  if (await page.evaluate((path) =>
    window.app?.extensionManager?.workflow?.activeWorkflow?.path !== path, OFFICIAL_PATH)) {
    await openTestWorkflow(page);
  }
  await waitForVisualRestore(page, scrubbedFrame);

  const afterReload = await pickerState(page);
  assert.deepEqual(afterReload, beforeReload, "picker state must survive persisted reload");
  await topbarSave.waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await topbarSave.getAttribute("data-dirty"), "false",
    "reloaded saved picker workflow must remain clean");

  // A human video change must clear old-video Markers inside the same graph
  // transaction. Undo should therefore restore both the video and Marker set.
  const alternateVideo = await page.evaluate(async (currentVideo) => {
    const response = await fetch("/object_info/WKVideoFramePicker");
    const payload = await response.json();
    return (payload?.WKVideoFramePicker?.input?.required?.video?.[0] || [])
      .find((value) => value !== currentVideo) || null;
  }, TEST_VIDEO);
  assert.ok(alternateVideo, "the isolated input set must contain a second test video");

  await page.evaluate((nextVideo) => {
    const app = window.app;
    const node = (app.graph?._nodes || []).find((item) => item.type === "WKVideoFramePicker");
    const videoWidget = node?.widgets?.find((item) => item.name === "video");
    if (!node || !videoWidget) throw new Error("picker/video widget unavailable");

    const canvas = app.canvas;
    const graph = node.graph;
    const event = new Event("change");
    canvas?.emitBeforeChange?.();
    graph?.beforeChange?.();
    try {
      videoWidget.setValue(nextVideo, { e: event, node, canvas });
    } finally {
      graph?.afterChange?.();
      canvas?.emitAfterChange?.();
    }
  }, alternateVideo);

  await page.waitForFunction((nextVideo) => {
    const node = (window.app?.graph?._nodes || []).find((item) => item.type === "WKVideoFramePicker");
    return node?.widgets?.find((item) => item.name === "video")?.value === nextVideo
      && node?.widgets?.find((item) => item.name === "key_frames")?.value === "[]";
  }, alternateVideo, { timeout: 10_000 });

  const afterVideoSwitch = await pickerState(page);
  assert.equal(afterVideoSwitch.video, alternateVideo);
  assert.equal(afterVideoSwitch.keyFrames, "[]");
  assert.equal(await topbarSave.getAttribute("data-dirty"), "true");

  await page.keyboard.press("Control+z");
  await page.waitForFunction(([video, keyFrames]) => {
    const node = (window.app?.graph?._nodes || []).find((item) => item.type === "WKVideoFramePicker");
    return node?.widgets?.find((item) => item.name === "video")?.value === video
      && node?.widgets?.find((item) => item.name === "key_frames")?.value === keyFrames;
  }, [TEST_VIDEO, beforeReload.keyFrames], { timeout: 10_000 });

  const afterUndo = await pickerState(page);
  assert.equal(afterUndo.video, TEST_VIDEO);
  assert.equal(afterUndo.keyFrames, beforeReload.keyFrames);
  assert.deepEqual(errors, []);

  console.log(JSON.stringify({
    testPath: TEST_PATH,
    beforeReload,
    afterReload,
    alternateVideo,
    afterVideoSwitch,
    afterUndo,
    initialFrame: TEST_FRAME,
    visualFrame: scrubbedFrame,
    dirty: false,
  }, null, 2));
} finally {
  await cleanup(page);
  await context.close();
  await browser.close();
}
