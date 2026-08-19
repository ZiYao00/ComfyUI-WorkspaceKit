import {
  WORKSPACE2_PANEL_BACKGROUND_MODE_KEY,
  WORKSPACE2_PANEL_BLUR_KEY,
  WORKSPACE2_PANEL_BLUR_SCALE_VERSION_KEY,
  WORKSPACE2_PANEL_GLASS_KEY,
  WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY,
  WORKSPACE2_PANEL_OPACITY_KEY,
} from "../core/constants.js";

// Persistence and numeric rules only.  DOM ownership, glass portal movement,
// and sidebar handoff deliberately remain in entry.js until their real-page
// lifecycle regression coverage is expanded.
export function createPanelBackgroundState(storage) {
  // The original 0–20% range was visually indistinguishable from transparent
  // mode. Keep the 0–100 control, but map it to the former 20–100 effective
  // range so its new 0 is the old, useful 20% appearance.
  const GLASS_BLUR_LEGACY_FLOOR = 20;
  const GLASS_BLUR_SCALE_VERSION = "2";

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

  const migrateGlassBlurScale = () => {
    if (storage.getItem(WORKSPACE2_PANEL_BLUR_SCALE_VERSION_KEY) === GLASS_BLUR_SCALE_VERSION) {
      return;
    }
    const legacyValue = snapGlassBlur(storage.getItem(WORKSPACE2_PANEL_BLUR_KEY) || "75");
    const migrated = Math.round((legacyValue - GLASS_BLUR_LEGACY_FLOOR) / (1 - GLASS_BLUR_LEGACY_FLOOR / 100));
    storage.setItem(WORKSPACE2_PANEL_BLUR_KEY, String(Math.max(0, Math.min(100, migrated))));
    storage.setItem(WORKSPACE2_PANEL_BLUR_SCALE_VERSION_KEY, GLASS_BLUR_SCALE_VERSION);
  };

  const glassBlur = () => {
    migrateGlassBlurScale();
    return snapGlassBlur(storage.getItem(WORKSPACE2_PANEL_BLUR_KEY) || "69");
  };

  const glassBlurPixels = (value = glassBlur()) => {
    const effectivePercent = GLASS_BLUR_LEGACY_FLOOR
      + snapGlassBlur(value) * (1 - GLASS_BLUR_LEGACY_FLOOR / 100);
    return Math.round(effectivePercent * 0.32);
  };

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
    storage.setItem(WORKSPACE2_PANEL_BLUR_SCALE_VERSION_KEY, GLASS_BLUR_SCALE_VERSION);
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
