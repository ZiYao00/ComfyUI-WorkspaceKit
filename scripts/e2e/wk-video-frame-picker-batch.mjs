// API-level acceptance for WK Video Frame Picker batch output.
// Uses GetImageSize + ShowText so no preview/save image files are written.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const TEST_VIDEO = process.env.WK_TEST_VIDEO || "v1.mp4";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph && window.LiteGraph?.createNode, null, {
    timeout: 45_000,
    polling: 250,
  });
}

async function queueAndWait(page, prompt) {
  return page.evaluate(async (promptPayload) => {
    const queued = await fetch("/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptPayload }),
    });
    const result = await queued.json();
    if (!queued.ok || result.error || !result.prompt_id) {
      throw new Error(`prompt submission failed: ${JSON.stringify(result)}`);
    }

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const response = await fetch(`/history/${result.prompt_id}`);
      const history = await response.json();
      const item = history[result.prompt_id];
      if (item) {
        const status = item.status || {};
        if (status.completed === true || status.status_str === "success"
          || status.status_str === "error" || status.completed === false) {
          return {
            promptId: result.prompt_id,
            status,
            outputs: item.outputs || {},
            item,
          };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Timed out waiting for video-frame batch prompt history");
  }, prompt);
}

function pickerNode(keyFrames, frameIndex = 10) {
  return {
    class_type: "WKVideoFramePicker",
    inputs: {
      video: TEST_VIDEO,
      frame_index: frameIndex,
      key_frames: keyFrames,
    },
  };
}

function sizeAndDisplay(imageLink, sizeNodeId, displayNodeId) {
  return {
    [sizeNodeId]: {
      class_type: "GetImageSize",
      inputs: { image: imageLink },
    },
    [displayNodeId]: {
      class_type: "Display Int (rgthree)",
      inputs: { input: [sizeNodeId, 2] },
    },
  };
}

function outputText(result, nodeId) {
  return JSON.stringify(result.outputs?.[nodeId] ?? null);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

try {
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
  await waitForApp(page);

  const frameOnlyPrompt = {
    "1": pickerNode("[]", 10),
    ...sizeAndDisplay(["1", 0], "2", "3"),
  };
  const frameOnly = await queueAndWait(page, frameOnlyPrompt);
  assert.equal(frameOnly.status.status_str, "success");
  assert.match(outputText(frameOnly, "3"), /1/,
    "frame_image must remain a single-image batch when no Marker exists");

  const emptyBothPrompt = {
    "1": pickerNode("[]", 10),
    ...sizeAndDisplay(["1", 0], "2", "3"),
    ...sizeAndDisplay(["1", 1], "4", "5"),
  };
  const emptyBoth = await queueAndWait(page, emptyBothPrompt);
  assert.equal(emptyBoth.status.status_str, "success");
  assert.match(outputText(emptyBoth, "3"), /1/,
    "frame_image must still execute when batch_frame_image is blocked");
  assert.equal(Object.hasOwn(emptyBoth.outputs, "5"), false,
    "empty batch_frame_image must block only its downstream branch");

  const emptyBatchOnlyPrompt = {
    "1": pickerNode("[]", 10),
    ...sizeAndDisplay(["1", 1], "2", "3"),
  };
  const emptyBatchOnly = await queueAndWait(page, emptyBatchOnlyPrompt);
  assert.equal(emptyBatchOnly.status.status_str, "success");
  assert.equal(Object.keys(emptyBatchOnly.outputs).length, 0,
    "an empty Marker batch branch should be blocked without failing the prompt");

  const markedBatchPrompt = {
    "1": pickerNode("[1,3]", 10),
    ...sizeAndDisplay(["1", 1], "2", "3"),
  };
  const markedBatch = await queueAndWait(page, markedBatchPrompt);
  assert.equal(markedBatch.status.status_str, "success");
  assert.match(outputText(markedBatch, "3"), /2/,
    "two Marker frames must produce IMAGE Batch[2]");

  console.log(JSON.stringify({
    frameOnly: {
      status: frameOnly.status,
      outputs: frameOnly.outputs,
    },
    emptyBoth: {
      status: emptyBoth.status,
      outputs: emptyBoth.outputs,
      messages: emptyBoth.status?.messages,
    },
    emptyBatchOnly: {
      status: emptyBatchOnly.status,
      outputs: emptyBatchOnly.outputs,
    },
    markedBatch: {
      status: markedBatch.status,
      outputs: markedBatch.outputs,
    },
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
