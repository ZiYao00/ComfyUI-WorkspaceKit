// Read-only node-preview layout model. The Nodes panel uses this to create a
// bounded, canvas-like preview without screenshots, hidden node instances, or
// assumptions about third-party DOM widgets.

export const NODE_PREVIEW_ROW_LIMIT = 10;

function normalizeEntries(values, kind) {
  return (Array.isArray(values) ? values : [])
    .map((value) => ({ ...value, kind }))
    .filter((value) => String(value?.name || "").trim());
}

export function buildNodePreviewRows({ inputs = [], widgets = [], outputs = [], limit = NODE_PREVIEW_ROW_LIMIT } = {}) {
  const inputEntries = normalizeEntries(inputs, "input");
  const widgetEntries = normalizeEntries(widgets, "widget");
  const outputEntries = normalizeEntries(outputs, "output");
  const leftEntries = [...inputEntries, ...widgetEntries];
  const rowCount = Math.max(leftEntries.length, outputEntries.length);
  if (!rowCount) return [];

  const safeLimit = Math.max(2, Number(limit) || NODE_PREVIEW_ROW_LIMIT);
  const visibleCount = rowCount > safeLimit ? safeLimit - 1 : rowCount;
  const rows = Array.from({ length: visibleCount }, (_, index) => ({
    input: leftEntries[index] || null,
    output: outputEntries[index] || null,
  }));

  if (rowCount > safeLimit) {
    const hiddenLeft = leftEntries.slice(visibleCount);
    const hiddenOutputs = outputEntries.slice(visibleCount);
    rows.push({
      overflow: {
        inputs: hiddenLeft.filter((entry) => entry.kind === "input").length,
        widgets: hiddenLeft.filter((entry) => entry.kind === "widget").length,
        outputs: hiddenOutputs.length,
      },
    });
  }
  return rows;
}
