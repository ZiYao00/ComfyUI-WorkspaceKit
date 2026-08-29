const MAX_ANALYSIS_EDGE = 360;
const DEFAULT_COLOR_COUNT = 8;
const CHANNEL_BUCKET = 24;

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHex(value) {
  return clampChannel(value).toString(16).padStart(2, "0");
}

function bucketKey(r, g, b) {
  return [r, g, b]
    .map((value) => Math.round(value / CHANNEL_BUCKET) * CHANNEL_BUCKET)
    .map(clampChannel)
    .join(",");
}

function colorDistance(left, right) {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Extract a compact reference palette without a third-party runtime dependency.
 * The image is first downscaled to a bounded analysis canvas, then sampled into
 * coarse RGB buckets. Close colors are de-duplicated so UI screenshots do not
 * spend all eight suggestions on near-identical grays.
 */
export function extractReferencePalette(image, { colorCount = DEFAULT_COLOR_COUNT } = {}) {
  if (!image?.naturalWidth || !image?.naturalHeight || !globalThis.document?.createElement) return [];

  const scale = Math.min(
    1,
    MAX_ANALYSIS_EDGE / image.naturalWidth,
    MAX_ANALYSIS_EDGE / image.naturalHeight,
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map();
  // Sampling every second pixel is enough after the 360px cap and keeps palette
  // extraction responsive on large screenshots.
  for (let index = 0; index < data.length; index += 8) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.08) continue;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const key = bucketKey(r, g, b);
    const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    entry.count += alpha;
    entry.r += r * alpha;
    entry.g += g * alpha;
    entry.b += b * alpha;
    buckets.set(key, entry);
  }

  const candidates = [...buckets.values()]
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      count: entry.count,
      r: entry.r / entry.count,
      g: entry.g / entry.count,
      b: entry.b / entry.count,
    }))
    .sort((left, right) => right.count - left.count);

  const selected = [];
  for (const candidate of candidates) {
    if (selected.some((existing) => colorDistance(existing, candidate) < 34)) continue;
    selected.push(candidate);
    if (selected.length >= Math.max(1, colorCount)) break;
  }

  // Very monochrome references can collapse to fewer than requested colors.
  // Fill remaining slots from less distinct high-frequency buckets rather than
  // returning an unexpectedly empty palette.
  if (selected.length < colorCount) {
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;
      if (selected.some((existing) => colorDistance(existing, candidate) < 12)) continue;
      selected.push(candidate);
      if (selected.length >= colorCount) break;
    }
  }

  return selected.map(({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`);
}
