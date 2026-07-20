// Renders the saved-template canvas thumbnail only.  It does not inspect the
// live graph, mutate the template library, or manage preview-popover lifecycle;
// those responsibilities remain in entry.js.
export function createTemplateMinimap({ document, getDevicePixelRatio, t, vectorPair }) {
  const templatePreviewNodes = (template) => (Array.isArray(template?.nodes) ? template.nodes : [])
    .map((node) => {
      const relPos = Array.isArray(node?.relPos) ? node.relPos : null;
      const pos = relPos || (Array.isArray(node?.pos) ? node.pos : [0, 0]);
      const size = vectorPair(node?.size, [180, 80]);
      return {
        id: String(node?.id ?? ""),
        type: String(node?.type || ""),
        title: String(node?.title || node?.type || ""),
        x: Number(pos?.[0] || 0),
        y: Number(pos?.[1] || 0),
        width: Math.max(40, Number(size[0] || 180)),
        height: Math.max(24, Number(size[1] || 80)),
        color: String(node?.color || ""),
        bgcolor: String(node?.bgcolor || ""),
        mode: Number(node?.mode || 0),
      };
    })
    .filter((node) => node.type || node.id);

  const templatePreviewBounds = (nodes) => {
    if (!nodes.length) return { minX: 0, minY: 0, width: 100, height: 100 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
    return { minX, minY, width: Math.max(100, maxX - minX), height: Math.max(100, maxY - minY) };
  };

  const templatePreviewNodeFill = (node) => {
    if (node.mode === 4) return "#45424d";
    if (node.bgcolor && /^(#|rgb|hsl)/i.test(node.bgcolor)) return node.bgcolor;
    if (node.color && /^(#|rgb|hsl)/i.test(node.color)) return node.color;
    const normalized = node.type.toLowerCase();
    if (normalized.includes("image")) return "#335f87";
    if (normalized.includes("latent")) return "#6f4a82";
    if (normalized.includes("model")) return "#615384";
    if (normalized.includes("clip") || normalized.includes("text")) return "#70623e";
    if (normalized.includes("vae")) return "#804b4b";
    return "#4f5663";
  };

  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const renderTemplateMinimap = (template, options = {}) => {
    const width = Number(options.width || 320);
    const height = Number(options.height || 190);
    const padding = 18;
    const dpr = Math.max(1, Math.min(2, getDevicePixelRatio() || 1));
    const canvas = document.createElement("canvas");
    canvas.className = "workspace2-template-minimap";
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = "100%";
    canvas.style.aspectRatio = `${width} / ${height}`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#181a1f";
    ctx.fillRect(0, 0, width, height);
    const nodes = templatePreviewNodes(template);
    if (!nodes.length) {
      ctx.fillStyle = "#7e828c";
      ctx.font = "12px sans-serif";
      ctx.fillText(t("templates.empty"), padding, height / 2);
      return canvas;
    }
    const bounds = templatePreviewBounds(nodes);
    const scale = Math.min((width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height);
    const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
    const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const project = (x, y) => [x * scale + offsetX, y * scale + offsetY];
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(178, 184, 196, 0.32)";
    for (const link of Array.isArray(template?.links) ? template.links : []) {
      const origin = nodeById.get(String(link?.origin_id ?? ""));
      const target = nodeById.get(String(link?.target_id ?? ""));
      if (!origin || !target) continue;
      const [x1, y1] = project(origin.x + origin.width, origin.y + origin.height * 0.5);
      const [x2, y2] = project(target.x, target.y + target.height * 0.5);
      const dx = Math.max(16, Math.abs(x2 - x1) * 0.45);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
      ctx.stroke();
    }
    ctx.restore();
    for (const node of nodes) {
      const [x, y] = project(node.x, node.y);
      const nodeWidth = Math.max(12, node.width * scale);
      const nodeHeight = Math.max(8, node.height * scale);
      const radius = Math.min(5, Math.max(2, nodeHeight * 0.16));
      ctx.fillStyle = templatePreviewNodeFill(node);
      ctx.strokeStyle = "rgba(226, 229, 235, 0.42)";
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, x, y, nodeWidth, nodeHeight, radius);
      ctx.fill();
      ctx.stroke();
      if (nodeWidth > 28 && nodeHeight > 12) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(x + 5, y + 5, Math.max(8, nodeWidth * 0.36), 2);
      }
    }
    return canvas;
  };

  return { templatePreviewNodes, templatePreviewBounds, templatePreviewNodeFill, renderTemplateMinimap };
}
