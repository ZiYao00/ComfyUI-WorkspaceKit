// Pure shortcut-toggle policy. Keeping this outside entry.js makes the
// Shift+1/2/3 regression independently testable without booting ComfyUI.
// Callers that must always keep a module open (for example Alt+C after a
// successful template save) leave closeIfActive false.
export function shouldCloseWorkspaceModule({
  closeIfActive = false,
  panelIsOpen = false,
  activeModule = "",
  nextModule = "",
} = {}) {
  return Boolean(
    closeIfActive
    && panelIsOpen
    && activeModule
    && activeModule === nextModule,
  );
}
