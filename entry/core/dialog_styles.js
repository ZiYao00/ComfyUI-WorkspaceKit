// Shared visual language for WorkspaceKit's compact settings dialogs.
// Keep presentation tokens here so feature dialogs do not slowly diverge into
// unrelated one-off controls.  Behavior and data ownership stay in each
// feature module.
const STYLE_ID = "workspacekit-dialog-styles";

export function ensureWorkspaceKitDialogStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .workspacekit-dialog {
      --workspacekit-dialog-bg: #1e1e1e;
      --workspacekit-dialog-surface: #2a2a2a;
      --workspacekit-dialog-text: #f5f5f7;
      --workspacekit-dialog-muted: #a1a1a6;
      --workspacekit-dialog-border: rgba(255,255,255,.15);
      --workspacekit-dialog-accent: #0a84ff;
      color: var(--workspacekit-dialog-text);
      font-family: Arial, "Microsoft YaHei", "微软雅黑", sans-serif;
    }
    .workspacekit-dialog-header { font-size:16px; font-weight:600; color:var(--workspacekit-dialog-text); }
    .workspacekit-dialog-section { color:#ff9f0a; font-size:13px; font-weight:600; }
    .workspacekit-dialog-row {
      display:grid;
      grid-template-columns:var(--workspacekit-dialog-label-width, 96px) minmax(0,1fr) 44px;
      align-items:center;
      column-gap:8px;
      min-height:30px;
      color:var(--workspacekit-dialog-muted);
      font-size:12px;
    }
    .workspacekit-dialog-row > span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .workspacekit-dialog-row input[type="range"] { width:100%; min-width:0; margin:0; }
    .workspacekit-dialog-value { color:#d1d1d6; text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
    .workspacekit-dialog-color { width:28px; height:24px; padding:1px; justify-self:end; box-sizing:border-box; border:1px solid rgba(255,255,255,.2); border-radius:5px; background:transparent; cursor:pointer; }
    .workspacekit-dialog-button { height:28px; min-width:48px; padding:0 10px; border:1px solid rgba(255,255,255,.16); border-radius:4px; background:#333; color:var(--workspacekit-dialog-text); cursor:pointer; font-size:12px; }
    .workspacekit-dialog-button.is-primary { background:var(--workspacekit-dialog-accent); border-color:rgba(90,200,250,.85); }
    .workspacekit-dialog-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,.12); }
  `;
  document.head.append(style);
}
