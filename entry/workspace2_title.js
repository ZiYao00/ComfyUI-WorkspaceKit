import { app } from "../../scripts/app.js";
import { t } from "./core/i18n.js";
import { ensureWorkspaceKitDialogStyles } from "./core/dialog_styles.js";

const NODE_TYPE = "Workspace2Title";
const DEFAULT_TEXT = "Double-click to edit";
// Canvas `middle` text baselines look about 12px low with this node's font
// stack.  This is an internal visual calibration, not the user-facing value.
const VISUAL_CENTER_Y_CORRECTION = -12;
const VERTICAL_OFFSET_CALIBRATION_VERSION = 1;
const DEFAULT_PROPS = {
  text: DEFAULT_TEXT,
  fontSize: 24,
  fontColor: "#f5f5f7",
  bgColor: "#2c2c2e",
  bgOpacity: 0,
  borderColor: "#0a84ff",
  borderOpacity: 0,
  borderRadius: 15,
  textAlign: "center",
  letterSpacing: 0,
  lineHeight: 1.25,
  verticalOffset: 0,
  verticalOffsetCalibrationVersion: VERTICAL_OFFSET_CALIBRATION_VERSION,
  glowEnabled: false,
  glowSize: 10,
  glowColor: "#0a84ff",
  glowIntensity: 0.45,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
  if (!match) {
    return { r: 44, g: 44, b: 46 };
  }
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

function alphaColor(hex, opacity) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(opacity, 0, 1)})`;
}

function defaultTitleText() {
  const translated = t("titleEditor.defaultText");
  return translated === "titleEditor.defaultText" ? DEFAULT_TEXT : translated;
}

function ensureProps(node) {
  node.properties ||= {};
  const legacyVerticalOffset = node.properties.verticalOffset;
  const hasLegacyVerticalOffset = legacyVerticalOffset !== undefined && legacyVerticalOffset !== null;
  const calibrationVersion = Number(node.properties.verticalOffsetCalibrationVersion) || 0;
  for (const [key, value] of Object.entries(DEFAULT_PROPS)) {
    if (node.properties[key] === undefined || node.properties[key] === null) {
      // Existing title text is preserved.  Only new/legacy-empty nodes pick
      // their initial prompt from the active WorkspaceKit language.
      node.properties[key] = key === "text"
        ? defaultTitleText()
        : value;
    }
  }
  if (hasLegacyVerticalOffset && calibrationVersion < VERTICAL_OFFSET_CALIBRATION_VERSION) {
    // Preserve the on-canvas appearance of values saved before visual-center
    // calibration.  Example: the old visual center -12 becomes the new 0.
    node.properties.verticalOffset = clamp(
      Number(legacyVerticalOffset) - VISUAL_CENTER_Y_CORRECTION,
      -80,
      80,
    );
  }
  node.properties.verticalOffsetCalibrationVersion = VERTICAL_OFFSET_CALIBRATION_VERSION;
  return node.properties;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function measureTextWidth(ctx, text, letterSpacing = 0) {
  const chars = [...String(text || "")];
  if (!chars.length) {
    return 0;
  }
  const baseWidth = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0);
  return baseWidth + Math.max(0, chars.length - 1) * letterSpacing;
}

function drawTextWithLetterSpacing(ctx, text, x, y, maxWidth, letterSpacing, align) {
  const line = String(text || "");
  if (!letterSpacing) {
    ctx.fillText(line, x, y, maxWidth);
    return;
  }
  const chars = [...line];
  const width = measureTextWidth(ctx, line, letterSpacing);
  let cursor = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  ctx.save();
  ctx.textAlign = "left";
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
  ctx.restore();
}

function wrapLines(ctx, text, maxWidth, letterSpacing = 0) {
  const lines = [];
  for (const rawLine of String(text || DEFAULT_TEXT).split(/\r?\n/)) {
    let line = "";
    const words = rawLine.split(/(\s+)/).filter(Boolean);
    for (const word of words.length ? words : [rawLine]) {
      const next = line ? `${line}${word}` : word;
      if (measureTextWidth(ctx, next, letterSpacing) <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line.trimEnd());
        line = word.trimStart();
      }
    }
    lines.push(line || "");
  }
  return lines;
}

function drawTitleNode(node, ctx) {
  const props = ensureProps(node);
  const width = Math.max(120, node.size?.[0] || 260);
  const height = Math.max(52, node.size?.[1] || 90);
  const padding = 14;
  const fontSize = clamp(props.fontSize, 8, 120) || DEFAULT_PROPS.fontSize;
  const lineHeight = fontSize * (Number(props.lineHeight) || DEFAULT_PROPS.lineHeight);
  const bgOpacity = clamp(props.bgOpacity, 0, 1);
  const borderOpacity = clamp(props.borderOpacity, 0, 1);
  // `0` is a valid square-corner value.  Do not use `||` here: it would
  // incorrectly substitute the 15px default whenever the user chose zero.
  const parsedBorderRadius = Number(props.borderRadius);
  const borderRadius = Number.isFinite(parsedBorderRadius)
    ? Math.max(0, parsedBorderRadius)
    : DEFAULT_PROPS.borderRadius;
  const letterSpacing = Number(props.letterSpacing) || 0;
  const verticalOffset = clamp(props.verticalOffset, -80, 80);

  node.bgcolor = "transparent";
  node.color = "transparent";
  node.title = "";

  ctx.save();
  if (bgOpacity > 0 || borderOpacity > 0) {
    roundRect(ctx, 0, 0, width, height, borderRadius);
    if (bgOpacity > 0) {
      ctx.fillStyle = alphaColor(props.bgColor, bgOpacity);
      ctx.fill();
    }
    if (borderOpacity > 0) {
      ctx.strokeStyle = alphaColor(props.borderColor, borderOpacity);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.font = `600 ${fontSize}px Arial, "Microsoft YaHei", "微软雅黑", sans-serif`;
  ctx.fillStyle = props.fontColor || DEFAULT_PROPS.fontColor;
  ctx.textBaseline = "middle";
  ctx.textAlign = props.textAlign || DEFAULT_PROPS.textAlign;
  if (props.glowEnabled) {
    ctx.shadowColor = props.glowColor || DEFAULT_PROPS.glowColor;
    ctx.shadowBlur = clamp(props.glowSize, 0, 80) * clamp(props.glowIntensity, 0, 2);
  }

  const maxTextWidth = Math.max(20, width - padding * 2);
  const lines = wrapLines(ctx, props.text, maxTextWidth, letterSpacing);
  const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
  let y = height / 2 - blockHeight / 2 + lineHeight / 2 + VISUAL_CENTER_Y_CORRECTION + verticalOffset;
  const align = props.textAlign || DEFAULT_PROPS.textAlign;
  const x = align === "left" ? padding : align === "right" ? width - padding : width / 2;
  for (const line of lines) {
    drawTextWithLetterSpacing(ctx, line, x, y, maxTextWidth, letterSpacing, align);
    y += lineHeight;
  }
  ctx.restore();
}

function getNodeViewportRect(node) {
  const canvas = app.canvas || globalThis.LGraphCanvas?.active_canvas;
  const rect = canvas?.canvas?.getBoundingClientRect?.();
  const ds = canvas?.ds || {};
  const scale = Number(ds.scale) || 1;
  const offset = Array.isArray(ds.offset) ? ds.offset : [0, 0];
  if (!rect) {
    return null;
  }
  return {
    left: rect.left + (node.pos[0] + offset[0]) * scale,
    top: rect.top + (node.pos[1] + offset[1]) * scale,
    width: Math.max(120, node.size?.[0] || 260) * scale,
    height: Math.max(52, node.size?.[1] || 90) * scale,
    scale,
  };
}

function markDirty() {
  app.graph?.setDirtyCanvas?.(true, true);
  app.graph?.change?.();
}

function makeButton(text, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "workspacekit-dialog-button";
  button.textContent = text;
  button.title = title || text;
  return button;
}

function makeSlider(label, min, max, step, value, onInput, { defaultValue = null, snapTolerance = 0, trailingControl = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "workspacekit-dialog-row";
  const name = document.createElement("span");
  name.textContent = label;
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  if (defaultValue !== null) {
    input.title = `Default: ${defaultValue}`;
  }
  const out = document.createElement("span");
  out.className = "workspacekit-dialog-value";
  out.textContent = String(value);
  input.addEventListener("input", () => {
    let next = Number(input.value);
    if (defaultValue !== null && Math.abs(next - defaultValue) <= snapTolerance) {
      next = defaultValue;
      input.value = String(defaultValue);
    }
    out.textContent = String(next);
    onInput(next);
  });
  if (trailingControl) {
    // Color-backed controls share the same compact right slot as Glow:
    // numeric value first, then the color swatch.
    wrap.style.gridTemplateColumns = "var(--workspacekit-dialog-label-width) minmax(0,1fr) 72px";
    const trailing = document.createElement("div");
    trailing.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:0;";
    trailing.append(out, trailingControl);
    wrap.append(name, input, trailing);
  } else {
    wrap.append(name, input, out);
  }
  return wrap;
}

function clampPanelPosition(left, top, width, height = 360) {
  const margin = 12;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(margin, left), maxLeft),
    top: Math.min(Math.max(margin, top), maxTop),
  };
}

function startEditor(node, mode = "text") {
  if (node.__workspace2TitleEditing) {
    return true;
  }
  // Keep a draft separate from the workflow state.  The editor still applies
  // the draft to the canvas for live preview, but only Finish marks the graph
  // as changed.  Escape/Cancel can therefore restore the exact opening state.
  const originalProperties = { ...(node.properties || {}) };
  const originalSize = Array.isArray(node.size) ? [...node.size] : null;
  const props = ensureProps(node);
  const draft = { ...props };
  const refreshPreview = () => app.graph?.setDirtyCanvas?.(true, true);
  const applyDraftPreview = () => {
    Object.assign(props, draft);
    refreshPreview();
  };
  const viewport = getNodeViewportRect(node);
  if (!viewport) {
    return true;
  }

  node.__workspace2TitleEditing = true;
  const showStylePanel = mode === "style";
  // Style labels are substantially longer in English.  Do not compress the
  // shared row layout until labels overlap: allow a useful editing width.
  const panelWidth = showStylePanel ? 360 : Math.max(180, viewport.width);
  const panelPosition = showStylePanel
    ? clampPanelPosition(viewport.left + viewport.width + 12, viewport.top, panelWidth)
    : { left: viewport.left, top: viewport.top };
  const container = document.createElement("div");
  ensureWorkspaceKitDialogStyles();
  container.className = "workspace2-title-editor workspacekit-dialog";
  container.style.cssText = `--workspacekit-dialog-label-width:112px;position:fixed;left:${panelPosition.left}px;top:${panelPosition.top}px;width:min(${panelWidth}px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow-y:auto;z-index:100000;display:flex;flex-direction:column;gap:8px;box-sizing:border-box;visibility:hidden;`;

  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:12px;box-sizing:border-box;border:1px solid var(--workspacekit-dialog-border);border-radius:9px;background:var(--workspacekit-dialog-bg);box-shadow:0 12px 30px rgba(0,0,0,.35);overflow:hidden;";
  const heading = document.createElement("div");
  heading.className = "workspacekit-dialog-header";
  heading.textContent = t("titleEditor.styleTitle");
  const section = document.createElement("div");
  section.className = "workspacekit-dialog-section";
  section.textContent = t("titleEditor.appearance");
  const controls = document.createElement("div");
  controls.style.cssText = "display:flex;flex-direction:column;gap:6px;";

  const fontColor = document.createElement("input");
  fontColor.type = "color";
  fontColor.value = draft.fontColor || DEFAULT_PROPS.fontColor;
  fontColor.className = "workspacekit-dialog-color";
  const bgColor = document.createElement("input");
  bgColor.type = "color";
  bgColor.value = draft.bgColor || DEFAULT_PROPS.bgColor;
  bgColor.className = "workspacekit-dialog-color";

  // Mirrors the Canvas Groups "Unified" control: the feature is enabled by
  // its checkbox, and its magnitude is adjusted by the aligned slider.
  const makeGlowControl = () => {
    const row = document.createElement("div");
    row.className = "workspacekit-dialog-row";
    const label = document.createElement("label");
    label.style.cssText = "display:flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = Boolean(draft.glowEnabled);
    toggle.style.margin = "0";
    const text = document.createElement("span");
    text.textContent = t("titleEditor.glow");
    label.append(toggle, text);
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "40";
    input.step = "1";
    input.value = String(draft.glowSize);
    const out = document.createElement("span");
    out.className = "workspacekit-dialog-value";
    out.textContent = String(draft.glowSize);
    const color = document.createElement("input");
    color.type = "color";
    color.value = draft.glowColor || DEFAULT_PROPS.glowColor;
    color.className = "workspacekit-dialog-color";
    const end = document.createElement("div");
    end.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:0;";
    end.append(out, color);
    row.style.gridTemplateColumns = "var(--workspacekit-dialog-label-width) minmax(0,1fr) 72px";
    const sync = () => {
      const enabled = Boolean(draft.glowEnabled);
      input.disabled = !enabled;
      input.style.opacity = enabled ? "1" : ".35";
      end.style.opacity = enabled ? "1" : ".35";
    };
    toggle.addEventListener("change", () => {
      draft.glowEnabled = toggle.checked;
      applyDraftPreview();
      sync();
    });
    input.addEventListener("input", () => {
      draft.glowSize = Number(input.value);
      out.textContent = input.value;
      applyDraftPreview();
    });
    color.addEventListener("input", () => {
      draft.glowColor = color.value;
      applyDraftPreview();
    });
    row.append(label, input, end);
    sync();
    return { row, sync };
  };
  const glowControl = makeGlowControl();

  controls.append(
    makeSlider(t("titleEditor.fontSize"), 8, 96, 1, draft.fontSize, (value) => {
      draft.fontSize = value;
      applyDraftPreview();
      syncTextarea();
    }, { defaultValue: DEFAULT_PROPS.fontSize, snapTolerance: 1, trailingControl: fontColor }),
    makeSlider(t("titleEditor.lineHeight"), 0.8, 2.5, 0.05, draft.lineHeight, (value) => {
      draft.lineHeight = value;
      applyDraftPreview();
      syncTextarea();
    }, { defaultValue: DEFAULT_PROPS.lineHeight, snapTolerance: 0.05 }),
    makeSlider(t("titleEditor.letterSpacing"), -4, 12, 0.5, draft.letterSpacing || 0, (value) => {
      draft.letterSpacing = value;
      applyDraftPreview();
      syncTextarea();
    }, { defaultValue: DEFAULT_PROPS.letterSpacing, snapTolerance: 0.5 }),
    makeSlider(t("titleEditor.verticalOffset"), -80, 80, 1, draft.verticalOffset || 0, (value) => {
      draft.verticalOffset = value;
      applyDraftPreview();
    }, { defaultValue: DEFAULT_PROPS.verticalOffset, snapTolerance: 1 }),
    makeSlider(t("titleEditor.backgroundOpacity"), 0, 1, 0.05, draft.bgOpacity, (value) => {
      draft.bgOpacity = value;
      applyDraftPreview();
      syncTextarea();
    }, { trailingControl: bgColor }),
    makeSlider(t("titleEditor.borderOpacity"), 0, 1, 0.05, draft.borderOpacity, (value) => {
      draft.borderOpacity = value;
      applyDraftPreview();
    }),
    makeSlider(t("titleEditor.borderRadius"), 0, 32, 1, draft.borderRadius, (value) => {
      draft.borderRadius = value;
      applyDraftPreview();
      syncTextarea();
    }),
    glowControl.row,
  );

  const actionRow = document.createElement("div");
  actionRow.className = "workspacekit-dialog-footer";
  const alignRow = document.createElement("div");
  alignRow.style.cssText = "display:flex;gap:5px;";
  for (const [value, text] of [["left", t("titleEditor.alignLeft")], ["center", t("titleEditor.alignCenter")], ["right", t("titleEditor.alignRight")]]) {
    const button = makeButton(text, t("titleEditor.alignTooltip", { alignment: text }));
    button.dataset.align = value;
    button.addEventListener("click", () => {
      draft.textAlign = value;
      applyDraftPreview();
      syncButtons();
      syncTextarea();
    });
    alignRow.append(button);
  }
  const cancel = makeButton(t("titleEditor.cancel"), t("titleEditor.cancelTooltip"));
  // Prevent the focused textarea from blurring (which intentionally saves on
  // click-away) before the Cancel click is processed.
  cancel.addEventListener("mousedown", (event) => event.preventDefault());
  cancel.addEventListener("click", () => finish(false));
  const done = makeButton(t("titleEditor.done"), t("titleEditor.doneTooltip"));
  done.classList.add("is-primary");
  done.addEventListener("click", () => finish(true));
  const editorActions = document.createElement("div");
  editorActions.style.cssText = "display:flex;align-items:center;gap:5px;flex-shrink:0;";
  editorActions.append(cancel, done);
  actionRow.append(alignRow, editorActions);
  toolbar.append(heading, section, controls, actionRow);

  const textarea = document.createElement("textarea");
  textarea.value = draft.text || DEFAULT_TEXT;
  textarea.spellcheck = false;
  textarea.style.cssText = "box-sizing:border-box;width:100%;min-height:70px;resize:both;outline:none;border:1px dashed #0a84ff;border-radius:10px;padding:12px;background:transparent;color:#f5f5f7;caret-color:#0a84ff;overflow:hidden;";

  function syncButtons() {
    alignRow.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.align === draft.textAlign;
      button.style.background = active ? "#0a84ff" : "#2c2c2e";
      button.style.borderColor = active ? "#0a84ff" : "rgba(255,255,255,.16)";
    });
    glowControl.sync();
  }

  function syncTextarea() {
    textarea.style.height = `${Math.max(70, showStylePanel ? Math.min(160, viewport.height) : viewport.height)}px`;
    textarea.style.color = draft.fontColor || DEFAULT_PROPS.fontColor;
    textarea.style.background = alphaColor(draft.bgColor, draft.bgOpacity);
    textarea.style.borderRadius = `${draft.borderRadius || 0}px`;
    textarea.style.font = `600 ${Math.max(8, draft.fontSize)}px Arial, "Microsoft YaHei", "微软雅黑", sans-serif`;
    textarea.style.lineHeight = String(draft.lineHeight || DEFAULT_PROPS.lineHeight);
    textarea.style.letterSpacing = `${draft.letterSpacing || 0}px`;
    textarea.style.textAlign = draft.textAlign || DEFAULT_PROPS.textAlign;
  }

  function finish(save) {
    if (!node.__workspace2TitleEditing) {
      return;
    }
    node.__workspace2TitleEditing = false;
    document.removeEventListener("keydown", handleEditorKeydown, true);
    if (save) {
      draft.text = textarea.value.trim() || DEFAULT_TEXT;
      applyDraftPreview();
      if (!showStylePanel) {
        const rect = textarea.getBoundingClientRect();
        node.size = [
          Math.max(120, rect.width / viewport.scale),
          Math.max(52, rect.height / viewport.scale),
        ];
      }
      markDirty();
    } else {
      Object.keys(props).forEach((key) => delete props[key]);
      Object.assign(props, originalProperties);
      if (originalSize) {
        node.size = [...originalSize];
      }
      refreshPreview();
    }
    container.remove();
  }

  function handleEditorKeydown(event) {
    if (event.key !== "Escape" && event.key !== "Tab" && !(event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (event.key === "Escape") {
      finish(false);
      return;
    }
    finish(true);
  }

  fontColor.addEventListener("input", () => {
    draft.fontColor = fontColor.value;
    applyDraftPreview();
    syncTextarea();
  });
  bgColor.addEventListener("input", () => {
    draft.bgColor = bgColor.value;
    applyDraftPreview();
    syncTextarea();
  });
  textarea.addEventListener("input", () => {
    draft.text = textarea.value || DEFAULT_TEXT;
    applyDraftPreview();
  });
  textarea.addEventListener("keydown", (event) => {
    event.stopPropagation();
    handleEditorKeydown(event);
  });
  container.addEventListener("keydown", handleEditorKeydown, true);
  document.addEventListener("keydown", handleEditorKeydown, true);
  container.addEventListener("mousedown", (event) => event.stopPropagation(), true);
  container.addEventListener("wheel", (event) => event.stopPropagation(), true);
  textarea.addEventListener("blur", () => setTimeout(() => {
    if (!container.matches(":focus-within")) {
      finish(true);
    }
  }, 120));

  if (showStylePanel) {
    container.append(textarea, toolbar);
  } else {
    container.append(textarea);
  }
  document.body.append(container);
  // The editor's actual height depends on the active locale and slider rows.
  // Measure after it exists, then clamp its full rectangle inside the viewport
  // instead of assuming the old 360px height.
  if (showStylePanel) {
    const rect = container.getBoundingClientRect();
    const actualPosition = clampPanelPosition(viewport.left + viewport.width + 12, viewport.top, rect.width, rect.height);
    container.style.left = `${actualPosition.left}px`;
    container.style.top = `${actualPosition.top}px`;
  }
  container.style.visibility = "visible";
  syncButtons();
  syncTextarea();
  textarea.focus();
  textarea.select();
  return true;
}

function resetProps(node) {
  node.properties = { ...DEFAULT_PROPS };
  node.size = [260, 90];
  markDirty();
}

app.registerExtension({
  name: "comfyui.workspace2.title",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) {
      return;
    }

    nodeType.title_mode = globalThis.LiteGraph?.NO_TITLE;
    nodeType.collapsable = false;
    nodeType.resizable = true;

    const originalCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function (...args) {
      originalCreated?.apply(this, args);
      ensureProps(this);
      this.size = this.size || [260, 90];
      this.title = "";
    };

    const originalDrawBackground = nodeType.prototype.onDrawBackground;
    nodeType.prototype.onDrawBackground = function (ctx, ...args) {
      originalDrawBackground?.apply(this, [ctx, ...args]);
      drawTitleNode(this, ctx);
    };

    nodeType.prototype.onDblClick = function () {
      return startEditor(this, "style");
    };

    const originalMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function (event, pos, canvas) {
      if (this.__workspace2TitleEditing) {
        return true;
      }
      if (event && event.button !== 0) {
        return originalMouseDown?.apply(this, [event, pos, canvas]);
      }
      const now = Date.now();
      if (event?.detail >= 2 || (this.__workspace2LastClick && now - this.__workspace2LastClick < 320)) {
        this.__workspace2LastClick = 0;
        event?.preventDefault?.();
        event?.stopPropagation?.();
        return startEditor(this, "style");
      }
      this.__workspace2LastClick = now;
      return originalMouseDown?.apply(this, [event, pos, canvas]);
    };

    const originalMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
      options = originalMenuOptions?.call(this, canvas, options) ?? options ?? [];
      options.push(
        null,
        {
          content: "编辑文字",
          callback: () => startEditor(this, "text"),
        },
        {
          content: "样式设置",
          callback: () => startEditor(this, "style"),
        },
        {
          content: "重置标题2",
          callback: () => resetProps(this),
        },
      );
      return options;
    };
  },
});
