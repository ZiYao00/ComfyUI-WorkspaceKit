// Builds the Settings dialog's five content sections.  It receives all values
// and mutations from entry.js, so it cannot own localStorage, node-cache,
// glass-overlay, or sidebar lifecycle behavior.
export function createSettingsDialogSections({
  document,
  t,
  toolbarButton,
  settingsCheckbox,
  settingsSelect,
  settingsActionButton,
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
  isPanelIntegrationsEnabled,
  setPanelIntegrationsEnabled,
  moduleShortcutOptions,
  groupPointerShortcutOptions,
  workflowRecentLimit,
  snapWorkflowRecentLimit,
  setWorkflowRecentLimit,
  panelBackgroundMode,
  panelOpacity,
  snapPanelOpacity,
  setPanelOpacity,
  glassBlur,
  snapGlassBlur,
  setGlassBlur,
  setPanelBackgroundMode,
  getNodeCacheInfo,
  clearNodeCache,
  confirmClearNodeCache,
  buildDataManagementSection,
}) {
  const buildSettingsDialogSections = () => {
    const shortcuts = settingsSection(t("settings.shortcuts"), [
      settingsShortcutGrid(),
      settingsHelp(t("settings.moduleShortcutsHelp")),
      ...moduleShortcutOptions().map((shortcut) => settingsCheckbox(shortcut.label, shortcut.checked, shortcut.onChange)),
      settingsCheckbox(t("settings.ctrlG"), isCtrlGEnabled(), setCtrlGEnabled),
      settingsHelp(t("settings.ctrlGHelp")),
    ]);

    // During a live frontend upgrade entry.js can briefly be newer than this
    // child module or controls.js. Keep the base Settings dialog available if
    // the optional group-gesture control has not loaded yet.
    const groupPointerShortcuts = typeof settingsSelect === "function" && typeof groupPointerShortcutOptions === "function"
      ? settingsSection(t("settings.groupPointerShortcuts"), [
        settingsHelp(t("settings.groupPointerShortcutsHelp")),
        ...groupPointerShortcutOptions().map((shortcut) => {
          const row = settingsSelect(shortcut.label, shortcut.value, shortcut.options, shortcut.onChange);
          const select = row?.querySelector?.("select");
          if (select && shortcut.modifier) {
            select.dataset.workspace2GroupPointerModifier = shortcut.modifier;
          }
          return row;
        }),
      ])
      : null;

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
      glassBlur(),
      {
        min: 0,
        max: 100,
        snap: snapGlassBlur,
        onChange: setGlassBlur,
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
    const clearCache = settingsActionButton("trash", t("settings.clearNodeCache"), async () => {
      try {
        if (!(await confirmClearNodeCache?.())) return;
        await clearNodeCache();
        cacheInfo.textContent = t("settings.nodeCacheCleared");
      } catch (error) {
        cacheInfo.textContent = error.message || String(error);
      }
    }, { variant: "danger" });
    const cacheRow = document.createElement("div");
    cacheRow.className = "workspace2-settings-action-row";
    const cacheButtons = document.createElement("div");
    cacheButtons.className = "workspace2-settings-action-buttons";
    cacheButtons.append(clearCache);
    cacheRow.append(cacheInfo, cacheButtons);
    const nodeCache = settingsSection(t("settings.nodeCache"), [cacheRow]);
    const dataManagement = buildDataManagementSection();

    const integrations = settingsSection(t("settings.panelIntegrations"), [
      settingsCheckbox(
        t("settings.panelIntegrationsEnabled"),
        isPanelIntegrationsEnabled(),
        setPanelIntegrationsEnabled,
      ),
      settingsHelp(t("settings.panelIntegrationsHelp")),
    ]);

    const versionInfo = settingsHelp(t("settings.version", { version: t("settings.versionLoading") }));
    const about = settingsSection(t("settings.about"), [
      versionInfo,
      settingsHelp(t("settings.github")),
    ]);

    return { shortcuts, groupPointerShortcuts, behavior, backgroundEffect, nodeCache, dataManagement, integrations, about, versionInfo };
  };

  return { buildSettingsDialogSections };
}
