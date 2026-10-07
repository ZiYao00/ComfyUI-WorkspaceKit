export const DEFAULT_THUMBNAIL_COUNT = 12;

export function clampFrameIndex(value, totalFrames) {
  const total = Math.max(1, Math.trunc(Number(totalFrames) || 1));
  const numeric = Number(value);
  const rounded = Number.isFinite(numeric) ? Math.round(numeric) : 1;
  return Math.min(total, Math.max(1, rounded));
}

export function frameIndexFromFraction(fraction, totalFrames) {
  const total = Math.max(1, Math.trunc(Number(totalFrames) || 1));
  if (total === 1) return 1;
  const clamped = Math.min(1, Math.max(0, Number(fraction) || 0));
  return 1 + Math.round(clamped * (total - 1));
}

export function frameFraction(frameIndex, totalFrames) {
  const total = Math.max(1, Math.trunc(Number(totalFrames) || 1));
  if (total === 1) return 0;
  const frame = clampFrameIndex(frameIndex, total);
  return (frame - 1) / (total - 1);
}

export function timestampForFrame(frameIndex, fps) {
  const rate = Number(fps);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return (Math.max(1, Math.round(Number(frameIndex) || 1)) - 1) / rate;
}

export function formatTimestamp(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const wholeSeconds = Math.floor(value % 60);
  const tenths = Math.floor((value - Math.floor(value)) * 10 + 1e-6);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(wholeSeconds).padStart(2, "0");
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${mm}:${ss}.${tenths}`
    : `${mm}:${ss}.${tenths}`;
}

export function splitInputVideoPath(value) {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  return slash < 0
    ? { filename: normalized, subfolder: "" }
    : { filename: normalized.slice(slash + 1), subfolder: normalized.slice(0, slash) };
}
