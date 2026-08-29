function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseCssColor(input) {
  const value = String(input ?? "").trim();
  if (!value) return null;

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let body = hex[1];
    if (body.length === 3 || body.length === 4) {
      body = [...body].map((char) => char + char).join("");
    }
    const hasAlpha = body.length === 8;
    return {
      r: parseInt(body.slice(0, 2), 16),
      g: parseInt(body.slice(2, 4), 16),
      b: parseInt(body.slice(4, 6), 16),
      a: hasAlpha ? parseInt(body.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const alphaRaw = rgb[4];
    const alpha = alphaRaw?.endsWith("%")
      ? Number.parseFloat(alphaRaw) / 100
      : Number.parseFloat(alphaRaw ?? "1");
    return {
      r: clamp(Math.round(Number.parseFloat(rgb[1])), 0, 255),
      g: clamp(Math.round(Number.parseFloat(rgb[2])), 0, 255),
      b: clamp(Math.round(Number.parseFloat(rgb[3])), 0, 255),
      a: clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1),
    };
  }

  return null;
}

export function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function formatCssColor(color, preferHex = true) {
  const alpha = clamp(Number(color.a ?? 1), 0, 1);
  if (preferHex && alpha >= 0.999) return rgbToHex(color);
  const roundedAlpha = Math.round(alpha * 1000) / 1000;
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${roundedAlpha})`;
}

export function withAlpha(input, alpha) {
  const parsed = parseCssColor(input) ?? { r: 0, g: 0, b: 0, a: 1 };
  parsed.a = clamp(Number(alpha), 0, 1);
  return formatCssColor(parsed, parsed.a >= 0.999);
}

export function sampleCanvasColor(canvas, clientX, clientY, sampleSize = 1, locale = "zh") {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const centerX = Math.round((clientX - rect.left) * scaleX);
  const centerY = Math.round((clientY - rect.top) * scaleY);
  const radius = Math.floor(Math.max(1, sampleSize) / 2);
  const startX = clamp(centerX - radius, 0, Math.max(0, canvas.width - 1));
  const startY = clamp(centerY - radius, 0, Math.max(0, canvas.height - 1));
  const width = clamp(radius * 2 + 1, 1, canvas.width - startX);
  const height = clamp(radius * 2 + 1, 1, canvas.height - startY);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error(locale === "en" ? "Unable to read the reference image canvas." : "无法读取参考图 Canvas。");
  const pixels = context.getImageData(startX, startY, width, height).data;

  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let weight = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha <= 0) continue;
    r += pixels[index] * alpha;
    g += pixels[index + 1] * alpha;
    b += pixels[index + 2] * alpha;
    a += alpha;
    weight += alpha;
  }

  if (!weight) return null;
  return {
    r: Math.round(r / weight),
    g: Math.round(g / weight),
    b: Math.round(b / weight),
    a: clamp(a / (pixels.length / 4), 0, 1),
  };
}
