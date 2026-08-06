// One compatibility colour is persisted alongside WK's richer presentation
// style.  LiteGraph native groups and rgthree Fast Groups both consume a solid
// hex `color`, while WK also needs separate header alpha and title colour.

export function normalizeHexColor(value) {
  const raw = String(value || '').trim().toLowerCase();
  const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const body = match[1].length === 3
    ? [...match[1]].map((channel) => channel + channel).join('')
    : match[1];
  return `#${body}`;
}

export function rgbaToHexColor(value) {
  const match = String(value || '').match(/rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (!match) return null;
  const channels = match.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Number(channel))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

// Old workflows have no `nativeGroupColor`.  Derive it without mutating the
// workflow: only a user colour edit or a newly created group writes the field.
export function resolveWorkspaceKitGroupNativeColor(group, fallback = null) {
  return normalizeHexColor(group?.nativeGroupColor)
    || rgbaToHexColor(group?.headerBgColor)
    || normalizeHexColor(group?.headerBgColor)
    || normalizeHexColor(fallback);
}

export function readNativeGroupColorPresets(nodeColors, fallbackPresets = [], limit = 10) {
  const seen = new Set();
  const presets = [];
  for (const [key, value] of Object.entries(nodeColors || {})) {
    const hex = normalizeHexColor(value?.groupcolor);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    presets.push({ key: String(key), hex, source: 'litegraph' });
    if (presets.length >= limit) return presets;
  }
  for (const fallback of fallbackPresets) {
    const hex = normalizeHexColor(fallback?.hex ?? fallback);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    presets.push({ key: String(fallback?.key || 'fallback'), hex, source: 'fallback' });
    if (presets.length >= limit) break;
  }
  return presets;
}
