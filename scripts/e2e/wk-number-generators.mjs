// In-memory Legacy / Nodes 2.0 acceptance for the two WK number controls.
// Never saves or replaces a user's workflow. Restores the renderer setting.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.WK_TEST_URL || "http://127.0.0.1:8190/";
const NODES2_SETTING = "Comfy.VueNodes.Enabled";

async function waitForApp(page) {
  await page.waitForFunction(() => window.app?.graph && window.LiteGraph?.createNode
    && window.app?.extensionManager?.setting, null, { timeout: 45_000, polling: 250 });
  await page.waitForTimeout(800);
}

async function probe(page) {
  return page.evaluate(async () => {
    const app = window.app;
    const nodes = ["WKIntegerGenerator", "WKFloatGenerator"].map((name) => {
      const node = window.LiteGraph.createNode(name);
      if (!node) throw new Error(`Could not create ${name}`);
      app.graph.add(node);
      return node;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const originalRandom = Math.random;
    try {
      const report = [];
      for (const node of nodes) {
        const control = node.widgets?.find((item) => item.name === "control_before_generate");
        const value = node.widgets?.find((item) => item.name === "value");
        if (!control?.beforeQueued || !value) {
          throw new Error(`${node.type} number control was not registered`);
        }
        const initialMode = control.value;
        const controlLabel = control.label;
        Math.random = () => 0;
        control.beforeQueued();
        const low = value.value;
        Math.random = () => 1 - Number.EPSILON;
        control.beforeQueued();
        const high = value.value;
        value.value = node.type === "WKIntegerGenerator" ? 0 : 0.3;
        control.value = "increment";
        control.beforeQueued();
        const incremented = value.value;
        const beforePartial = value.value;
        control.beforeQueued({ isPartialExecution: true });
        const partial = value.value;
        const serialized = node.serialize();
        const copy = window.LiteGraph.createNode(node.type);
        copy.configure(serialized);
        const legacyOrder = ["value", "min_value", "max_value", "step"];
        if (node.type === "WKFloatGenerator") legacyOrder.push("decimal_places");
        legacyOrder.push("control_before_generate");
        const legacySerialized = {
          ...serialized,
          widgets_values: legacyOrder.map((name) => node.widgets.find((item) => item.name === name)?.value),
        };
        delete legacySerialized.widgets_values_named;
        const legacyCopy = window.LiteGraph.createNode(node.type);
        legacyCopy.configure(legacySerialized);
        const domMatches = [...document.querySelectorAll("[data-node-id], [data-id]")]
          .filter((element) => element.dataset.nodeId === String(node.id) || element.dataset.id === String(node.id))
          .map((element) => element.textContent || "");
        report.push({
          type: node.type,
          title: node.title,
          outputs: (node.outputs || []).map((output) => output.type),
          widgets: (node.widgets || []).map((item) => item.name),
          initialMode, controlLabel,
          low, high, incremented, beforePartial, partial,
          restoredMode: copy.widgets?.find((item) => item.name === "control_before_generate")?.value,
          restoredValue: copy.widgets?.find((item) => item.name === "value")?.value,
          legacyMode: legacyCopy.widgets?.find((item) => item.name === "control_before_generate")?.value,
          legacyValue: legacyCopy.widgets?.find((item) => item.name === "value")?.value,
          legacyMin: legacyCopy.widgets?.find((item) => item.name === "min_value")?.value,
          legacyMax: legacyCopy.widgets?.find((item) => item.name === "max_value")?.value,
          renderedControlVisible: domMatches.some((text) => text.includes("control before generate")),
        });
      }
      return report;
    } finally {
      Math.random = originalRandom;
      for (const node of nodes) app.graph.remove(node);
      app.graph.change?.();
    }
  });
}

async function queueProbe(page) {
  return page.evaluate(async () => {
    const app = window.app;
    const originalGraph = app.graph.serialize();
    app.graph.clear();
    try {
      const generator = window.LiteGraph.createNode("WKIntegerGenerator");
      const showText = window.LiteGraph.createNode("ShowText|pysssss");
      if (!generator || !showText) throw new Error("Queue probe nodes are unavailable");
      app.graph.add(generator);
      app.graph.add(showText);
      generator.connect(1, showText, 0);
      const value = generator.widgets.find((item) => item.name === "value");
      const control = generator.widgets.find((item) => item.name === "control_before_generate");
      control.value = "increment";
      const queued = [];
      for (let index = 0; index < 2; index++) {
        const complete = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            app.api.removeEventListener("promptQueued", onQueued);
            reject(new Error("Timed out waiting for promptQueued"));
          }, 20_000);
          function onQueued(event) {
            clearTimeout(timeout);
            app.api.removeEventListener("promptQueued", onQueued);
            resolve(event.detail);
          }
          app.api.addEventListener("promptQueued", onQueued);
        });
        app.queuePrompt(0);
        queued.push(await complete);
      }
      return { queued, value: value.value };
    } finally {
      app.graph.clear();
      app.graph.configure(originalGraph);
    }
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const promptBodies = [];
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    if (new URL(request.url()).pathname.endsWith("/prompt")) {
      promptBodies.push(request.postDataJSON());
    }
  });
  let originalSetting;
  try {
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 45_000 });
    await waitForApp(page);
    originalSetting = await page.evaluate((id) => window.app.extensionManager.setting.get(id), NODES2_SETTING);
    const reports = [];
    for (const enabled of [false, true]) {
      await page.evaluate(([id, value]) => window.app.extensionManager.setting.set(id, value), [NODES2_SETTING, enabled]);
      await page.reload({ waitUntil: "load", timeout: 45_000 });
      await waitForApp(page);
      const result = await probe(page);
      const integer = result.find((item) => item.type === "WKIntegerGenerator");
      const floating = result.find((item) => item.type === "WKFloatGenerator");
      assert.deepEqual(integer.outputs, ["INT", "STRING"]);
      assert.deepEqual(floating.outputs, ["FLOAT", "STRING"]);
      assert.deepEqual(integer.widgets, ["value", "control_before_generate", "min_value", "max_value", "step"]);
      assert.deepEqual(floating.widgets, ["value", "control_before_generate", "min_value", "max_value", "step", "decimal_places"]);
      assert.equal(integer.initialMode, "randomize");
      assert.equal(floating.initialMode, "randomize");
      assert.equal(integer.controlLabel, "control before generate");
      assert.equal(floating.controlLabel, "control before generate");
      assert.deepEqual([integer.low, integer.high, integer.incremented], [-4, 2, 1]);
      assert.deepEqual([floating.low, floating.high, floating.incremented], [-4, 2, 0.4]);
      assert.equal(integer.partial, integer.beforePartial);
      assert.equal(floating.partial, floating.beforePartial);
      assert.equal(integer.restoredMode, "increment");
      assert.equal(floating.restoredMode, "increment");
      assert.deepEqual([integer.legacyMode, integer.legacyValue, integer.legacyMin, integer.legacyMax], ["increment", 1, -4, 2]);
      assert.deepEqual([floating.legacyMode, floating.legacyValue, floating.legacyMin, floating.legacyMax], ["increment", 0.4, -4, 2]);
      if (enabled) {
        assert.equal(integer.renderedControlVisible, true);
        assert.equal(floating.renderedControlVisible, true);
      }
      const promptStart = promptBodies.length;
      const queued = await queueProbe(page);
      const submittedValues = promptBodies.slice(promptStart)
        .map((body) => Object.values(body.prompt || {}).find((item) => item.class_type === "WKIntegerGenerator")?.inputs?.value);
      assert.equal(queued.queued.length, 2);
      assert.equal(queued.value, 2);
      assert.deepEqual(submittedValues, [1, 2], JSON.stringify({ promptBodies, errors }));
      reports.push({ nodes2: enabled, result, queued, submittedValues });
    }
    assert.equal(errors.filter((error) => /WKIntegerGenerator|WKFloatGenerator|wk_number_control/i.test(error)).length, 0);
    console.log(JSON.stringify({ reports, errors }, null, 2));
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
