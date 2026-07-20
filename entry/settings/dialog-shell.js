// Creates only the Settings backdrop, dialog shell, and header.  The caller
// owns lifecycle: attaching/removing the shell, Escape handling, version fetch,
// and all persistence/background behavior remain in entry.js.
export function createSettingsDialogShell({ document, t, toolbarButton }) {
  const createSettingsDialogShell = ({ onClose }) => {
    const backdrop = document.createElement("div");
    backdrop.className = "workspace2-settings-backdrop";
    backdrop.addEventListener("pointerdown", (event) => {
      if (event.target === backdrop) onClose();
    });

    const dialog = document.createElement("div");
    dialog.className = "workspace2-settings-dialog";
    dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
    dialog.addEventListener("click", (event) => event.stopPropagation());

    const header = document.createElement("div");
    header.className = "workspace2-settings-header";
    const title = document.createElement("div");
    title.className = "workspace2-settings-title";
    title.textContent = t("settings.title");
    const close = toolbarButton("x", t("settings.close"), onClose);
    header.append(title, close);

    return { backdrop, dialog, header };
  };

  return { createSettingsDialogShell };
}
