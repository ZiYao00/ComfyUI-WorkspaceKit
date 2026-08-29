import { KNOWN_KEYS } from "./field-meta.js";

function deepClone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

export class ThemeRuntimeAdapter {
  constructor(app) {
    this.app = app;
  }

  get liteGraph() {
    return firstDefined(globalThis.LiteGraph, this.app?.canvas?.litegraph);
  }

  get canvasClass() {
    return firstDefined(globalThis.LGraphCanvas, this.app?.canvas?.constructor);
  }

  get canvas() {
    return this.app?.canvas;
  }

  captureRuntimeTheme() {
    const theme = {
      id: `workspacekit-captured-${Date.now()}`,
      name: "WorkspaceKit Captured Theme",
      colors: {
        node_slot: {},
        litegraph_base: {},
        comfy_base: {},
      },
    };

    const slotSources = [
      this.canvas?.default_connection_color_byType,
      this.canvasClass?.link_type_colors,
      this.liteGraph?.link_type_colors,
    ].filter(Boolean);

    for (const key of KNOWN_KEYS.node_slot) {
      for (const source of slotSources) {
        if (source?.[key] !== undefined) {
          theme.colors.node_slot[key] = source[key];
          break;
        }
      }
    }

    const liteSources = [this.liteGraph, this.canvasClass, this.canvas].filter(Boolean);
    for (const key of KNOWN_KEYS.litegraph_base) {
      for (const source of liteSources) {
        if (source?.[key] !== undefined) {
          theme.colors.litegraph_base[key] = source[key];
          break;
        }
      }
    }

    const style = getComputedStyle(document.documentElement);
    for (const key of KNOWN_KEYS.comfy_base) {
      const value = style.getPropertyValue(`--${key}`).trim();
      if (value) theme.colors.comfy_base[key] = value;
    }

    return theme;
  }

  captureSnapshot() {
    return deepClone(this.captureRuntimeTheme());
  }

  applyTheme(theme, { redraw = true } = {}) {
    const colors = theme?.colors ?? {};
    this.applyNodeSlots(colors.node_slot ?? {});
    this.applyLiteGraph(colors.litegraph_base ?? {});
    this.applyComfyBase(colors.comfy_base ?? {});
    if (redraw) this.redraw();
  }

  applyField(section, key, value, { redraw = true } = {}) {
    if (section === "node_slot") this.applyNodeSlots({ [key]: value });
    else if (section === "litegraph_base") this.applyLiteGraph({ [key]: value });
    else if (section === "comfy_base") this.applyComfyBase({ [key]: value });
    if (redraw) this.redraw();
  }

  applyNodeSlots(values) {
    if (!values || typeof values !== "object") return;

    const targets = [
      this.canvas?.default_connection_color_byType,
      this.canvasClass?.link_type_colors,
      this.liteGraph?.link_type_colors,
    ].filter(Boolean);

    if (!targets.length && this.canvas) {
      this.canvas.default_connection_color_byType = {};
      targets.push(this.canvas.default_connection_color_byType);
    }

    for (const target of targets) Object.assign(target, values);

    if (this.canvas?.default_connection_color_byType) {
      this.canvas.default_connection_color_byType = {
        ...this.canvas.default_connection_color_byType,
        ...values,
      };
    }
  }

  applyLiteGraph(values) {
    if (!values || typeof values !== "object") return;
    const targets = [this.liteGraph, this.canvasClass, this.canvas].filter(Boolean);

    for (const [key, value] of Object.entries(values)) {
      for (const target of targets) {
        try {
          target[key] = value;
        } catch (error) {
          console.debug(`[WorkspaceKit Appearance] Unable to set ${key} on a runtime target.`, error);
        }
      }

      if (key === "CLEAR_BACKGROUND_COLOR" && this.canvas) {
        this.canvas.clear_background_color = value;
      }
      if (key === "BACKGROUND_IMAGE" && this.canvas) {
        this.canvas.background_image = value;
      }

      if (key === "NODE_TITLE_COLOR" || key === "NODE_SELECTED_TITLE_COLOR") {
        const varName = key === "NODE_TITLE_COLOR" ? "--lg-node-title-color" : "--lg-node-selected-title-color";
        try {
          document.documentElement.style.setProperty(varName, String(value));
        } catch (error) {
          console.debug(`[WorkspaceKit Appearance] Unable to set ${varName}.`, error);
        }
      }
    }
  }

  applyComfyBase(values) {
    if (!values || typeof values !== "object") return;
    const rootStyle = document.documentElement.style;
    for (const [key, value] of Object.entries(values)) {
      rootStyle.setProperty(`--${key}`, String(value));
    }
  }

  redraw() {
    try {
      this.canvas?.setDirty?.(true, true);
      this.app?.graph?.setDirtyCanvas?.(true, true);
      this.canvas?.draw?.(true, true);
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Canvas redraw failed.", error);
    }

    document.dispatchEvent(new CustomEvent("workspacekit-theme-preview", {
      detail: { timestamp: Date.now() },
    }));
  }
}
