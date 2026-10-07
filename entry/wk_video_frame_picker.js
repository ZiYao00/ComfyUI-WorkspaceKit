import { app } from "../../scripts/app.js";
import {
  DEFAULT_THUMBNAIL_COUNT,
  clampFrameIndex,
  formatTimestamp,
  frameFraction,
  frameIndexFromFraction,
  splitInputVideoPath,
  timestampForFrame,
} from "./nodes/video-frame-picker-model.js";

const NODE_TYPE = "WKVideoFramePicker";
const UI_KEY = "__wkVideoFramePickerUi";
const STYLE_ID = "wk-video-frame-picker-styles";

function widget(node, name) {
  return node.widgets?.find((item) => item.name === name);
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .wk-vfp {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      display: grid;
      gap: 8px;
      padding: 6px 2px 8px;
      color: var(--input-text, #ddd);
      font: 12px/1.35 system-ui, sans-serif;
      user-select: none;
    }
    .wk-vfp-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 150px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
      border-radius: 7px;
      background: #111;
    }
    .wk-vfp-preview video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      background: #111;
      pointer-events: none;
    }
    .wk-vfp-message {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 16px;
      color: color-mix(in srgb, currentColor 72%, transparent);
      text-align: center;
      background: color-mix(in srgb, #111 88%, transparent);
    }
    .wk-vfp-message[hidden] { display: none; }
    .wk-vfp-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
      font-variant-numeric: tabular-nums;
    }
    .wk-vfp-meta span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wk-vfp-controls {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .wk-vfp-controls button {
      min-width: 72px;
      height: 28px;
      border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, currentColor 8%, transparent);
      color: inherit;
      cursor: pointer;
    }
    .wk-vfp-controls button:hover {
      background: color-mix(in srgb, currentColor 14%, transparent);
    }
    .wk-vfp-controls button:disabled {
      opacity: .42;
      cursor: default;
    }
    .wk-vfp-timeline {
      position: relative;
      height: 72px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
      border-radius: 7px;
      background: #161616;
      touch-action: none;
      cursor: ew-resize;
    }
    .wk-vfp-filmstrip {
      position: absolute;
      inset: 0;
      display: grid;
      pointer-events: none;
    }
    .wk-vfp-thumb {
      position: relative;
      min-width: 0;
      overflow: hidden;
      border-right: 1px solid rgba(255,255,255,.08);
      background: #202020;
    }
    .wk-vfp-thumb:last-child { border-right: 0; }
    .wk-vfp-thumb canvas {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      opacity: .35;
    }
    .wk-vfp-thumb.is-ready canvas { opacity: 1; }
    .wk-vfp-marker-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .wk-vfp-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      transform: translateX(-1px);
      background: #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,.35);
      pointer-events: none;
    }
    .wk-vfp-playhead::before {
      content: "";
      position: absolute;
      top: 0;
      left: 50%;
      width: 10px;
      height: 10px;
      transform: translate(-50%, 0);
      clip-path: polygon(0 0, 100% 0, 50% 100%);
      background: #fff;
    }
    .wk-vfp-status {
      min-height: 16px;
      color: color-mix(in srgb, currentColor 62%, transparent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.head.appendChild(style);
}

function pageUrl(pathname) {
  return new URL(pathname.replace(/^\//, ""), new URL("./", window.location.href));
}

function inputVideoUrl(value) {
  const { filename, subfolder } = splitInputVideoPath(value);
  const url = pageUrl("view");
  url.searchParams.set("filename", filename);
  url.searchParams.set("type", "input");
  if (subfolder) url.searchParams.set("subfolder", subfolder);
  return url.toString();
}

function metadataUrl(value) {
  const url = pageUrl("workspacekit/video-frame/metadata");
  url.searchParams.set("video", String(value || ""));
  return url.toString();
}

function waitForMedia(video, eventName, timeoutMs = 12_000) {
  return new Promise((resolve, reject) => {
    let timer = 0;
    const done = (fn, value) => {
      clearTimeout(timer);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener("error", onError);
      fn(value);
    };
    const onEvent = () => done(resolve);
    const onError = () => done(reject, new Error("Browser could not decode the video preview."));
    timer = window.setTimeout(() => done(reject, new Error("Timed out loading video preview.")), timeoutMs);
    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function seekMedia(video, seconds) {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const maxTime = duration > 0 ? Math.max(0, duration - 0.001) : Math.max(0, seconds);
  const target = Math.min(maxTime, Math.max(0, seconds));
  if (Math.abs(video.currentTime - target) < 0.0005) return;

  const promise = waitForMedia(video, "seeked", 5_000);
  video.currentTime = target;
  await promise;
}

function createUi(node) {
  if (node[UI_KEY]) return node[UI_KEY];

  const videoWidget = widget(node, "video");
  const frameWidget = widget(node, "frame_index");
  if (!videoWidget || !frameWidget || typeof node.addDOMWidget !== "function") return null;

  installStyles();

  const root = document.createElement("div");
  root.className = "wk-vfp";
  root.dataset.wkVideoFramePicker = "true";

  const previewWrap = document.createElement("div");
  previewWrap.className = "wk-vfp-preview";
  const preview = document.createElement("video");
  preview.preload = "auto";
  preview.muted = true;
  preview.playsInline = true;
  preview.controls = false;
  previewWrap.appendChild(preview);

  const message = document.createElement("div");
  message.className = "wk-vfp-message";
  message.textContent = "Select an MP4 or WebM video.";
  previewWrap.appendChild(message);

  const meta = document.createElement("div");
  meta.className = "wk-vfp-meta";
  const frameLabel = document.createElement("span");
  frameLabel.textContent = "Frame 1 / —";
  const timeLabel = document.createElement("span");
  timeLabel.textContent = "00:00.0";
  meta.append(frameLabel, timeLabel);

  const controls = document.createElement("div");
  controls.className = "wk-vfp-controls";
  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.textContent = "◀ 1";
  previousButton.setAttribute("aria-label", "Previous frame");
  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "1 ▶";
  nextButton.setAttribute("aria-label", "Next frame");
  controls.append(previousButton, nextButton);

  const timeline = document.createElement("div");
  timeline.className = "wk-vfp-timeline";
  timeline.setAttribute("role", "slider");
  timeline.setAttribute("aria-label", "Video frame playhead");
  timeline.tabIndex = 0;

  const filmstrip = document.createElement("div");
  filmstrip.className = "wk-vfp-filmstrip";
  filmstrip.style.gridTemplateColumns = `repeat(${DEFAULT_THUMBNAIL_COUNT}, minmax(0, 1fr))`;
  const markerLayer = document.createElement("div");
  markerLayer.className = "wk-vfp-marker-layer";
  markerLayer.dataset.futureMarkerLayer = "true";
  const playhead = document.createElement("div");
  playhead.className = "wk-vfp-playhead";
  playhead.style.left = "0%";
  timeline.append(filmstrip, markerLayer, playhead);

  const status = document.createElement("div");
  status.className = "wk-vfp-status";
  status.textContent = "Ready.";

  root.append(previewWrap, meta, controls, timeline, status);

  const domWidget = node.addDOMWidget("video_frame_picker_ui", "wk-video-frame-picker", root, {
    serialize: false,
    hideOnZoom: false,
    getMinHeight: () => 450,
  });
  domWidget.serialize = false;
  domWidget.options.serialize = false;
  domWidget.options.minNodeSize = [460, 540];

  let metadata = null;
  let loadToken = 0;
  let disposed = false;
  let scrubbing = false;
  let previewFrame = 1;
  let seekRaf = 0;
  let pendingSeekFrame = null;
  let configured = false;

  function setMessage(text) {
    message.textContent = text || "";
    message.hidden = !text;
  }

  function setEnabled(enabled) {
    previousButton.disabled = !enabled;
    nextButton.disabled = !enabled;
    timeline.toggleAttribute("aria-disabled", !enabled);
  }

  function updatePresentation(frame) {
    const total = metadata?.total_frames || 1;
    const current = clampFrameIndex(frame, total);
    previewFrame = current;
    const fps = metadata?.fps || 0;
    frameLabel.textContent = `Frame ${current} / ${metadata?.total_frames || "—"}`;
    timeLabel.textContent = formatTimestamp(timestampForFrame(current, fps));
    playhead.style.left = `${frameFraction(current, total) * 100}%`;
    timeline.setAttribute("aria-valuemin", "1");
    timeline.setAttribute("aria-valuemax", String(total));
    timeline.setAttribute("aria-valuenow", String(current));
  }

  function schedulePreview(frame) {
    if (!metadata) return;
    const current = clampFrameIndex(frame, metadata.total_frames);
    updatePresentation(current);
    pendingSeekFrame = current;
    if (seekRaf) return;
    seekRaf = requestAnimationFrame(() => {
      seekRaf = 0;
      const target = pendingSeekFrame;
      pendingSeekFrame = null;
      if (!target || !metadata || disposed) return;
      const seconds = timestampForFrame(target, metadata.fps);
      const duration = Number.isFinite(preview.duration) ? preview.duration : metadata.duration;
      const maxTime = duration > 0 ? Math.max(0, duration - 0.001) : seconds;
      preview.currentTime = Math.min(maxTime, Math.max(0, seconds));
    });
  }

  function commitFrame(frame, event) {
    if (!metadata) return;
    const current = clampFrameIndex(frame, metadata.total_frames);
    updatePresentation(current);
    if (Number(frameWidget.value) === current) {
      schedulePreview(current);
      return;
    }

    const canvas = app.canvas;
    const graph = node.graph;
    canvas?.emitBeforeChange?.();
    graph?.beforeChange?.();
    try {
      if (typeof frameWidget.setValue === "function" && canvas) {
        frameWidget.setValue(current, {
          e: event,
          node,
          canvas,
        });
        return;
      }

      // Compatibility fallback for older frontend builds that predate the
      // official BaseWidget.setValue mutation path.
      const oldValue = frameWidget.value;
      frameWidget.value = current;
      frameWidget.callback?.(current, canvas, node, canvas?.graph_mouse, event);
      node.onWidgetChanged?.(frameWidget.name, current, oldValue, frameWidget);
      graph?.incrementVersion?.();
    } finally {
      graph?.afterChange?.();
      canvas?.emitAfterChange?.();
    }
  }

  function pointerFrame(event) {
    if (!metadata) return 1;
    const rect = timeline.getBoundingClientRect();
    if (rect.width <= 0) return clampFrameIndex(frameWidget.value, metadata.total_frames);
    return frameIndexFromFraction((event.clientX - rect.left) / rect.width, metadata.total_frames);
  }

  function stopScrub(event, commit = true) {
    if (!scrubbing) return;
    scrubbing = false;
    try {
      if (event?.pointerId != null && timeline.hasPointerCapture?.(event.pointerId)) {
        timeline.releasePointerCapture(event.pointerId);
      }
    } catch {}
    if (commit) commitFrame(previewFrame, event);
  }

  timeline.addEventListener("pointerdown", (event) => {
    if (!metadata || event.button !== 0) return;
    event.preventDefault();
    scrubbing = true;
    timeline.setPointerCapture?.(event.pointerId);
    schedulePreview(pointerFrame(event));
  });
  timeline.addEventListener("pointermove", (event) => {
    if (!scrubbing) return;
    event.preventDefault();
    schedulePreview(pointerFrame(event));
  });
  timeline.addEventListener("pointerup", (event) => stopScrub(event, true));
  timeline.addEventListener("pointercancel", (event) => stopScrub(event, false));

  timeline.addEventListener("keydown", (event) => {
    if (!metadata || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    commitFrame(previewFrame + (event.key === "ArrowLeft" ? -1 : 1), event);
  });

  previousButton.addEventListener("click", (event) => commitFrame(previewFrame - 1, event));
  nextButton.addEventListener("click", (event) => commitFrame(previewFrame + 1, event));

  async function generateFilmstrip(sourceUrl, token) {
    filmstrip.replaceChildren();
    const entries = [];
    for (let index = 0; index < DEFAULT_THUMBNAIL_COUNT; index += 1) {
      const cell = document.createElement("div");
      cell.className = "wk-vfp-thumb";
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      cell.appendChild(canvas);
      filmstrip.appendChild(cell);
      entries.push({ cell, canvas });
    }

    const thumbVideo = document.createElement("video");
    thumbVideo.preload = "auto";
    thumbVideo.muted = true;
    thumbVideo.playsInline = true;
    thumbVideo.src = sourceUrl;

    try {
      await waitForMedia(thumbVideo, "loadeddata");
      if (disposed || token !== loadToken) return;
      const duration = Number.isFinite(thumbVideo.duration) ? thumbVideo.duration : metadata?.duration || 0;

      for (let index = 0; index < entries.length; index += 1) {
        if (disposed || token !== loadToken) return;
        const fraction = entries.length <= 1 ? 0 : index / (entries.length - 1);
        await seekMedia(thumbVideo, duration * fraction);
        if (disposed || token !== loadToken) return;
        const { cell, canvas } = entries[index];
        const context = canvas.getContext("2d", { alpha: false });
        context?.drawImage(thumbVideo, 0, 0, canvas.width, canvas.height);
        cell.classList.add("is-ready");
      }
    } catch (error) {
      if (token === loadToken && !disposed) {
        status.textContent = `Filmstrip unavailable: ${error.message}`;
      }
    } finally {
      thumbVideo.removeAttribute("src");
      thumbVideo.load();
    }
  }

  async function loadVideo(value) {
    const token = ++loadToken;
    metadata = null;
    setEnabled(false);
    setMessage("Loading video…");
    status.textContent = "Loading metadata…";
    filmstrip.replaceChildren();
    playhead.style.left = "0%";

    const selected = String(value || "").trim();
    if (!selected) {
      preview.removeAttribute("src");
      preview.load();
      setMessage("Select an MP4 or WebM video.");
      status.textContent = "No video selected.";
      return;
    }

    const sourceUrl = inputVideoUrl(selected);
    preview.src = sourceUrl;
    preview.load();

    try {
      const [response] = await Promise.all([
        fetch(metadataUrl(selected), { cache: "no-store" }),
        waitForMedia(preview, "loadedmetadata"),
      ]);
      const payload = await response.json();
      if (!response.ok || payload?.ok === false || !payload?.metadata) {
        throw new Error(payload?.error || `Metadata request failed: ${response.status}`);
      }
      if (disposed || token !== loadToken) return;

      metadata = payload.metadata;
      const current = clampFrameIndex(frameWidget.value, metadata.total_frames);
      if (Number(frameWidget.value) !== current) {
        frameWidget.value = current;
        frameWidget.callback?.(current);
      }
      updatePresentation(current);
      schedulePreview(current);
      setMessage("");
      setEnabled(true);
      status.textContent = `${metadata.width}×${metadata.height} · ${Number(metadata.fps).toFixed(3).replace(/\.0+$/, "")} FPS`;
      void generateFilmstrip(sourceUrl, token);
    } catch (error) {
      if (disposed || token !== loadToken) return;
      metadata = null;
      setEnabled(false);
      setMessage(error.message || "Could not load video.");
      status.textContent = "Preview unavailable.";
    }
  }

  const originalVideoCallback = videoWidget.callback;
  videoWidget.callback = function (value) {
    originalVideoCallback?.apply(this, arguments);
    void loadVideo(value);
  };

  const originalFrameCallback = frameWidget.callback;
  frameWidget.callback = function (value) {
    originalFrameCallback?.apply(this, arguments);
    if (!metadata || scrubbing) return;
    const current = clampFrameIndex(value, metadata.total_frames);
    if (Number(frameWidget.value) !== current) frameWidget.value = current;
    schedulePreview(current);
  };

  const originalConfigure = node.onConfigure;
  node.onConfigure = function () {
    configured = true;
    originalConfigure?.apply(this, arguments);
    queueMicrotask(() => {
      if (!disposed) void loadVideo(videoWidget.value);
    });
  };

  // Give newly created nodes a useful editing width without resizing persisted
  // workflows during reload/configure.
  setTimeout(() => {
    if (disposed || configured) return;
    const width = Math.max(460, Number(node.size?.[0]) || 0);
    const height = Math.max(540, Number(node.size?.[1]) || 0);
    node.setSize?.([width, height]);
  }, 0);

  function cleanup() {
    disposed = true;
    loadToken += 1;
    if (seekRaf) cancelAnimationFrame(seekRaf);
    preview.pause();
    preview.removeAttribute("src");
    preview.load();
  }

  domWidget.onRemove = cleanup;

  const api = {
    sync() {
      void loadVideo(videoWidget.value);
    },
    getMetadata: () => metadata,
    getPreviewFrame: () => previewFrame,
    root,
    timeline,
  };
  node[UI_KEY] = api;

  queueMicrotask(() => {
    if (!disposed && !configured) void loadVideo(videoWidget.value);
  });

  return api;
}

app.registerExtension({
  name: "comfyui.workspacekit.video-frame-picker",
  nodeCreated(node) {
    if ((node.comfyClass || node.type) === NODE_TYPE) createUi(node);
  },
  loadedGraphNode(node) {
    if ((node.comfyClass || node.type) === NODE_TYPE) {
      createUi(node)?.sync();
    }
  },
});
