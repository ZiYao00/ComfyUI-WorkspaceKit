const STYLE_ID = "workspacekit-appearance-styles";

export function ensureAppearanceStyles(document = globalThis.document) {
  if (!document?.head || document.getElementById?.(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.workspacekit-appearance {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  color: var(--workspacekit-ui-fg, inherit);
}
.workspacekit-appearance-toolbar {
  min-width: 0;
}
.workspacekit-appearance-search,
.workspacekit-appearance-input,
.workspacekit-appearance-select {
  box-sizing: border-box;
  min-width: 0;
  height: 30px;
  border: 1px solid var(--workspacekit-ui-border, rgba(127,127,127,.28));
  border-radius: 7px;
  padding: 0 9px;
  background: var(--workspacekit-ui-control-bg, rgba(127,127,127,.08));
  color: inherit;
  outline: none;
}
.workspacekit-appearance-search {
  width: min(280px, 44vw);
}
.workspacekit-appearance-input:focus,
.workspacekit-appearance-select:focus,
.workspacekit-appearance-search:focus {
  border-color: var(--workspacekit-ui-accent, #7aa2f7);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 35%, transparent);
}
.workspacekit-appearance-controls {
  display: grid;
  grid-template-columns: minmax(130px, 1fr) minmax(110px, .8fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
}
.workspacekit-appearance-control-label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--workspacekit-ui-muted, currentColor);
}
.workspacekit-appearance-control-label > span {
  opacity: .72;
}
.workspacekit-appearance-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 12px;
}
.workspacekit-appearance-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.workspacekit-appearance-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 7px;
}
.workspacekit-appearance-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 38px;
  padding: 6px 7px;
  border: 1px solid var(--workspacekit-ui-border, rgba(127,127,127,.18));
  border-radius: 8px;
  background: color-mix(in srgb, var(--workspacekit-ui-control-bg, rgba(127,127,127,.06)) 70%, transparent);
}
.workspacekit-appearance-field.is-active-color {
  border-color: var(--workspacekit-ui-accent, #7aa2f7);
}
.workspacekit-appearance-field-copy {
  min-width: 0;
}
.workspacekit-appearance-field-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.workspacekit-appearance-field-key {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
  opacity: .48;
}
.workspacekit-appearance-field-editor {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  min-width: 74px;
}
.workspacekit-appearance-color {
  width: 34px;
  height: 26px;
  padding: 1px;
  border: 1px solid var(--workspacekit-ui-border, rgba(127,127,127,.28));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}
.workspacekit-appearance-value {
  width: 80px;
  height: 28px;
  font: 10px ui-monospace, SFMono-Regular, Consolas, monospace;
}
.workspacekit-appearance-number { width: 78px; }
.workspacekit-appearance-reference {
  display: grid;
  grid-template-columns: minmax(90px, 128px) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.workspacekit-appearance-reference-preview {
  width: 100%;
  max-height: 110px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--workspacekit-ui-border, rgba(127,127,127,.18));
  background: rgba(0,0,0,.12);
}
.workspacekit-appearance-palette {
  display: grid;
  grid-template-columns: repeat(4, minmax(30px, 1fr));
  gap: 6px;
}
.workspacekit-appearance-swatch {
  height: 30px;
  border: 1px solid var(--workspacekit-ui-border, rgba(127,127,127,.25));
  border-radius: 7px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.workspacekit-appearance-empty {
  padding: 18px 8px;
  text-align: center;
  opacity: .64;
}
.workspacekit-appearance-file-input { display: none; }
@media (max-width: 520px) {
  .workspacekit-appearance-controls { grid-template-columns: 1fr; }
  .workspacekit-appearance-reference { grid-template-columns: 1fr; }
}
`;
  document.head.append(style);
}
