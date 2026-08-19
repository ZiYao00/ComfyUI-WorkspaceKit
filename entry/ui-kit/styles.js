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
    /* Shared panel geometry. Hosted products receive matching Host tokens;
       standalone/future providers consume these defaults without copying the
       old 10px measurements into their own styles. */
    --workspacekit-ui-panel-inline-padding: 15px;
    --workspacekit-ui-panel-section-gap: 12px;
    --workspacekit-ui-panel-content-bottom-padding: 16px;
    /* Public type scale: compact panel chrome deliberately remains denser
       than document UI, while all family modules share the same names. */
    --workspacekit-ui-font-meta: 10px;
    --workspacekit-ui-font-compact: 11px;
    --workspacekit-ui-font-control: 12px;
    --workspacekit-ui-font-body: 13px;
    --workspacekit-ui-font-title: 14px;
    --workspacekit-ui-weight-regular: 400;
    --workspacekit-ui-weight-medium: 500;
    --workspacekit-ui-weight-semibold: 600;
    --workspacekit-ui-weight-bold: 700;
    box-sizing: border-box;
    color: var(--workspacekit-ui-text);
    font: var(--workspacekit-ui-weight-medium) var(--workspacekit-ui-font-body)/1.2 var(--font-family, Arial, sans-serif);
  }
  .workspacekit-ui-root *, .workspacekit-ui-root *::before, .workspacekit-ui-root *::after { box-sizing: border-box; }
  /* Exact product-header geometry used by Workflows, Nodes, and Templates. */
  .workspacekit-ui-header { min-height:28px; display:flex; align-items:center; justify-content:space-between; flex-wrap:nowrap; gap:8px; }
  .workspacekit-ui-header-title { min-width:0; font-size:var(--workspacekit-ui-font-title); font-weight:var(--workspacekit-ui-weight-bold); flex:0 0 auto; white-space:nowrap; }
  .workspacekit-ui-header-status { min-width:0; flex:1 1 auto; overflow:hidden; text-align:right; text-overflow:ellipsis; white-space:nowrap; color:var(--workspacekit-ui-muted); opacity:.72; }
  .workspacekit-ui-section { display:grid; gap:6px; min-width:0; }
  .workspacekit-ui-section-head { display:flex; align-items:center; gap:8px; min-height:24px; }
  .workspacekit-ui-section-title { font-size:var(--workspacekit-ui-font-control); font-weight:var(--workspacekit-ui-weight-semibold); color:var(--workspacekit-ui-text); }
  .workspacekit-ui-section-description { color:var(--workspacekit-ui-muted); font-size:var(--workspacekit-ui-font-compact); line-height:1.35; }
  .workspacekit-ui-disclosure { margin:0; border:0; border-radius:var(--workspacekit-ui-radius); background:color-mix(in srgb, var(--workspacekit-ui-control) 68%, transparent); }
  .workspacekit-ui-disclosure-summary { cursor:pointer; list-style:none; padding:7px 8px; border-radius:var(--workspacekit-ui-radius); }
  .workspacekit-ui-disclosure-summary::-webkit-details-marker { display:none; }
  .workspacekit-ui-disclosure-summary::before { content:"›"; width:10px; color:var(--workspacekit-ui-muted); font-size:16px; line-height:1; transition:transform 120ms ease; }
  .workspacekit-ui-disclosure[open] > .workspacekit-ui-disclosure-summary::before { transform:rotate(90deg); }
  .workspacekit-ui-disclosure-actions { display:inline-flex; align-items:center; gap:6px; margin-left:auto; }
  .workspacekit-ui-disclosure > .workspacekit-ui-section-description, .workspacekit-ui-disclosure-body { padding:0 8px 8px 26px; }
  .workspacekit-ui-disclosure-body { min-width:0; }
  .workspacekit-ui-compact-action-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:var(--workspacekit-ui-control-height); padding:4px 6px; border:1px solid var(--workspacekit-ui-border); border-radius:var(--workspacekit-ui-radius); background:var(--workspacekit-ui-control); box-shadow:var(--workspacekit-ui-control-shadow); }
  .workspacekit-ui-compact-action-bar-leading, .workspacekit-ui-compact-action-bar-trailing { display:flex; align-items:center; gap:6px; min-width:0; }
  .workspacekit-ui-compact-action-bar-trailing { margin-left:auto; }
  .workspacekit-ui-dropzone { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:3px 8px; width:100%; min-height:72px; padding:10px; border:1px dashed color-mix(in srgb, var(--workspacekit-ui-border) 84%, var(--workspacekit-ui-accent)); border-radius:var(--workspacekit-ui-radius); color:var(--workspacekit-ui-text); background:color-mix(in srgb, var(--workspacekit-ui-control) 64%, transparent); font:inherit; text-align:left; cursor:pointer; }
  .workspacekit-ui-dropzone:hover, .workspacekit-ui-dropzone:focus-visible { border-color:var(--workspacekit-ui-accent); background:color-mix(in srgb, var(--workspacekit-ui-accent) 8%, var(--workspacekit-ui-control)); }
  .workspacekit-ui-dropzone-label { font-weight:650; }
  .workspacekit-ui-dropzone-description { color:var(--workspacekit-ui-muted); font-size:11px; }
  .workspacekit-ui-dropzone-content { grid-column:1 / -1; min-width:0; }
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
  .workspacekit-ui-standalone-tab { position:relative; min-height:var(--workspacekit-ui-control-height); border:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 78%, transparent); border-radius:var(--workspacekit-ui-radius); color:var(--workspacekit-ui-muted); background:var(--workspacekit-ui-tab-bg); font:var(--workspacekit-ui-weight-medium) var(--workspacekit-ui-font-control)/1.2 var(--font-family, Arial, sans-serif); cursor:pointer; transition:background 120ms ease,border-color 120ms ease,color 120ms ease,box-shadow 120ms ease; }
  .workspacekit-ui-standalone-tab:hover { color:var(--workspacekit-ui-text); border-color:color-mix(in srgb, var(--workspacekit-ui-accent) 32%, var(--workspacekit-ui-border)); background:var(--workspacekit-ui-tab-hover); }
  .workspacekit-ui-standalone-tab[aria-current="page"] { color:var(--workspacekit-ui-text); border-color:color-mix(in srgb, var(--workspacekit-ui-accent) 28%, var(--workspacekit-ui-border)); background:var(--workspacekit-ui-tab-active); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--workspacekit-ui-accent) 8%, transparent),0 0 0 1px rgba(0,0,0,.05); }
  .workspacekit-ui-standalone-content { flex:1 1 auto; min-height:0; overflow:auto; padding:10px; display:grid; align-content:start; gap:10px; }
  .workspacekit-ui-panel-blueprint { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
  .workspacekit-ui-panel-header-slot { flex:0 0 auto; padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) 0; }
  .workspacekit-ui-panel-toolbar-slot { flex:0 0 auto; padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) 0; }
  .workspacekit-ui-panel-controls-slot { flex:0 0 auto; padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) 0; }
  .workspacekit-ui-panel-content-slot { flex:1 1 auto; min-height:0; overflow:auto; padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) var(--workspacekit-ui-panel-content-bottom-padding); }
  /* The Host may expose this optional fifth Slot below scrolling content.
     Providers that do not use status simply keep it hidden. */
  .workspacekit-ui-panel-status-slot { flex:0 0 auto; min-width:0; padding:8px var(--workspacekit-ui-panel-inline-padding) 10px; border-top:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-panel-status { min-width:0; overflow:hidden; color:var(--workspacekit-ui-muted); font:var(--workspacekit-ui-weight-medium) var(--workspacekit-ui-font-compact)/1.35 var(--font-family, Arial, sans-serif); text-overflow:ellipsis; white-space:nowrap; }
  .workspacekit-ui-panel-status.is-success { color:color-mix(in srgb, var(--workspacekit-ui-accent) 78%, var(--workspacekit-ui-muted)); }
  .workspacekit-ui-panel-status.is-warning { color:var(--p-orange-400, #f0a34b); }
  .workspacekit-ui-panel-status.is-error { color:var(--p-red-400, #f18484); }
  .workspacekit-ui-product-header-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) 0; }
  .workspacekit-ui-product-controls-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding); border-bottom:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-product-content-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) var(--workspacekit-ui-panel-content-bottom-padding); }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-header-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) 0; }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-controls-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding); border-bottom:1px solid color-mix(in srgb, var(--workspacekit-ui-border) 62%, transparent); }
  .workspacekit-ui-product-panel .workspacekit-ui-panel-content-slot { padding:var(--workspacekit-ui-panel-section-gap) var(--workspacekit-ui-panel-inline-padding) var(--workspacekit-ui-panel-content-bottom-padding); }
  .workspacekit-ui-panel-header-slot[hidden], .workspacekit-ui-panel-toolbar-slot[hidden], .workspacekit-ui-panel-controls-slot[hidden], .workspacekit-ui-panel-status-slot[hidden] { display:none; }
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
