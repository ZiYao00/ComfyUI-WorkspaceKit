import assert from "node:assert/strict";

import {
  formatCssColor,
  parseCssColor,
  rgbToHex,
  withAlpha,
} from "../entry/appearance/color-utils.js";
import {
  FIELD_META,
  KNOWN_KEYS,
  inferFieldMeta,
} from "../entry/appearance/field-meta.js";
import {
  cloneTheme,
  getThemeValue,
  setThemeValue,
  validateThemeDocument,
} from "../entry/appearance/theme-document.js";
import { ThemeRuntimeAdapter } from "../entry/appearance/theme-runtime-adapter.js";

function testColorUtils() {
  assert.deepEqual(parseCssColor("#abc"), { r: 170, g: 187, b: 204, a: 1 });
  const alphaHex = parseCssColor("#11223380");
  assert.deepEqual(alphaHex && { ...alphaHex, a: Math.round(alphaHex.a * 1000) / 1000 }, {
    r: 17,
    g: 34,
    b: 51,
    a: 0.502,
  });
  assert.deepEqual(parseCssColor("rgba(300, 10, 20, 50%)"), { r: 255, g: 10, b: 20, a: 0.5 });
  assert.equal(parseCssColor("not-a-color"), null);
  assert.equal(rgbToHex({ r: 255, g: 16, b: 0 }), "#ff1000");
  assert.equal(formatCssColor({ r: 1, g: 2, b: 3, a: 1 }), "#010203");
  assert.equal(withAlpha("#336699", 0.25), "rgba(51, 102, 153, 0.25)");
}

function testThemeDocument() {
  const source = {
    id: "sample",
    name: "Sample",
    colors: {
      node_slot: { IMAGE: "#fff" },
    },
  };
  const validated = validateThemeDocument(source, "en");
  assert.notEqual(validated, source);
  assert.deepEqual(source, {
    id: "sample",
    name: "Sample",
    colors: { node_slot: { IMAGE: "#fff" } },
  });
  assert.deepEqual(validated.colors.litegraph_base, {});
  assert.deepEqual(validated.colors.comfy_base, {});

  setThemeValue(validated, "litegraph_base", "NODE_TEXT_SIZE", 18);
  assert.equal(getThemeValue(validated, "litegraph_base", "NODE_TEXT_SIZE"), 18);
  const cloned = cloneTheme(validated);
  cloned.colors.node_slot.IMAGE = "#000";
  assert.equal(validated.colors.node_slot.IMAGE, "#fff");

  assert.throws(() => validateThemeDocument(null, "en"), /JSON object/);
  assert.throws(() => validateThemeDocument({ colors: { node_slot: [] } }, "en"), /node_slot/);
}

function testFieldMetadata() {
  assert.equal(FIELD_META.node_slot.IMAGE.type, "color");
  assert.ok(KNOWN_KEYS.litegraph_base.includes("NODE_TITLE_COLOR"));
  assert.equal(inferFieldMeta("litegraph_base", "UNKNOWN_COUNT", 4).type, "number");
  assert.equal(inferFieldMeta("comfy_base", "custom-bg", "#123456").type, "color");
  assert.equal(inferFieldMeta("comfy_base", "custom-text", "hello").type, "text");
}

function testRuntimeAdapter() {
  const originalDocument = globalThis.document;
  const originalCustomEvent = globalThis.CustomEvent;
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const originalLiteGraph = globalThis.LiteGraph;
  const originalCanvasClass = globalThis.LGraphCanvas;

  const cssValues = new Map([
    ["--fg-color", "#eeeeee"],
    ["--bg-color", "#111111"],
  ]);
  const inlineValues = new Map();
  const events = [];
  let dirtyCalls = 0;
  let drawCalls = 0;

  globalThis.document = {
    documentElement: {
      style: {
        setProperty(name, value) {
          inlineValues.set(name, value);
        },
      },
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.getComputedStyle = () => ({
    getPropertyValue(name) {
      return cssValues.get(name) ?? "";
    },
  });
  globalThis.LiteGraph = {
    NODE_TITLE_COLOR: "#old-title",
    link_type_colors: { IMAGE: "#old-image" },
  };
  globalThis.LGraphCanvas = {
    link_type_colors: { IMAGE: "#old-class-image" },
  };

  const app = {
    canvas: {
      default_connection_color_byType: { IMAGE: "#old-canvas-image" },
      setDirty() { dirtyCalls += 1; },
      draw() { drawCalls += 1; },
    },
    graph: {
      setDirtyCanvas() { dirtyCalls += 1; },
    },
  };

  try {
    const adapter = new ThemeRuntimeAdapter(app);
    adapter.applyField("node_slot", "IMAGE", "#123456", { redraw: false });
    assert.equal(app.canvas.default_connection_color_byType.IMAGE, "#123456");
    assert.equal(globalThis.LiteGraph.link_type_colors.IMAGE, "#123456");

    adapter.applyField("litegraph_base", "NODE_TITLE_COLOR", "#abcdef", { redraw: false });
    assert.equal(globalThis.LiteGraph.NODE_TITLE_COLOR, "#abcdef");
    assert.equal(inlineValues.get("--lg-node-title-color"), "#abcdef");

    adapter.applyField("comfy_base", "fg-color", "#fedcba", { redraw: false });
    assert.equal(inlineValues.get("--fg-color"), "#fedcba");

    const captured = adapter.captureRuntimeTheme();
    assert.equal(captured.colors.node_slot.IMAGE, "#123456");
    assert.equal(captured.colors.litegraph_base.NODE_TITLE_COLOR, "#abcdef");
    assert.equal(captured.colors.comfy_base["fg-color"], "#eeeeee");

    adapter.redraw();
    assert.equal(dirtyCalls, 2);
    assert.equal(drawCalls, 1);
    assert.equal(events.at(-1)?.type, "workspacekit-theme-preview");
  } finally {
    globalThis.document = originalDocument;
    globalThis.CustomEvent = originalCustomEvent;
    globalThis.getComputedStyle = originalGetComputedStyle;
    globalThis.LiteGraph = originalLiteGraph;
    globalThis.LGraphCanvas = originalCanvasClass;
  }
}

testColorUtils();
testThemeDocument();
testFieldMetadata();
testRuntimeAdapter();

console.log("Appearance core contract passed.");
