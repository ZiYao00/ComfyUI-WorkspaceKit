export const PANEL_UI_TEMPLATE_STYLE_ID = "workspacekit-panel-ui-template-v1";

// Generic visual primitives only.  Workflow/Nodes/Templates styles and the
// WorkspaceKit glass Portal remain outside this file because they own feature
// or host lifecycle behavior rather than reusable panel presentation.
export const PANEL_UI_TEMPLATE_CSS = `
  .workspacekit-ui-root {
    /*
      WorkspaceKit product-theme bridge
      ---------------------------------
      This is the only visual entry point used by family panels. When the
      host exists, its transparent/frosted variables flow into every Provider
      and standalone family shell. Without the host (the Vendor case), each
      token falls back to ComfyUI's public theme variables. Do not re-create
      these mappings in a family plugin: that would create a second design
      source and make standalone/merged appearance drift again.
    */
    --workspacekit-ui-surface: var(--workspace2-surface, var(--comfy-menu-bg, var(--p-content-background, var(--bg-color, #202124))));
    --workspacekit-ui-control: var(--workspace2-control-bg-glass, var(--workspace2-control-bg, var(--comfy-input-bg, var(--p-form-field-background, var(--workspacekit-ui-surface)))));
    --workspacekit-ui-border: var(--workspace2-control-border-glass, var(--workspace2-border, var(--border-color, var(--p-content-border-color, rgba(255,255,255,.14)))));
    --workspacekit-ui-control-shadow: var(--workspace2-control-shadow-glass, none);
    --workspacekit-ui-text: var(--p-text-color, var(--fg-color, #ddd));
    --workspacekit-ui-muted: var(--workspace2-muted, var(--p-text-muted-color, var(--descrip-text, rgba(255,255,255,.62))));
    --workspacekit-ui-accent: var(--workspace2-accent, var(--p-primary-color, var(--accent-color, #0A84FF)));
    --workspacekit-ui-hover: var(--workspace2-hover-glass, var(--workspace2-hover, var(--p-list-option-hover-background, var(--comfy-menu-hover-bg, rgba(255,255,255,.075)))));
    --workspacekit-ui-tab-bg: var(--workspace2-tab-bg, var(--workspacekit-ui-surface));
    --workspacekit-ui-tab-hover: var(--workspace2-tab-hover-bg, var(--workspacekit-ui-hover));
    --workspacekit-ui-tab-active: var(--workspace2-tab-active-bg, color-mix(in srgb, var(--workspacekit-ui-accent) 12%, var(--workspacekit-ui-tab-bg)));
    --workspacekit-ui-radius: var(--workspace2-radius, 8px);
    --workspacekit-ui-radius-sm: var(--workspace2-radius-sm, 6px);
    --workspacekit-ui-control-height: 30px;
    --workspacekit-ui-gap: 8px;
    box-sizing: border-box;
    color: var(--workspacekit-ui-text);
    font: 500 13px/1.2 var(--font-family, Arial, sans-serif);
  }
  .workspacekit-ui-root *, .workspacekit-ui-root *::before, .workspacekit-ui-root *::after { box-sizing: border-box; }
  /* Exact product-header geometry used by Workflows, Nodes, and Templates. */
  .workspacekit-ui-header { min-height:28px; display:flex; align-items:center; justify-content:space-between; flex-wrap:nowrap; gap:8px; }
  .workspacekit-ui-header-title { min-width:0; font-size:14px; font-weight:700; flex:0 0 auto; white-space:nowrap; }
  .workspacekit-ui-header-status { min-width:0; flex:1 1 auto; overflow:hidden; text-align:right; text-overflow:ellipsis; white-space:nowrap; color:var(--workspacekit-ui-muted); opacity:.72; }
  .workspacekit-ui-section { display:grid; gap:6px; min-width:0; }
  .workspacekit-ui-section-head { display:flex; align-items:center; gap:8px; min-height:24px; }
  .workspacekit-ui-section-title { font-size:12px; font-weight:650; color:var(--workspacekit-ui-text); }
  .workspacekit-ui-section-description { color:var(--workspacekit-ui-muted); font-size:11px; line-height:1.35; }
  /* Product control band: same compact rhythm as the built-in search/actions. */
  .workspacekit-ui-control-row { display:grid; grid-template-columns:minmax(90px,1fr) auto; gap:6px; align-items:center; min-height:28px; padding:0; border:0; background:transparent; }
  .workspacekit-ui-control-row-leading { min-width:0; }
  .workspacekit-ui-control-row-trailing { display:flex; align-items:center; gap:6px; min-width:0; }
  .workspacekit-ui-button, .workspacekit-ui-icon-button, .workspacekit-ui-segment, .workspacekit-ui-command {
    appearance:none; min-height:var(--workspacekit-ui-control-height); border:1px solid var(--workspacekit-ui-border); border-radius:var(--workspacekit-ui-radius-sm); color:inherit; background:var(--workspacekit-ui-control); box-shadow:var(--workspacekit-ui-control-shadow); cursor:pointer;
  }
  .workspacekit-ui-button, .workspacekit-ui-icon-button, .workspacekit-ui-segment { display:inline-flex; align-items:center; justify-content:center; }
  .workspacekit-ui-icon-button { width:var(--workspacekit-ui-control-height); min-width:var(--workspacekit-ui-control-height); padding:4px; }
  .workspacekit-ui-button:hover:not(:disabled), .workspacekit-ui-icon-button:hover:not(:disabled), .workspacekit-ui-command:hover:not(:disabled) { background:var(--workspacekit-ui-hover); }
  .workspacekit-ui-button:focus-visible, .workspacekit-ui-icon-button:focus-visible, .workspacekit-ui-segment:focus-visible, .workspacekit-ui-command:focus-visible, .workspacekit-ui-range:focus-visible { outline:2px solid color-mix(in srgb, var(--workspacekit-ui-accent) 72%, transparent); outline-offset:2px; }
  .workspacekit-ui-button:disabled, .workspacekit-ui-icon-button:disabled, .workspacekit-ui-segment:disabled, .workspacekit-ui-command:disabled { opacity:.46; cursor:not-allowed; }
  .workspacekit-ui-segmented { display:inline-flex; min-width:0; gap:6px; }
  .workspacekit-ui-segment { width:30px; min-width:30px; padding:4px; }
  .workspacekit-ui-segment[aria-checked="true"] { color:var(--workspacekit-ui-accent); background:color-mix(in srgb, var(--workspacekit-ui-accent) 14%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--workspacekit-ui-accent) 55%, transparent); }
  .workspacekit-ui-range-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; min-height:28px; padding:4px 7px; border:1px solid var(--workspacekit-ui-border); border-radius:var(--workspacekit-ui-radius); background:var(--workspacekit-ui-control); box-shadow:var(--workspacekit-ui-control-shadow); }
  .workspacekit-ui-range { width:100%; min-width:0; accent-color:var(--workspacekit-ui-accent); cursor:pointer; }
  .workspacekit-ui-range-value { min-width:3ch; color:var(--workspacekit-ui-muted); font-variant-numeric:tabular-nums; text-align:right; }
  .workspacekit-ui-command-grid { display:grid; grid-template-columns:repeat(var(--workspacekit-ui-grid-columns, 6), minmax(0,1fr)); gap:6px; }
  .workspacekit-ui-command { min-width:0; min-height:39px; display:grid; place-items:center; padding:6px; }
  .workspacekit-ui-standalone-shell { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
  .workspacekit-ui-standalone-tabs { display:grid; grid-template-columns:minmax(0,1fr) var(--workspacekit-ui-control-height); gap:7px; padding:9px 10px 7px; border-bottom:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-standalone-tab { position:relative; min-height:var(--workspacekit-ui-control-height); border:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 78%, transparent); border-radius:var(--workspacekit-ui-radius); color:var(--workspacekit-ui-muted); background:var(--workspacekit-ui-tab-bg); font:500 12px/1.2 var(--font-family, Arial, sans-serif); cursor:pointer; transition:background 120ms ease,border-color 120ms ease,color 120ms ease,box-shadow 120ms ease; }
  .workspacekit-ui-standalone-tab:hover { color:var(--workspacekit-ui-text); border-color:color-mix(in srgb, var(--workspacekit-ui-accent) 32%, var(--workspacekit-ui-border)); background:var(--workspacekit-ui-tab-hover); }
  .workspacekit-ui-standalone-tab[aria-current="page"] { color:var(--workspacekit-ui-text); border-color:color-mix(in srgb, var(--workspacekit-ui-accent) 28%, var(--workspacekit-ui-border)); background:var(--workspacekit-ui-tab-active); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--workspacekit-ui-accent) 8%, transparent),0 0 0 1px rgba(0,0,0,.05); }
  .workspacekit-ui-standalone-content { flex:1 1 auto; min-height:0; overflow:auto; padding:10px; display:grid; align-content:start; gap:10px; }
  .workspacekit-ui-panel-blueprint { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
  .workspacekit-ui-panel-header-slot { flex:0 0 auto; padding:10px 10px 0; }
  .workspacekit-ui-panel-toolbar-slot { flex:0 0 auto; padding:8px 10px 0; }
  .workspacekit-ui-panel-controls-slot { flex:0 0 auto; padding:8px 10px 0; }
  .workspacekit-ui-panel-content-slot { flex:1 1 auto; min-height:0; overflow:auto; padding:10px; }
  .workspacekit-ui-product-header-slot { padding:10px 10px 0; }
  .workspacekit-ui-product-controls-slot { padding:8px 10px; border-bottom:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-product-content-slot { padding:8px 10px 10px; }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-header-slot { padding:10px 10px 0; }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-controls-slot { padding:8px 10px; border-bottom:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-content-slot { padding:8px 10px 10px; }
  .workspacekit-ui-panel-header-slot[hidden], .workspacekit-ui-panel-toolbar-slot[hidden], .workspacekit-ui-panel-controls-slot[hidden] { display:none; }
  .workspacekit-ui-slot-stack { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
  .workspacekit-ui-host-header { flex:0 0 auto; padding:10px 10px 0; }
  .workspacekit-ui-host-context { flex:0 0 auto; padding:0 10px; }
  .workspacekit-ui-host-content { flex:1 1 auto; min-height:0; overflow:auto; padding:0 10px 10px; }
  @media (prefers-reduced-motion: reduce) { .workspacekit-ui-root *, .workspacekit-ui-root *::before, .workspacekit-ui-root *::after { transition-duration:0s !important; animation-duration:0s !important; } }
`;

export function installPanelUiTemplateStyles(document = globalThis.document) {
  if (!document?.createElement || !document?.head) return false;
  if (document.getElementById?.(PANEL_UI_TEMPLATE_STYLE_ID)) return true;
  const style = document.createElement("style");
  style.id = PANEL_UI_TEMPLATE_STYLE_ID;
  style.textContent = PANEL_UI_TEMPLATE_CSS;
  document.head.append(style);
  return true;
}
