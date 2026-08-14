import assert from "node:assert/strict";
import { buildNodePreviewRows, NODE_PREVIEW_ROW_LIMIT } from "../entry/nodes/preview-model.js";

const inputs = Array.from({ length: 8 }, (_, index) => ({ name: `input_${index + 1}`, type: "IMAGE" }));
const widgets = Array.from({ length: 7 }, (_, index) => ({ name: `widget_${index + 1}`, type: "STRING" }));
const outputs = Array.from({ length: 12 }, (_, index) => ({ name: `output_${index + 1}`, type: "IMAGE" }));
const rows = buildNodePreviewRows({ inputs, widgets, outputs });

assert.equal(rows.length, NODE_PREVIEW_ROW_LIMIT);
assert.equal(rows.at(-1).overflow.inputs, 0);
assert.equal(rows.at(-1).overflow.widgets, 6);
assert.equal(rows.at(-1).overflow.outputs, 3);
assert.equal(rows[0].input.name, "input_1");
assert.equal(rows[0].output.name, "output_1");
assert.equal(rows[8].input.name, "widget_1");
assert.equal(rows[8].output.name, "output_9");

const shortRows = buildNodePreviewRows({ inputs: [{ name: "image", type: "IMAGE" }], outputs: [{ name: "IMAGE", type: "IMAGE" }] });
assert.deepEqual(shortRows, [{
  input: { name: "image", type: "IMAGE", kind: "input" },
  output: { name: "IMAGE", type: "IMAGE", kind: "output" },
}]);

console.log("Node preview model contract passed.");
