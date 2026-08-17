// Builds the Settings dialog's content sections.  It receives all values
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
  // Optional defaults preserve compatibility with an older entry.js or
  // isolated contract caller while the status-help setting is rolling out.
  isStatusHelpEnabled = () => true,
  setStatusHelpEnabled = () => {},
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
  getGroupRepresentationInfo,
  convertGroupsToNative,
  convertGroupsToWorkspaceKit,
  confirmConvertGroupsToNative,
  confirmConvertGroupsToWorkspaceKit,
}) {
  const buildSettingsDialogSections = () => {
    // During a live frontend upgrade entry.js can briefly be newer than this
    // child module or controls.js. Keep the base Settings dialog available if
    // the optional group-gesture control has not loaded yet.
    const groupPointerOptions = typeof groupPointerShortcutOptions === "function" ? groupPointerShortcutOptions() : null;
    const groupPointerShortcuts = typeof settingsSelect === "function" && Array.isArray(groupPointerOptions)
      ? settingsSection(t("settings.groupPointerShortcuts"), [
        settingsHelp(t("settings.groupPointerShortcutsHelp")),
        ...groupPointerOptions.map((shortcut) => {
          const row = settingsSelect(shortcut.label, shortcut.value, shortcut.options, shortcut.onChange);
          const select = row?.querySelector?.("select");
          if (select && shortcut.modifier) {
            select.dataset.workspace2GroupPointerModifier = shortcut.modifier;
          }
          return row;
        }),
        settingsActionButton("restore", t("settings.groupPointerRestore"), () => groupPointerOptions.restoreDefaults?.()),
      ])
      : null;

    const shortcuts = settingsSection(t("settings.shortcuts"), [
      settingsShortcutGrid(),
      settingsHelp(t("settings.moduleShortcutsHelp")),
      ...moduleShortcutOptions().map((shortcut) => settingsCheckbox(shortcut.label, shortcut.checked, shortcut.onChange)),
      groupPointerShortcuts,
    ]);

    const workflowSettings = settingsSection(t("settings.workflowSettings"), [
      settingsRange(t("settings.recentWorkflows"), workflowRecentLimit(), {
        min: 5,
        max: 15,
        snap: snapWorkflowRecentLimit,
        onChange: setWorkflowRecentLimit,
      }),
      settingsHelp(t("settings.recentWorkflowsHelp")),
    ]);
    const templateSettings = settingsSection(t("settings.templateSettings"), [
      settingsCheckbox(t("settings.altCOpenTemplates"), isAltCOpenTemplatesEnabled(), setAltCOpenTemplatesEnabled),
      settingsHelp(t("settings.altCOpenTemplatesHelp")),
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
      settingsCheckbox(t("settings.statusHelp"), isStatusHelpEnabled(), setStatusHelpEnabled),
      settingsCheckbox(
        t("settings.panelIntegrationsEnabled"),
        isPanelIntegrationsEnabled(),
        setPanelIntegrationsEnabled,
      ),
      settingsHelp(t("settings.panelIntegrationsHelp")),
    ]);

    const groupRepresentation = typeof getGroupRepresentationInfo === "function"
      && typeof convertGroupsToNative === "function"
      && typeof convertGroupsToWorkspaceKit === "function"
      ? (() => {
        // T-201 (2026-07-28): show both directions as separate buttons so the
        // user can always see that conversion is bidirectional, instead of one
        // button that silently changes direction with the current state. Each
        // button decides its own enabled state and disabled reason.
        const status = settingsHelp("");
        let conversionInFlight = false;
        const toNativeButton = settingsActionButton("archiveTray", t("groups.convertToNative"), () => runConversion("native"), { variant: "warning" });
        const toWorkspaceKitButton = settingsActionButton("restore", t("groups.convertToWorkspaceKit"), () => runConversion("workspacekit"), { variant: "warning" });

        // Compute, for a given direction, whether it is available and why not.
        // T-206 (2026-07-28): per user design, both directions are available
        // whenever the canvas has any group at all. Forward converts remaining
        // WorkspaceKit overlays to native (preserving existing native groups);
        // reverse converts native groups to WorkspaceKit and merges them into
        // any existing WorkspaceKit groups. Only an empty canvas disables both.
        const directionState = (info, direction) => {
          const workspaceKitCount = Number(info?.workspaceKitGroupCount || 0);
          const nativeGroupCount = Number(info?.nativeGroupCount || 0);
          const totalGroups = workspaceKitCount + nativeGroupCount;
          if (conversionInFlight || info?.isConverting) {
            return { canConvert: false, unavailable: t("groups.convertUnavailableLoading") };
          }
          if (!info?.isReady) {
            return { canConvert: false, unavailable: t("groups.convertUnavailableLoading") };
          }
          if (totalGroups === 0) {
            return { canConvert: false, unavailable: t("groups.convertUnavailableNone") };
          }
          if (direction === "native") {
            // Forward needs WorkspaceKit overlays to convert. If everything is
            // already native, the forward action would be a no-op.
            if (workspaceKitCount > 0) return { canConvert: true, unavailable: "" };
            return { canConvert: false, unavailable: t("groups.convertUnavailableAllNative") };
          }
          // Reverse needs native groups to convert. If everything is already
          // WorkspaceKit, the reverse action would be a no-op.
          if (nativeGroupCount > 0) return { canConvert: true, unavailable: "" };
          return { canConvert: false, unavailable: t("groups.convertUnavailableAllWorkspaceKit") };
        };

        // The status line describes the whole current state, independent of a
        // single button.
        const statusText = (info) => {
          const workspaceKitCount = Number(info?.workspaceKitGroupCount || 0);
          const nativeGroupCount = Number(info?.nativeGroupCount || 0);
          if (conversionInFlight || info?.isConverting) return t("groups.conversionInProgress");
          if (!info?.isReady) return t("groups.conversionLoading");
          if (info.representation === "native") {
            return nativeGroupCount
              ? t("groups.conversionAlreadyNative", { count: nativeGroupCount })
              : t("groups.conversionNativeEmpty");
          }
          if (!workspaceKitCount) return t("groups.conversionEmpty", { nativeCount: nativeGroupCount });
          return nativeGroupCount
            ? t("groups.conversionMixed", { workspaceKitCount, nativeGroupCount })
            : t("groups.conversionReady", { count: workspaceKitCount });
        };

        const applyButtonState = (button, label, canConvert, unavailable) => {
          button.disabled = !canConvert;
          button.setAttribute?.("aria-disabled", String(!canConvert));
          button.title = canConvert ? label : unavailable;
          button.setAttribute?.("aria-label", button.title);
          button.classList?.toggle("is-disabled", !canConvert);
        };

        const refreshStatus = ({ preserveMessage = false } = {}) => {
          const info = getGroupRepresentationInfo() || {};
          if (!preserveMessage) status.textContent = statusText(info);
          const nativeState = directionState(info, "native");
          const workspaceKitState = directionState(info, "workspacekit");
          applyButtonState(toNativeButton, t("groups.convertToNative"), nativeState.canConvert, nativeState.unavailable);
          applyButtonState(toWorkspaceKitButton, t("groups.convertToWorkspaceKit"), workspaceKitState.canConvert, workspaceKitState.unavailable);
          return { info, nativeState, workspaceKitState };
        };

        async function runConversion(direction) {
          const { info, nativeState, workspaceKitState } = refreshStatus();
          const state = direction === "workspacekit" ? workspaceKitState : nativeState;
          if (!state.canConvert) return;
          const confirmConversion = direction === "workspacekit"
            ? confirmConvertGroupsToWorkspaceKit
            : confirmConvertGroupsToNative;
          if (typeof confirmConversion === "function" && !(await confirmConversion(info))) return;
          // The confirmation dialog is asynchronous. The user may have opened
          // another workflow or changed groups while it was visible, so never
          // execute against the old snapshot without checking it again.
          const current = refreshStatus();
          const currentState = direction === "workspacekit" ? current.workspaceKitState : current.nativeState;
          const unchanged = currentState.canConvert
            && current.info.graph === info.graph
            && current.info.workspaceKitGroupCount === info.workspaceKitGroupCount
            && current.info.nativeGroupCount === info.nativeGroupCount
            && current.info.conversionSignature === info.conversionSignature;
          if (!unchanged) {
            status.textContent = t("groups.conversionStateChanged");
            return;
          }
          let preserveTerminalStatus = false;
          try {
            conversionInFlight = true;
            toNativeButton.disabled = true;
            toWorkspaceKitButton.disabled = true;
            (direction === "workspacekit" ? toWorkspaceKitButton : toNativeButton).classList?.add("is-busy");
            status.textContent = t("groups.conversionInProgress");
            const result = direction === "workspacekit"
              ? await convertGroupsToWorkspaceKit(info)
              : await convertGroupsToNative(info);
            if (result?.stale) {
              status.textContent = t("groups.conversionStateChanged");
              preserveTerminalStatus = true;
              return;
            }
            if (result?.inProgress) {
              status.textContent = t("groups.conversionInProgress");
              return;
            }
            if (result?.alreadyNative || result?.alreadyWorkspaceKit || !Number(result?.converted || 0)) {
              refreshStatus();
              return;
            }
            const successKey = direction === "workspacekit" ? "groups.convertedToWorkspaceKit" : "groups.convertedToNative";
            status.textContent = `${t(successKey, { count: result.converted })} ${t("groups.convertSaveRequired")}`;
            preserveTerminalStatus = true;
          } catch (error) {
            status.textContent = t("groups.convertFailed", { message: error?.message || String(error) });
            preserveTerminalStatus = true;
          } finally {
            conversionInFlight = false;
            toNativeButton.classList?.remove("is-busy");
            toWorkspaceKitButton.classList?.remove("is-busy");
            refreshStatus({ preserveMessage: preserveTerminalStatus });
          }
        }

        const buttons = document.createElement("div");
        buttons.className = "workspace2-settings-action-buttons";
        buttons.append(toNativeButton, toWorkspaceKitButton);
        refreshStatus();
        return settingsSection(t("groups.representation"), [settingsHelp(t("groups.representationHelp")), status, buttons]);
      })()
      : null;

    // Group behavior has its own Settings page. Pointer gestures remain in
    // Shortcuts because they are bindings, not representation/data settings.
    const groupSettings = settingsSection(t("settings.groupSettings"), [
      settingsHelp(t("settings.groupSettingsHelp")),
      settingsCheckbox(t("settings.ctrlG"), isCtrlGEnabled(), setCtrlGEnabled),
      settingsHelp(t("settings.ctrlGHelp")),
      groupRepresentation,
    ].filter(Boolean));

    const versionInfo = settingsHelp(t("settings.version", { version: t("settings.versionLoading") }));
    const about = settingsSection(t("settings.about"), [
      versionInfo,
      settingsHelp(t("settings.github")),
    ]);

    const sections = { shortcuts, groupPointerShortcuts, workflowSettings, templateSettings, groupSettings, backgroundEffect, nodeCache, dataManagement, integrations, about, versionInfo };
    return sections;
  };

  return { buildSettingsDialogSections };
}
