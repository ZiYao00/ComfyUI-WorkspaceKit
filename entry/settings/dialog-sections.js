// Builds the Settings dialog's five content sections.  It receives all values
// and mutations from entry.js, so it cannot own localStorage, node-cache,
// glass-overlay, or sidebar lifecycle behavior.
export function createSettingsDialogSections({
  document,
  t,
  toolbarButton,
  settingsCheckbox,
  settingsSection,
  settingsHelp,
  settingsShortcutGrid,
  settingsRange,
  settingsModeRange,
  updateSettingsModeRange,
  isCtrlGEnabled,
  setCtrlGEnabled,
  isAltCOpenTemplatesEnabled,
  setAltCOpenTemplatesEnabled,
  workflowRecentLimit,
  snapWorkflowRecentLimit,
  setWorkflowRecentLimit,
  panelBackgroundMode,
  panelOpacity,
  snapPanelOpacity,
  setPanelOpacity,
  glassTransparency,
  snapGlassTransparency,
  setGlassTransparency,
  setPanelBackgroundMode,
  getNodeCacheInfo,
  clearNodeCache,
  buildDataManagementSection,
}) {
  const buildSettingsDialogSections = () => {
    const shortcuts = settingsSection(t("settings.shortcuts"), [
      settingsShortcutGrid(),
      settingsCheckbox(t("settings.ctrlG"), isCtrlGEnabled(), setCtrlGEnabled),
      settingsHelp(t("settings.ctrlGHelp")),
    ]);

    const behavior = settingsSection(t("settings.behavior"), [
      settingsCheckbox(t("settings.altCOpenTemplates"), isAltCOpenTemplatesEnabled(), setAltCOpenTemplatesEnabled),
      settingsRange(t("settings.recentWorkflows"), workflowRecentLimit(), {
        min: 2,
        max: 20,
        snap: snapWorkflowRecentLimit,
        onChange: setWorkflowRecentLimit,
      }),
    ]);

    let transparentModeRow;
    let glassModeRow;
    const selectBackgroundMode = (mode) => {
      setPanelBackgroundMode(mode);
      updateSettingsModeRange(transparentModeRow, mode === "transparent");
      updateSettingsModeRange(glassModeRow, mode === "glass");
    };
    transparentModeRow = settingsModeRange(
      t("settings.transparentBackground"),
      "transparent",
      panelBackgroundMode() === "transparent",
      panelOpacity(),
      {
        min: 5,
        max: 100,
        snap: snapPanelOpacity,
        onChange: setPanelOpacity,
        onSelect: selectBackgroundMode,
      },
    );
    glassModeRow = settingsModeRange(
      t("settings.glassBackground"),
      "glass",
      panelBackgroundMode() === "glass",
      glassTransparency(),
      {
        min: 5,
        max: 95,
        snap: snapGlassTransparency,
        onChange: setGlassTransparency,
        onSelect: selectBackgroundMode,
      },
    );
    const backgroundEffect = settingsSection(t("settings.backgroundEffect"), [
      transparentModeRow,
      glassModeRow,
    ]);

    const cache = getNodeCacheInfo();
    const cacheInfo = settingsHelp(cache.count
      ? `${t("settings.cacheCount", { count: cache.count })}\n${t("settings.cacheUpdated", { time: cache.updatedAt })}`
      : t("settings.cacheEmpty"));
    const clearCache = toolbarButton("trash", t("settings.clearNodeCache"), async () => {
      try {
        await clearNodeCache();
        cacheInfo.textContent = t("settings.nodeCacheCleared");
      } catch (error) {
        cacheInfo.textContent = error.message || String(error);
      }
    });
    const cacheRow = document.createElement("div");
    cacheRow.className = "workspace2-settings-row";
    cacheRow.append(cacheInfo, clearCache);
    const nodeCache = settingsSection(t("settings.nodeCache"), [cacheRow]);
    const dataManagement = buildDataManagementSection();

    const versionInfo = settingsHelp(t("settings.version", { version: t("settings.versionLoading") }));
    const about = settingsSection(t("settings.about"), [
      versionInfo,
      settingsHelp(t("settings.github")),
    ]);

    return { shortcuts, behavior, backgroundEffect, nodeCache, dataManagement, about, versionInfo };
  };

  return { buildSettingsDialogSections };
}
