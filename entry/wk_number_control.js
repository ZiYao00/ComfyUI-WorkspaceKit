import { app } from "../../scripts/app.js";
import { nextFloatValue, nextIntegerValue } from "./nodes/number-control-math.js";

const NODE_TYPES = new Set(["WKIntegerGenerator", "WKFloatGenerator"]);
const CONTROL_NAME = "control_before_generate";
const CONTROL_MODES = ["fixed", "increment", "decrement", "randomize"];

function widget(node, name) {
  return node.widgets?.find((item) => item.name === name);
}

function valueIsConnected(node) {
  return node.inputs?.some((input) => input.widget?.name === "value" && input.link != null);
}

function addNumberControl(node) {
  if (widget(node, CONTROL_NAME) || !widget(node, "value")) return;

  const control = node.addWidget("combo", CONTROL_NAME, "randomize", () => {}, {
    values: CONTROL_MODES,
    serialize: false,
  });
  control.label = "control before generate";
  node.widgets.splice(node.widgets.indexOf(control), 1);
  node.widgets.splice(node.widgets.indexOf(widget(node, "value")) + 1, 0, control);

  const onConfigure = node.onConfigure;
  node.onConfigure = function (info) {
    onConfigure?.apply(this, arguments);
    const values = info?.widgets_values;
    if (!Array.isArray(values) || typeof values[1] === "string") return;
    const names = ["value", "min_value", "max_value", "step"];
    if (this.type === "WKFloatGenerator") names.push("decimal_places");
    if (values.length !== names.length && values.length !== names.length + 1) return;
    if (values.length === names.length + 1 && !CONTROL_MODES.includes(values.at(-1))) return;
    names.forEach((name, index) => {
      const target = widget(this, name);
      if (target) target.value = values[index];
    });
    control.value = values.length > names.length ? values.at(-1) : "randomize";
  };
  control.beforeQueued = ({ isPartialExecution } = {}) => {
    // Match ComfyUI's own value controls: a partial queue must not advance
    // unrelated nodes, and a linked value input owns its value externally.
    if (isPartialExecution || valueIsConnected(node)) return;
    const current = widget(node, "value");
    if (!current) return;
    const inputs = {
      current: Number(current.value),
      min: Number(widget(node, "min_value")?.value),
      max: Number(widget(node, "max_value")?.value),
      step: Number(widget(node, "step")?.value),
      mode: control.value,
    };
    try {
      const next = node.type === "WKFloatGenerator"
        ? nextFloatValue({ ...inputs, decimalPlaces: Number(widget(node, "decimal_places")?.value) })
        : nextIntegerValue(inputs);
      if (next === current.value) return;
      current.value = next;
      current.callback?.(next);
    } catch (error) {
      // The backend will report the invalid range when the prompt executes.
      console.warn(`[WorkspaceKit] ${node.type}: ${error.message}`);
    }
  };
}

app.registerExtension({
  name: "comfyui.workspacekit.number-control",
  nodeCreated(node) {
    if (NODE_TYPES.has(node.comfyClass || node.type)) addNumberControl(node);
  },
});
