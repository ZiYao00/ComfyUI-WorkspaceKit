import {
  WORKSPACE2_PANEL_BACKGROUND_MODE_KEY,
  WORKSPACE2_PANEL_BLUR_KEY,
  WORKSPACE2_PANEL_GLASS_KEY,
  WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY,
  WORKSPACE2_PANEL_OPACITY_KEY,
} from "../core/constants.js";

// Persistence and numeric rules only.  DOM ownership, glass portal movement,
// and sidebar handoff deliberately remain in entry.js until their real-page
// lifecycle regression coverage is expanded.
export function createPanelBackgroundState(storage) {
  const snapPanelOpacity = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 100;
    return Math.max(5, Math.min(100, Math.round(numeric)));
  };

  const panelOpacity = () => snapPanelOpacity(storage.getItem(WORKSPACE2_PANEL_OPACITY_KEY) || "100");

  const snapGlassTransparency = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 45;
    return Math.max(5, Math.min(95, Math.round(numeric)));
  };

  const panelBackgroundMode = () => {
    const stored = storage.getItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY);
    if (stored === "transparent" || stored === "glass") return stored;
    const migrated = storage.getItem(WORKSPACE2_PANEL_GLASS_KEY) === "1" ? "glass" : "transparent";
    storage.setItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY, migrated);
    return migrated;
  };

  const glassTransparency = () => snapGlassTransparency(
    storage.getItem(WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY) || "70",
  );

  // The material transparency is retained for existing installations, but the
  // visible Frosted glass control now owns actual backdrop blur instead.
  const snapGlassBlur = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 75;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  };

  const glassBlur = () => snapGlassBlur(
    storage.getItem(WORKSPACE2_PANEL_BLUR_KEY) || "75",
  );

  const glassBlurPixels = (value = glassBlur()) => Math.round(snapGlassBlur(value) * 0.32);

  const setPanelOpacityValue = (value) => {
    const next = snapPanelOpacity(value);
    storage.setItem(WORKSPACE2_PANEL_OPACITY_KEY, String(next));
    return next;
  };

  const setPanelBackgroundModeValue = (mode) => {
    const next = mode === "glass" ? "glass" : "transparent";
    storage.setItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY, next);
    storage.setItem(WORKSPACE2_PANEL_GLASS_KEY, next === "glass" ? "1" : "0");
    return next;
  };

  const setGlassTransparencyValue = (value) => {
    const next = snapGlassTransparency(value);
    storage.setItem(WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY, String(next));
    return next;
  };

  const setGlassBlurValue = (value) => {
    const next = snapGlassBlur(value);
    storage.setItem(WORKSPACE2_PANEL_BLUR_KEY, String(next));
    return next;
  };

  return {
    glassBlur,
    glassBlurPixels,
    glassTransparency,
    panelBackgroundMode,
    panelOpacity,
    setGlassBlurValue,
    setGlassTransparencyValue,
    setPanelBackgroundModeValue,
    setPanelOpacityValue,
    snapGlassBlur,
    snapGlassTransparency,
    snapPanelOpacity,
  };
}
