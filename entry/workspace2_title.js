import { app } from "../../scripts/app.js";

const NODE_TYPE = "Workspace2Title";
const DEFAULT_TEXT = "双击编辑";
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

function ensureProps(node) {
  node.properties ||= {};
  for (const [key, value] of Object.entries(DEFAULT_PROPS)) {
    if (node.properties[key] === undefined || node.properties[key] === null) {
      node.properties[key] = value;
    }
  }
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
  const letterSpacing = Number(props.letterSpacing) || 0;

  node.bgcolor = "transparent";
  node.color = "transparent";
  node.title = "";

  ctx.save();
  if (bgOpacity > 0 || borderOpacity > 0) {
    roundRect(ctx, 0, 0, width, height, Number(props.borderRadius) || DEFAULT_PROPS.borderRadius);
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
  let y = height / 2 - blockHeight / 2 + lineHeight / 2;
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
  button.textContent = text;
  button.title = title || text;
  button.style.cssText = "height:28px;min-width:32px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:#2c2c2e;color:#f5f5f7;cursor:pointer;font-size:12px;";
  return button;
}

function makeSlider(label, min, max, step, value, onInput) {
  const wrap = document.createElement("label");
  wrap.style.cssText = "display:grid;grid-template-columns:1fr auto;grid-template-areas:'name value' 'slider slider';align-items:center;row-gap:4px;column-gap:8px;color:#a1a1a6;font-size:12px;min-width:0;";
  const name = document.createElement("span");
  name.textContent = label;
  name.style.cssText = "grid-area:name;line-height:16px;white-space:nowrap;";
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.style.cssText = "grid-area:slider;width:100%;min-width:0;margin:0;";
  const out = document.createElement("span");
  out.textContent = String(value);
  out.style.cssText = "grid-area:value;text-align:right;line-height:16px;min-width:34px;color:#d1d1d6;font-variant-numeric:tabular-nums;";
  input.addEventListener("input", () => {
    out.textContent = input.value;
    onInput(Number(input.value));
  });
  wrap.append(name, input, out);
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
  const props = ensureProps(node);
  const viewport = getNodeViewportRect(node);
  if (!viewport) {
    return true;
  }

  node.__workspace2TitleEditing = true;
  const showStylePanel = mode === "style";
  const panelWidth = showStylePanel ? 460 : Math.max(180, viewport.width);
  const panelPosition = showStylePanel
    ? clampPanelPosition(viewport.left + viewport.width + 12, viewport.top, panelWidth)
    : { left: viewport.left, top: viewport.top };
  const container = document.createElement("div");
  container.className = "workspace2-title-editor";
  container.style.cssText = `position:fixed;left:${panelPosition.left}px;top:${panelPosition.top}px;width:${panelWidth}px;z-index:100000;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;`;

  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:10px;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(28,28,30,.96);box-shadow:0 12px 30px rgba(0,0,0,.35);overflow:hidden;";

  const left = document.createElement("div");
  left.style.cssText = "display:flex;flex-direction:column;gap:7px;min-width:0;";
  const right = document.createElement("div");
  right.style.cssText = "display:flex;flex-direction:column;gap:7px;min-width:0;";

  const colorRow = document.createElement("div");
  colorRow.style.cssText = "display:grid;grid-template-columns:36px minmax(0,1fr) 36px minmax(0,1fr);align-items:center;gap:6px;color:#a1a1a6;font-size:12px;min-width:0;";
  const fontColor = document.createElement("input");
  fontColor.type = "color";
  fontColor.value = props.fontColor || DEFAULT_PROPS.fontColor;
  fontColor.style.width = "100%";
  const bgColor = document.createElement("input");
  bgColor.type = "color";
  bgColor.value = props.bgColor || DEFAULT_PROPS.bgColor;
  bgColor.style.width = "100%";
  colorRow.append("文字", fontColor, "背景", bgColor);

  left.append(
    makeSlider("字号", 8, 96, 1, props.fontSize, (value) => {
      props.fontSize = value;
      syncTextarea();
      markDirty();
    }),
    makeSlider("行距", 0.8, 2.5, 0.05, props.lineHeight, (value) => {
      props.lineHeight = value;
      syncTextarea();
      markDirty();
    }),
    makeSlider("字距", -4, 12, 0.5, props.letterSpacing || 0, (value) => {
      props.letterSpacing = value;
      syncTextarea();
      markDirty();
    }),
    colorRow,
  );

  right.append(
    makeSlider("透明", 0, 1, 0.05, props.bgOpacity, (value) => {
      props.bgOpacity = value;
      syncTextarea();
      markDirty();
    }),
    makeSlider("边框", 0, 1, 0.05, props.borderOpacity, (value) => {
      props.borderOpacity = value;
      markDirty();
    }),
    makeSlider("圆角", 0, 32, 1, props.borderRadius, (value) => {
      props.borderRadius = value;
      syncTextarea();
      markDirty();
    }),
    makeSlider("发光", 0, 40, 1, props.glowSize, (value) => {
      props.glowSize = value;
      markDirty();
    }),
  );

  const actionRow = document.createElement("div");
  actionRow.style.cssText = "grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;";
  const alignRow = document.createElement("div");
  alignRow.style.cssText = "display:flex;gap:5px;";
  for (const [value, text] of [["left", "左"], ["center", "中"], ["right", "右"]]) {
    const button = makeButton(text, `文字${text}对齐`);
    button.dataset.align = value;
    button.addEventListener("click", () => {
      props.textAlign = value;
      syncButtons();
      syncTextarea();
      markDirty();
    });
    alignRow.append(button);
  }
  const glow = makeButton("发光", "切换文字发光");
  glow.addEventListener("click", () => {
    props.glowEnabled = !props.glowEnabled;
    syncButtons();
    markDirty();
  });
  const done = makeButton("完成", "保存并关闭");
  done.style.background = "#0a84ff";
  done.style.borderColor = "#0a84ff";
  done.addEventListener("click", () => finish(true));
  actionRow.append(alignRow, glow, done);
  toolbar.append(left, right, actionRow);

  const textarea = document.createElement("textarea");
  textarea.value = props.text || DEFAULT_TEXT;
  textarea.spellcheck = false;
  textarea.style.cssText = "box-sizing:border-box;width:100%;min-height:70px;resize:both;outline:none;border:1px dashed #0a84ff;border-radius:10px;padding:12px;background:transparent;color:#f5f5f7;caret-color:#0a84ff;overflow:hidden;";

  function syncButtons() {
    alignRow.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.align === props.textAlign;
      button.style.background = active ? "#0a84ff" : "#2c2c2e";
      button.style.borderColor = active ? "#0a84ff" : "rgba(255,255,255,.16)";
    });
    glow.style.background = props.glowEnabled ? "#0a84ff" : "#2c2c2e";
    glow.style.borderColor = props.glowEnabled ? "#0a84ff" : "rgba(255,255,255,.16)";
  }

  function syncTextarea() {
    textarea.style.height = `${Math.max(70, showStylePanel ? Math.min(160, viewport.height) : viewport.height)}px`;
    textarea.style.color = props.fontColor || DEFAULT_PROPS.fontColor;
    textarea.style.background = alphaColor(props.bgColor, props.bgOpacity);
    textarea.style.borderRadius = `${props.borderRadius || 0}px`;
    textarea.style.font = `600 ${Math.max(8, props.fontSize)}px Arial, "Microsoft YaHei", "微软雅黑", sans-serif`;
    textarea.style.lineHeight = String(props.lineHeight || DEFAULT_PROPS.lineHeight);
    textarea.style.letterSpacing = `${props.letterSpacing || 0}px`;
    textarea.style.textAlign = props.textAlign || DEFAULT_PROPS.textAlign;
  }

  function finish(save) {
    if (!node.__workspace2TitleEditing) {
      return;
    }
    node.__workspace2TitleEditing = false;
    document.removeEventListener("keydown", handleEditorKeydown, true);
    if (save) {
      props.text = textarea.value.trim() || DEFAULT_TEXT;
      if (!showStylePanel) {
        const rect = textarea.getBoundingClientRect();
        node.size = [
          Math.max(120, rect.width / viewport.scale),
          Math.max(52, rect.height / viewport.scale),
        ];
      }
      markDirty();
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
    props.fontColor = fontColor.value;
    syncTextarea();
    markDirty();
  });
  bgColor.addEventListener("input", () => {
    props.bgColor = bgColor.value;
    syncTextarea();
    markDirty();
  });
  textarea.addEventListener("input", () => {
    props.text = textarea.value || DEFAULT_TEXT;
    markDirty();
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
    container.append(toolbar, textarea);
  } else {
    container.append(textarea);
  }
  document.body.append(container);
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
