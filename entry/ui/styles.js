// WorkspaceKit injected stylesheet. Owns the single ~2200-line CSS-in-JS
// template that styles the sidebar host, panels, dialogs, and controls.
// Pure presentation: no interpolation, no feature state, no DOM behavior
// beyond appending one <style id="workspace2-styles"> to <head> (idempotent).
// Called by the panel renderers in entry.js.

export function styles() {
  if (document.getElementById("workspace2-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "workspace2-styles";
  style.textContent = `
    .workspace2-host {
      --workspace2-panel-alpha: 100%;
      --workspace2-panel-blur: 0px;
      --workspace2-panel-saturate: 1;
      --workspace2-panel-brightness: 1;
      --workspace2-shell-surface: var(--comfy-menu-bg, var(--bg-color, var(--p-content-background, #202124)));
      background: transparent !important;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-host.is-workspace2-surface-hidden {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }
    .workspace2-sidebar-transparent-root {
      background: transparent !important;
    }
    .workspace2-panel {
      --workspace2-tree-font: 12px;
      --workspace2-folder-font: 12px;
      --workspace2-node-font: 11px;
      --workspace2-meta-font: 10px;
      --workspace2-row-height: 28px;
      --workspace2-node-row-height: var(--workspace2-row-height);
      --workspace2-node-row-padding-y: 2px;
      --workspace2-node-list-gap: 2px;
      --workspace2-radius: var(--p-border-radius, 6px);
      --workspace2-radius-sm: calc(var(--workspace2-radius) - 1px);
      --workspace2-surface: var(--comfy-menu-bg, var(--bg-color, var(--p-content-background, #202124)));
      --workspace2-control-bg: var(--comfy-input-bg, var(--p-form-field-background, #111));
      --workspace2-border: var(--border-color, var(--p-content-border-color, rgba(255, 255, 255, 0.14)));
      --workspace2-muted: var(--descrip-text, var(--p-text-muted-color, rgba(255, 255, 255, 0.55)));
      --workspace2-hover: var(--comfy-menu-hover-bg, var(--content-hover-bg, var(--p-list-option-hover-background, rgba(255, 255, 255, 0.075))));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      --workspace2-accent-muted: color-mix(in srgb, var(--workspace2-accent) 58%, var(--workspace2-tab-bg, var(--workspace2-surface)));
      --workspace2-section-disclosure-color: color-mix(in srgb, var(--workspace2-accent) 46%, var(--workspace2-muted));
      --workspace2-section-disclosure-hover-color: color-mix(in srgb, var(--workspace2-accent) 66%, var(--workspace2-muted));
      --workspace2-accent-soft: color-mix(in srgb, var(--workspace2-accent) 10%, transparent);
      --workspace2-accent-mid: color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
      --workspace2-accent-strong: color-mix(in srgb, var(--workspace2-accent) 30%, transparent);
      --workspace2-accent-border: color-mix(in srgb, var(--workspace2-accent) 42%, transparent);
      /* Hue marking the active workflow and the folders leading to it.
         A fixed amber rather than a tint of the panel's own foreground: a
         grey wash lands in the same neutral family as :hover and as the
         theme's own row shading, so it reads as "slightly lighter row"
         instead of as a mark. Amber is also opposite the blue accent that
         :hover and .is-selected both use, so the two marks stay tellable
         apart when they land on the same row. Mid-luminance, so it survives
         both light and dark themes without being flipped per theme. */
      --workspace2-active-trail: var(--p-amber-400, #FBBF24);
      /* Kept translucent so the transparent and frosted panel backgrounds still
         show through. The file wash is deliberately ~2.4x the folder wash: the
         gradient is what tells the eye which end of the trail is the leaf. */
      --workspace2-active-trail-mid: color-mix(in srgb, var(--workspace2-active-trail) 26%, transparent);
      --workspace2-active-trail-soft: color-mix(in srgb, var(--workspace2-active-trail) 11%, transparent);
      --workspace2-danger: #FF453A;
      --workspace2-danger-soft: rgba(255, 69, 58, 0.10);
      --workspace2-danger-mid: rgba(255, 69, 58, 0.22);
      --workspace2-danger-border: rgba(255, 69, 58, 0.58);
      --workspace2-info: var(--p-blue-400, #60A5FA);
      --workspace2-info-soft: color-mix(in srgb, var(--workspace2-info) 12%, transparent);
      --workspace2-info-mid: color-mix(in srgb, var(--workspace2-info) 22%, transparent);
      --workspace2-info-border: color-mix(in srgb, var(--workspace2-info) 58%, transparent);
      --workspace2-tab-bg: var(--comfy-menu-secondary-bg, var(--comfy-menu-bg, var(--content-bg, var(--p-tabs-tab-background, #202124))));
      --workspace2-tab-hover-bg: var(--comfy-menu-hover-bg, var(--content-hover-bg, color-mix(in srgb, var(--workspace2-accent) 10%, var(--workspace2-tab-bg))));
      --workspace2-tab-active-bg: color-mix(in srgb, var(--contrast-mix-color, var(--workspace2-accent)) 24%, var(--workspace2-tab-bg));
      --workspace2-panel-alpha: 100%;
      --workspace2-panel-blur: 0px;
      --workspace2-panel-saturate: 1;
      box-sizing: border-box;
      height: 100%;
      max-height: 100%;
      min-height: 320px;
      padding: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: transparent;
      font: 12px/1.35 var(--font-family, Arial, sans-serif);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 8px;
      user-select: none;
      min-height: 0;
    }
    .workspace2-panel.font-medium {
      --workspace2-tree-font: 13px;
      --workspace2-folder-font: 13px;
      --workspace2-node-font: 12px;
      --workspace2-meta-font: 10.5px;
      --workspace2-row-height: 31px;
    }
    .workspace2-panel.font-large {
      --workspace2-tree-font: 14px;
      --workspace2-folder-font: 14px;
      --workspace2-node-font: 13px;
      --workspace2-meta-font: 11px;
      --workspace2-row-height: 34px;
    }
    .workspace2-panel.node-spacing-medium {
      --workspace2-node-row-height: calc(var(--workspace2-row-height) + 4px);
      --workspace2-node-row-padding-y: 4px;
      --workspace2-node-list-gap: 4px;
    }
    .workspace2-panel.node-spacing-large {
      --workspace2-node-row-height: calc(var(--workspace2-row-height) + 8px);
      --workspace2-node-row-padding-y: 5px;
      --workspace2-node-list-gap: 6px;
    }
    .workspace2-panel * { box-sizing: border-box; }
    .workspace2-shell {
      --workspace2-border: var(--border-color, var(--p-content-border-color, rgba(255, 255, 255, 0.14)));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      --workspace2-accent-muted: color-mix(in srgb, var(--workspace2-accent) 58%, var(--workspace2-tab-bg));
      --workspace2-tab-bg: var(--workspace2-tab-bg-glass, var(--comfy-menu-secondary-bg, var(--comfy-menu-bg, var(--content-bg, var(--p-tabs-tab-background, #202124)))));
      --workspace2-tab-hover-bg: var(--comfy-menu-hover-bg, var(--content-hover-bg, color-mix(in srgb, var(--workspace2-accent) 10%, var(--workspace2-tab-bg))));
      --workspace2-tab-active-bg: color-mix(in srgb, var(--workspace2-accent) 12%, var(--workspace2-tab-bg));
      --workspace2-panel-fill: transparent;
      --workspace2-panel-mist: transparent;
      --workspace2-panel-stroke: rgba(255, 255, 255, 0);
      --workspace2-panel-cool-sheen: transparent;
      --workspace2-panel-top-sheen: transparent;
      --workspace2-panel-shade: transparent;
      position: relative;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: transparent;
      border-radius: 12px;
    }
    .workspace2-shell::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(115% 70% at 12% -12%, var(--workspace2-panel-top-sheen), transparent 72%),
        radial-gradient(92% 64% at 100% 100%, var(--workspace2-panel-cool-sheen), transparent 62%),
        linear-gradient(145deg, var(--workspace2-glass-highlight, transparent), transparent 58%),
        linear-gradient(180deg, var(--workspace2-panel-mist), transparent 68%),
        linear-gradient(180deg, transparent 50%, var(--workspace2-panel-shade) 100%),
        var(--workspace2-panel-fill);
      border: 1px solid var(--workspace2-panel-stroke);
      border-radius: inherit;
      backdrop-filter:
        blur(var(--workspace2-panel-blur))
        saturate(var(--workspace2-panel-saturate))
        brightness(var(--workspace2-panel-brightness));
      -webkit-backdrop-filter:
        blur(var(--workspace2-panel-blur))
        saturate(var(--workspace2-panel-saturate))
        brightness(var(--workspace2-panel-brightness));
    }
    .workspace2-shell.is-glass-background::before {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.18),
        inset 1px 0 0 rgba(255, 255, 255, 0.08),
        inset -1px 0 0 rgba(255, 255, 255, 0.06),
        0 12px 36px rgba(0, 0, 0, 0.14);
    }
    .workspace2-shell.workspace2-glass-overlay {
      position: fixed;
      z-index: 1100;
      max-height: none;
      border-radius: 12px;
      overflow: hidden;
    }
    .workspace2-shell.workspace2-glass-overlay.is-workspace2-overlay-hidden {
      visibility: hidden;
      pointer-events: none;
    }
    .workspace2-module-tabs {
      position: relative;
      z-index: 2;
      flex: 0 0 auto;
      display: flex;
      align-items: stretch;
      flex-wrap: nowrap;
      gap: 7px;
      padding: 9px 10px 7px;
      border-bottom: 1px solid color-mix(in srgb, var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14))) 62%, transparent);
      background: transparent;
      overflow: visible;
      container: workspace2-tabstrip / inline-size;
    }
    .workspace2-module-tab {
      position: relative;
      flex: 1 1 0;
      /* 3em covers three CJK glyphs at the 12px tab font; the padding is added
         on top so the third glyph is never the one that gets ellipsised. */
      min-width: calc(3em + 16px);
      max-width: 14em;
      min-height: 30px;
      padding: 0 8px;
      border: 1px solid color-mix(in srgb, var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14))) 78%, transparent);
      border-radius: 8px;
      color: var(--p-text-muted-color, rgba(255, 255, 255, 0.68));
      background: var(--workspace2-tab-bg);
      font: 500 12px/1.2 var(--font-family, Arial, sans-serif);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
    }
    /* Below roughly 280px of sidebar the 3-glyph budget no longer fits together
       with the settings button, so the floor drops to two glyphs. The settings
       button must never be pushed out of the row. */
    @container workspace2-tabstrip (max-width: 300px) {
      .workspace2-module-tab { min-width: calc(2em + 12px); }
      /* width:0 releases the wrapper from its content's min-content floor so it
         shrinks with the plain tabs instead of pinning the settings button out
         of the row. */
      .workspace2-module-overflow-tab { width: 0; min-width: calc(2em + 12px + 20px); }
      .workspace2-module-overflow-tab > .workspace2-module-tab { min-width: 0; }
    }
    .workspace2-module-tab:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-tab-hover-bg);
      border-color: color-mix(in srgb, var(--p-primary-color, var(--accent-color, #0A84FF)) 32%, var(--workspace2-border, rgba(255,255,255,.14)));
    }
    .workspace2-module-tab.is-active {
      color: var(--p-text-color, var(--fg-color, #f5f8ff));
      border-color: color-mix(in srgb, var(--workspace2-accent) 28%, var(--workspace2-border));
      background: var(--workspace2-tab-active-bg);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 8%, transparent), 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .workspace2-module-tab.is-active::after {
      content: "";
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 4px;
      height: 2px;
      border-radius: 2px;
      background: var(--workspace2-accent-muted);
    }
    .workspace2-module-settings {
      min-width: 30px;
      min-height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14)));
      border-radius: var(--p-border-radius, 6px);
      color: var(--p-text-muted-color, rgba(255, 255, 255, 0.62));
      background: transparent;
      cursor: pointer;
    }
    .workspace2-module-settings:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.075));
    }
    .workspace2-module-settings svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
    }
    /* The label keeps a plain tab's 3-CJK-glyph budget; the divider and larger
       caret add a fixed ~28px on top. Anything larger and this tab would claim a
       bigger flex share than its neighbours and push the settings button out. */
    .workspace2-module-overflow-tab { position:relative; flex: 1 1 0; min-width: calc(3em + 16px + 28px); max-width: 14em; min-height:30px; display:flex; align-items:stretch; gap:0; padding-right:2px; border:1px solid color-mix(in srgb, var(--p-content-border-color, var(--border-color, rgba(255,255,255,.14))) 78%, transparent); border-radius:8px; background:var(--workspace2-tab-bg); transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease; }
    .workspace2-module-overflow-tab:hover { background: var(--workspace2-tab-hover-bg); border-color: color-mix(in srgb, var(--p-primary-color, var(--accent-color, #0A84FF)) 32%, var(--workspace2-border, rgba(255,255,255,.14))); }
    .workspace2-module-overflow-tab.is-menu-open { border-color: color-mix(in srgb, var(--workspace2-accent) 42%, var(--workspace2-border)); }
    /* The tab button inside the wrapper drops its own chrome: the wrapper draws
       the border and background so the label and caret read as one control.
       min-height is released to the wrapper too, otherwise the button's own
       30px plus the wrapper's border would make this tab a pixel taller than
       the plain ones. */
    .workspace2-module-overflow-tab > .workspace2-module-tab { flex: 1 1 0; min-width: 0; min-height: 0; border:0; border-radius:7px 0 0 7px; background:transparent; box-shadow:none; text-align:center; }
    .workspace2-module-overflow-tab > .workspace2-module-tab:hover { background:transparent; border-color:transparent; }
    .workspace2-module-overflow-tab > .workspace2-module-tab.is-active { background:var(--workspace2-tab-active-bg); box-shadow:none; }
    .workspace2-module-overflow-tab > .workspace2-module-tab.is-active::after { left:8px; right:8px; }
    .workspace2-module-tab-label { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; }
    .workspace2-module-tab-divider { flex:0 0 1px; align-self:center; width:1px; height:14px; margin:0 3px; background: color-mix(in srgb, currentColor 24%, transparent); }
    .workspace2-module-overflow-caret { flex:0 0 20px; display:inline-flex; align-items:center; justify-content:center; min-width:20px; padding:0; background:transparent; border:0; border-radius:4px; color:var(--p-text-muted-color, rgba(255,255,255,.68)); font-size:13px; line-height:1; cursor:pointer; transition:transform 120ms ease, background 120ms ease, color 120ms ease; transform-origin:center; }
    .workspace2-module-overflow-caret:hover { color: var(--p-text-color, var(--fg-color, #ddd)); background: color-mix(in srgb, var(--p-primary-color, var(--accent-color, #0A84FF)) 24%, transparent); }
    .workspace2-module-overflow-tab.is-menu-open > .workspace2-module-overflow-caret { transform:rotate(180deg); color: var(--workspace2-accent); }
    /* The dropdown reuses .workspace2-context (shared with the sort/row menus),
       so it inherits that primitive's fixed positioning and z-index above the
       frosted-glass shell. Only the row layout is specific to this menu.
       It is appended to <body>, outside .workspace2-shell, so the accent token
       is redeclared here — shell-scoped custom properties do not reach it. */
    .workspace2-module-overflow-context {
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      max-width: min(300px, calc(100vw - 24px));
    }
    .workspace2-module-overflow-open { width:100%; min-width:0; display:flex; align-items:center; gap:7px; overflow:hidden; text-align:left; white-space:nowrap; font:500 12px/1.2 var(--font-family,Arial,sans-serif); }
    .workspace2-module-overflow-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .workspace2-module-overflow-current-marker { flex:0 0 auto; color:var(--workspace2-accent); font-size:13px; line-height:1; }
    .workspace2-module-overflow-open.is-current { color:var(--workspace2-accent); background:color-mix(in srgb, var(--workspace2-accent) 13%, transparent); }
    .workspace2-module-frame {
      position: relative;
      z-index: 1;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .workspace2-module-header-host[hidden],
    .workspace2-module-context-host[hidden] {
      display: none;
    }
    .workspace2-module-body {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .workspace2-settings-backdrop {
      --workspace2-surface: var(--comfy-menu-bg, var(--p-content-background, var(--bg-color, #202124)));
      --workspace2-control-bg: var(--comfy-input-bg, var(--p-form-field-background, var(--workspace2-surface)));
      --workspace2-border: var(--border-color, var(--p-content-border-color, color-mix(in srgb, currentColor 18%, transparent)));
      --workspace2-muted: var(--descrip-text, var(--p-text-muted-color, color-mix(in srgb, currentColor 62%, transparent)));
      --workspace2-hover: var(--comfy-menu-hover-bg, var(--content-hover-bg, var(--p-list-option-hover-background, color-mix(in srgb, currentColor 7%, transparent))));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      position: fixed;
      inset: 0;
      z-index: 100002;
      background: rgba(0, 0, 0, 0.10);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 8vh 16px 16px;
    }
    .workspace2-settings-dialog {
      width: min(880px, calc(100vw - 32px));
      height: min(720px, calc(100vh - 64px));
      max-height: min(720px, calc(100vh - 64px));
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-surface);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
      padding: 12px;
    }
    .workspace2-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 34px;
      margin-bottom: 12px;
    }
    .workspace2-settings-title {
      font: 600 16px/1.3 var(--font-family, Arial, sans-serif);
    }
    .workspace2-settings-layout {
      min-height: 0;
      flex: 1 1 auto;
      overflow: hidden;
      display: grid;
      grid-template-columns: 176px minmax(0, 1fr);
      border-top: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
    }
    .workspace2-settings-nav {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 14px 16px 0;
      border-right: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
    }
    .workspace2-settings-nav-divider {
      height: 1px;
      margin: 2px 4px;
      background: color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
    }
    .workspace2-settings-nav-button {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--workspace2-muted, rgba(255,255,255,.62));
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: 600 13px/1 var(--font-family, Arial, sans-serif);
    }
    .workspace2-settings-nav-icon {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: .85;
    }
    .workspace2-settings-nav-label {
      flex: 1 1 auto;
      min-width: 0;
    }
    .workspace2-settings-nav-button:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-list-option-hover-background, rgba(255,255,255,.08));
    }
    .workspace2-settings-nav-button.is-active {
      color: var(--p-text-color, var(--fg-color, #ddd));
      border-color: color-mix(in srgb, var(--workspace2-accent, #6aa6ff) 22%, transparent);
      background: linear-gradient(90deg, color-mix(in srgb, var(--workspace2-accent, #6aa6ff) 10%, transparent), transparent);
      box-shadow: inset 2px 0 0 var(--workspace2-accent, #6aa6ff);
    }
    .workspace2-settings-pages {
      min-width: 0;
      min-height: 0;
      max-height: none;
      overflow: auto;
      padding: 4px 20px 24px;
    }
    .workspace2-settings-page[hidden] {
      display: none;
    }
    .workspace2-settings-page {
      width: min(640px, 100%);
      margin: 0 auto;
    }
    .workspace2-settings-section {
      border-top: 0;
      padding: 18px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 58%, transparent);
    }
    .workspace2-settings-section:last-child { border-bottom: 0; }
    .workspace2-settings-section-title {
      color: var(--p-text-color, var(--fg-color, #ddd));
      font: 600 12px/1.35 var(--font-family, Arial, sans-serif);
      margin-bottom: 12px;
    }
    .workspace2-settings-row {
      min-height: 36px;
      display: grid;
      grid-template-columns: minmax(170px, 1fr) minmax(230px, 260px);
      align-items: center;
      gap: 18px;
      padding: 5px 0;
      font-size: 13px;
    }
    .workspace2-settings-row.is-disabled {
      opacity: 0.52;
    }
    .workspace2-settings-action-row {
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 5px 0;
    }
    .workspace2-settings-action-row .workspace2-settings-help {
      flex: 1 1 auto;
      margin: 0;
    }
    .workspace2-settings-action-buttons {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .workspace2-settings-action {
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 11px;
      border: 1px solid var(--p-button-secondary-border-color, var(--workspace2-border, rgba(255,255,255,.18)));
      border-radius: 6px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-button-secondary-background, rgba(255,255,255,.055));
      cursor: pointer;
      font: 600 12px/1 var(--font-family, Arial, sans-serif);
    }
    .workspace2-settings-action:hover {
      background: var(--p-list-option-hover-background, rgba(255,255,255,.10));
    }
    .workspace2-settings-action:disabled,
    .workspace2-settings-action.is-disabled {
      opacity: .52;
      cursor: not-allowed;
    }
    .workspace2-settings-action.is-busy {
      cursor: progress;
    }
    .workspace2-settings-action svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
    }
    .workspace2-settings-action--warning {
      color: var(--p-orange-300, #f5bd72);
      border-color: color-mix(in srgb, currentColor 44%, transparent);
      background: color-mix(in srgb, currentColor 9%, transparent);
    }
    .workspace2-settings-action--danger {
      color: var(--p-red-300, #ff9a9a);
      border-color: color-mix(in srgb, currentColor 46%, transparent);
      background: color-mix(in srgb, currentColor 10%, transparent);
    }
    .workspace2-settings-mode-row.is-disabled {
      opacity: 1;
    }
    .workspace2-settings-mode-row.is-disabled .workspace2-settings-range {
      opacity: 0.42;
    }
    .workspace2-settings-mode-choice {
      min-width: 0;
      flex: 1 1 auto;
      font-weight: 500;
    }
    .workspace2-settings-mode-choice input {
      accent-color: var(--workspace2-accent);
    }
    .workspace2-settings-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .workspace2-settings-row > label:only-child { justify-self: start; }
    .workspace2-settings-row > select {
      width: 260px;
      min-height: 32px;
      justify-self: end;
      padding: 0 9px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-inputtext-background, var(--comfy-input-bg, rgba(0,0,0,.18)));
      border: 1px solid var(--p-inputtext-border-color, var(--workspace2-border, rgba(255,255,255,.18)));
      border-radius: 5px;
      font: 500 13px/1.2 var(--font-family, Arial, sans-serif);
    }
    .workspace2-settings-range {
      width: 260px;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 36px;
      align-items: center;
      gap: 8px;
      cursor: default !important;
    }
    .workspace2-settings-range input {
      min-width: 0;
      width: 100%;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-settings-range span {
      color: var(--workspace2-muted);
      text-align: right;
      font-size: 12px;
    }
    .workspace2-settings-help {
      color: var(--workspace2-muted, rgba(255,255,255,.55));
      max-width: 580px;
      font-size: 12px;
      line-height: 1.45;
      margin: 2px 0 12px;
    }
    .workspace2-settings-shortcut-grid {
      display: grid;
      grid-auto-flow: column;
      grid-template-rows: repeat(4, auto);
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      margin: 4px 0 14px;
    }
    .workspace2-settings-shortcut-item {
      display: grid;
      grid-template-columns: 78px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      min-width: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    .workspace2-settings-shortcut-key,
    .workspace2-settings-shortcut-label {
      color: var(--workspace2-muted, var(--descrip-text, #aaa));
      font-weight: 400;
    }
    .workspace2-settings-shortcut-key { white-space: nowrap; }
    .workspace2-settings-shortcut-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 640px) {
      .workspace2-settings-dialog {
        width: min(520px, calc(100vw - 24px));
        height: min(640px, calc(100vh - 24px));
      }
      .workspace2-settings-layout {
        grid-template-columns: minmax(0, 1fr);
      }
      .workspace2-settings-nav {
        flex-direction: row;
        overflow-x: auto;
        padding: 8px 0;
        border-right: 0;
        border-bottom: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
      }
      .workspace2-settings-nav-button {
        flex: 0 0 auto;
      }
      .workspace2-settings-pages {
        max-height: min(590px, calc(100vh - 162px));
        padding: 0 4px 20px;
      }
      .workspace2-settings-row {
        grid-template-columns: minmax(0, 1fr) minmax(180px, 230px);
        gap: 12px;
      }
      .workspace2-settings-action-row {
        align-items: flex-start;
        flex-direction: column;
        gap: 10px;
      }
      .workspace2-settings-action-buttons {
        width: 100%;
        justify-content: flex-start;
      }
      .workspace2-settings-range,
      .workspace2-settings-row > select {
        width: 230px;
      }
      .workspace2-settings-shortcut-grid {
        grid-template-columns: 1fr;
        grid-auto-flow: row;
        grid-template-rows: none;
      }
    }
    .workspace2-confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100010;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 0, 0, 0.34);
    }
    .workspace2-confirm-dialog {
      width: min(360px, calc(100vw - 36px));
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 12px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-content-background, var(--comfy-menu-bg, #202124));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.44);
      padding: 14px;
    }
    .workspace2-confirm-title {
      font: 650 14px/1.35 var(--font-family, Arial, sans-serif);
      margin-bottom: 7px;
    }
    .workspace2-confirm-message {
      color: var(--p-text-muted-color, var(--workspace2-muted, rgba(255,255,255,.62)));
      font: 12px/1.55 var(--font-family, Arial, sans-serif);
      word-break: break-word;
      margin-bottom: 14px;
    }
    .workspace2-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .workspace2-confirm-button {
      min-height: 28px;
      padding: 0 12px;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 8px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-content-background, rgba(255, 255, 255, 0.05));
      cursor: pointer;
      font: 12px/1 var(--font-family, Arial, sans-serif);
    }
    .workspace2-confirm-button:hover {
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.08));
    }
    .workspace2-confirm-button.is-danger {
      border-color: color-mix(in srgb, var(--p-red-500, #ff453a) 58%, transparent);
      color: #fff;
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 76%, #000);
    }
    .workspace2-confirm-button.is-danger:hover {
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 88%, #000);
    }
    .workspace2-inline-confirm {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      min-width: max-content;
    }
    .workspace2-inline-confirm-button {
      min-height: 24px;
      padding: 0 8px;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 7px;
      color: var(--p-text-muted-color, var(--workspace2-muted, rgba(255,255,255,.62)));
      background: color-mix(in srgb, var(--p-content-background, #202124) 88%, white);
      cursor: pointer;
      font: 12px/1 var(--font-family, Arial, sans-serif);
      white-space: nowrap;
    }
    .workspace2-inline-confirm-button:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.08));
    }
    .workspace2-inline-confirm-button.is-danger {
      border-color: color-mix(in srgb, var(--p-red-500, #ff453a) 55%, transparent);
      color: #fff;
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 74%, #000);
    }
    .workspace2-inline-confirm-button.is-danger:hover {
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 88%, #000);
    }
    .workspace2-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 8px;
      min-height: 28px;
    }
    .workspace2-title {
      font-size: 14px;
      font-weight: 700;
      flex: 0 0 auto;
      white-space: nowrap;
    }
    .workspace2-status {
      min-width: 0;
      flex: 1 1 auto;
      opacity: 0.72;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-toolbar {
      display: grid;
      grid-template-columns: minmax(90px, 1fr) repeat(var(--workspace2-toolbar-actions, 6), 30px);
      gap: 6px;
      align-items: center;
    }
    .workspace2-search-wrap {
      position: relative;
      min-width: 0;
    }
    .workspace2-top {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--workspace2-border) 62%, transparent);
      background: transparent;
      z-index: 20;
    }
    .workspace2-node-top {
      padding-bottom: 6px;
      border-bottom: 0;
    }
    .workspace2-input,
    .workspace2-button {
      min-height: 28px;
      border: 1px solid var(--workspace2-control-border-glass, var(--workspace2-border));
      border-radius: var(--workspace2-radius);
      color: inherit;
      background: var(--workspace2-control-bg-glass, var(--workspace2-control-bg));
      box-shadow: var(--workspace2-control-shadow-glass, none);
    }
    .workspace2-input {
      width: 100%;
      min-width: 0;
      padding: 4px 28px 4px 7px;
      user-select: text;
    }
    .workspace2-search-clear {
      position: absolute;
      right: 4px;
      top: 50%;
      width: 20px;
      height: 20px;
      border: 0;
      border-radius: 999px;
      padding: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--workspace2-muted);
      background: transparent;
      transform: translateY(-50%);
      cursor: pointer;
    }
    .workspace2-search-clear:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-hover);
    }
    .workspace2-search-clear svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }
    .workspace2-search-clear[hidden] {
      display: none;
    }
    .workspace2-button {
      width: 30px;
      padding: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .workspace2-button:hover,
    .workspace2-icon-button:hover,
    .workspace2-menu-item:hover {
      background: var(--workspace2-hover-glass, var(--workspace2-hover));
    }
    .workspace2-button.is-trash-toggle {
      border-color: var(--workspace2-danger-border);
      color: var(--workspace2-danger);
      background: var(--workspace2-danger-soft);
    }
    .workspace2-button.is-trash-toggle:hover {
      border-color: var(--workspace2-danger);
      background: var(--workspace2-danger-mid);
    }
    /* The active state is navigation back to the library, not a destructive
       action. Keep it information-blue and use arrowLeft, never restore. */
    .workspace2-button.is-trash-toggle.is-trash-return {
      border-color: var(--workspace2-info-border);
      color: var(--workspace2-info);
      background: var(--workspace2-info-soft);
    }
    .workspace2-button.is-trash-toggle.is-trash-return:hover {
      border-color: var(--workspace2-info);
      background: var(--workspace2-info-mid);
    }
    .workspace2-workflow-sort-button:not([data-sort="nameAsc"]) {
      border-color: var(--workspace2-accent-border);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-workflow-sort-button.is-custom-order {
      border-color: var(--workspace2-accent);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-mid);
    }
    .workspace2-node-favorites-manager {
      border-color: var(--workspace2-accent-border);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-node-favorites-manager:hover {
      border-color: var(--workspace2-accent);
      background: var(--workspace2-accent-mid);
    }
    .workspace2-root {
      min-height: 28px;
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr) auto;
      align-items: center;
      gap: 7px;
      padding: 4px 6px;
      border: 1px dashed transparent;
      border-radius: var(--workspace2-radius-sm);
      opacity: 0.82;
      overflow-wrap: anywhere;
    }
    .workspace2-root-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-root-label.is-custom::after {
      content: "custom";
      margin-left: 6px;
      padding: 1px 5px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 80%, transparent);
      border-radius: 999px;
      font-size: 10px;
      opacity: .72;
      text-transform: uppercase;
    }
    .workspace2-tree {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: var(--workspace2-node-list-gap);
      overflow: auto;
      border: 1px dashed transparent;
      border-radius: var(--workspace2-radius);
      padding-bottom: 18px;
      scrollbar-width: thin;
    }
    .workspace2-tree.is-drop {
      border-color: var(--workspace2-accent-border);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-row {
      min-height: var(--workspace2-row-height);
      display: grid;
      grid-template-columns: 16px 18px 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px;
      padding: 2px 5px 2px var(--indent);
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      cursor: default;
      font-size: var(--workspace2-folder-font);
    }
    .workspace2-row.is-file {
      grid-template-columns: 16px 18px minmax(0, 1fr) auto;
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-row.is-folder {
      font-weight: 500;
    }
    .workspace2-row.is-file .workspace2-spacer {
      display: none;
    }
    .workspace2-row:hover {
      background: var(--workspace2-hover-glass, var(--workspace2-hover));
    }
    /* Trail of the workflow currently being edited. Amber rather than the blue
       accent, so it reads as "this is where you are" and cannot be mistaken for
       the accent-coloured selection below — the two can land on the same row.
       Folders on the trail are deliberately lighter than the file itself, giving
       the eye a gradient to follow inward; both are visible whether the folder
       is open or closed. Declared before .is-selected so a clicked row still
       shows as selected. */
    .workspace2-row.is-active-workflow-path {
      background: var(--workspace2-active-trail-soft);
      box-shadow: inset 2px 0 0 color-mix(in srgb, var(--workspace2-active-trail) 40%, transparent);
    }
    .workspace2-row.is-active-workflow {
      background: var(--workspace2-active-trail-mid);
      box-shadow: inset 2px 0 0 var(--workspace2-active-trail);
    }
    /* Hover mixes against the same token the plain-row hover above uses, so the
       glass background gets the translucent white and opaque backgrounds get the
       theme's grey. Mixing against the opaque token in glass mode would push a
       dark grey behind the amber and mute it. */
    .workspace2-row.is-active-workflow-path:hover {
      background: color-mix(in srgb, var(--workspace2-active-trail-soft) 70%, var(--workspace2-hover-glass, var(--workspace2-hover)));
    }
    .workspace2-row.is-active-workflow:hover {
      background: color-mix(in srgb, var(--workspace2-active-trail-mid) 82%, var(--workspace2-hover-glass, var(--workspace2-hover)));
    }
    .workspace2-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-node-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-template-row {
      min-height: var(--workspace2-node-row-height);
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: calc(var(--workspace2-node-row-padding-y) + 1px) 7px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      cursor: grab;
      font-size: var(--workspace2-node-font);
    }
    .workspace2-template-row:hover {
      background: var(--workspace2-hover);
      border-color: var(--workspace2-border);
    }
    .workspace2-template-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-template-list > .workspace2-template-row {
      margin-left: var(--indent, 0px);
    }
    .workspace2-template-row:active {
      cursor: grabbing;
    }
    .workspace2-template-row svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      fill: none;
      opacity: 0.78;
    }
    .workspace2-template-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .workspace2-template-info {
      min-width: 0;
    }
    .workspace2-template-meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-workflow-section {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-workflow-section:not(.is-browse) {
      flex: 0 0 auto;
    }
    .workspace2-workflow-top {
      padding-bottom: 0;
      border-bottom: 0;
    }
    /* Workflow is the Blueprint reference migration. The shared slots own
       the five visible bands; existing workflow rows and services remain
       below this boundary, so visual consolidation cannot alter workflow I/O. */
    .workspace2-panel.workspace2-workflow-blueprint {
      padding: 0;
      gap: 0;
    }
    .workspace2-workflow-blueprint .workspacekit-ui-panel-header-slot {
      padding: 10px 10px 0;
    }
    .workspace2-workflow-blueprint .workspacekit-ui-panel-toolbar-slot {
      padding: 8px 10px 0;
    }
    .workspace2-workflow-blueprint .workspacekit-ui-panel-controls-slot {
      padding: 8px 10px;
      border-bottom: 1px solid color-mix(in srgb, var(--workspace2-border) 62%, transparent);
    }
    .workspace2-workflow-blueprint .workspacekit-ui-panel-content-slot {
      padding: 8px 10px 10px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .workspace2-workflow-content {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
    }
    .workspace2-workflow-section-header .workspace2-section-line {
      display: none;
    }
    .workspace2-workflow-section.is-browse {
      flex: 1 1 auto;
    }
    .workspace2-workflow-section.is-open-history {
      flex: 0 0 auto;
      padding: 6px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 54%, transparent);
      border-radius: var(--workspace2-radius);
      background: color-mix(in srgb, var(--workspace2-hover) 38%, transparent);
      overflow: hidden;
    }
    .workspace2-workflow-section.is-open-history .workspace2-section-header {
      min-height: 20px;
      padding: 0 6px 4px;
      color: var(--workspace2-muted);
      pointer-events: none;
    }
    .workspace2-section-header {
      min-height: 24px;
      width: 100%;
      padding: 4px 5px 3px;
      border: 0;
      border-radius: 0;
      display: grid;
      grid-template-columns: auto minmax(0, auto) minmax(12px, 1fr) auto;
      align-items: center;
      gap: 7px;
      color: var(--workspace2-muted);
      background: transparent;
      font: 500 12px/1.2 var(--font-family, Arial, sans-serif);
      text-align: left;
    }
    .workspace2-section-header.is-interactive {
      cursor: pointer;
      appearance: none;
    }
    .workspace2-section-header.is-interactive:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: color-mix(in srgb, var(--workspace2-hover) 30%, transparent);
    }
    .workspace2-section-title {
      min-width: 0;
      white-space: nowrap;
    }
    .workspace2-section-line {
      height: 1px;
      min-width: 12px;
      background: color-mix(in srgb, var(--workspace2-border) 56%, transparent);
    }
    .workspace2-section-header.is-interactive:hover .workspace2-section-line {
      background: color-mix(in srgb, var(--workspace2-border) 78%, transparent);
    }
    .workspace2-section-header.is-interactive:hover .workspace2-section-disclosure {
      color: var(--workspace2-section-disclosure-hover-color);
    }
    .workspace2-section-disclosure {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--workspace2-section-disclosure-color);
      opacity: 1;
      font-family: var(--font-family, Arial, sans-serif);
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      transition: color 120ms ease;
    }
    .workspace2-section-disclosure.is-hidden {
      display: none;
    }
    .workspace2-workflow-section-content {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-workflow-section.is-browse .workspace2-workflow-section-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .workspace2-workflow-section.is-collapsed .workspace2-workflow-section-content {
      display: none;
    }
    .workspace2-recent-workflows {
      display: flex;
      flex-direction: column;
      gap: var(--workspace2-node-list-gap);
      margin: 0;
      padding: 2px 0 0;
    }
    .workspace2-open-history-list {
      --workspace2-open-history-row-height: max(26px, calc(var(--workspace2-row-height) - 4px));
      height: calc(var(--workspace2-open-history-rows) * var(--workspace2-open-history-row-height));
      box-sizing: border-box;
      gap: 0;
      padding: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }
    .workspace2-current-workflow {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      min-height: var(--workspace2-open-history-row-height, var(--workspace2-row-height));
      padding: 1px 5px 1px 6px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
    }
    .workspace2-current-workflow:hover {
      background: var(--workspace2-hover);
    }
    /* Match Browse: the workflow currently displayed on the canvas is
       selected in both Open and Browse, while hover stays deliberately softer. */
    .workspace2-current-workflow.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-current-workflow-label {
      display: none;
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
      line-height: 1.2;
      padding: 0 6px 2px;
    }
    .workspace2-current-workflow-info {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      text-align: left;
    }
    .workspace2-current-workflow-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--workspace2-tree-font);
      font-weight: 500;
    }
    .workspace2-current-workflow-info .workspace2-rename-input {
      min-width: 0;
      flex: 1 1 auto;
    }
    .workspace2-current-workflow-dirty-dot {
      width: 7px;
      height: 7px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: var(--workspace2-accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
    }
    .workspace2-current-workflow-name.is-empty {
      padding: 1px 6px;
      color: var(--workspace2-muted);
      font-weight: 400;
    }
    .workspace2-current-workflow .workspace2-actions {
      opacity: 1;
    }
    .workspace2-row.is-drop,
    .workspace2-root.is-drop,
    .workspace2-root-row.is-drop,
    [data-workspace2-favorite-target].is-drop,
    [data-workspace2-template-target].is-drop {
      border-color: var(--workspace2-accent);
      background: var(--workspace2-accent-strong);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 30%, transparent);
    }
    .workspace2-row.is-drop-region,
    .workspace2-node-row.is-drop-region,
    .workspace2-node-folder-header.is-drop-region,
    .workspace2-node-list.is-drop-region {
      background: color-mix(in srgb, var(--workspace2-accent) 14%, transparent);
      box-shadow: inset 2px 0 0 color-mix(in srgb, var(--workspace2-accent) 72%, transparent);
    }
    .workspace2-row.is-reorder-before,
    .workspace2-node-row.is-reorder-before {
      border-top-color: var(--workspace2-accent);
      box-shadow: inset 0 2px 0 var(--workspace2-accent);
    }
    .workspace2-row.is-reorder-after,
    .workspace2-node-row.is-reorder-after {
      border-bottom-color: var(--workspace2-accent);
      box-shadow: inset 0 -2px 0 var(--workspace2-accent);
    }
    .workspace2-disclosure {
      width: 18px;
      height: 22px;
      border: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      opacity: 0.85;
      padding: 0;
    }
    .workspace2-disclosure::before {
      content: "";
      display: inline-block;
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid currentColor;
      transform: translateY(1px);
    }
    .workspace2-disclosure.is-open::before {
      transform: rotate(90deg) translateX(1px);
    }
    .workspace2-spacer {
      width: 18px;
      height: 22px;
    }
    .workspace2-reorder-spacer {
      width: 16px;
      height: 14px;
      display: inline-block;
    }
    .workspace2-folder-icon,
    .workspace2-file-icon,
    .workspace2-prime-icon,
    .workspace2-emoji-icon,
    .workspace2-reorder-handle {
      width: 16px;
      height: 14px;
      display: inline-block;
      position: relative;
      flex: 0 0 auto;
    }
    .workspace2-prime-icon,
    .workspace2-emoji-icon {
      color: var(--workspace2-icon-color, currentColor);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
    }
    .workspace2-emoji-icon {
      font-size: 13px;
    }
    .workspace2-folder-icon::before {
      content: "";
      position: absolute;
      left: 2px;
      top: 3px;
      width: 6px;
      height: 3px;
      border: 1.5px solid currentColor;
      border-bottom: 0;
      border-radius: 2px 2px 0 0;
      opacity: .7;
    }
    .workspace2-folder-icon::after {
      content: "";
      position: absolute;
      left: 1px;
      right: 1px;
      bottom: 1px;
      height: 10px;
      border: 1.5px solid currentColor;
      border-radius: 2px;
      opacity: .72;
    }
    .workspace2-file-icon::before {
      content: "";
      position: absolute;
      left: 5px;
      top: 5px;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--workspace2-muted);
      opacity: 0.9;
    }
    .workspace2-reorder-handle {
      display: inline-grid;
      place-items: center;
      cursor: grab;
      color: var(--workspace2-muted);
      opacity: 0.85;
      user-select: none;
      touch-action: none;
    }
    .workspace2-reorder-handle::before {
      content: "⋮⋮";
      font-size: 13px;
      line-height: 1;
      letter-spacing: 0;
      transform: rotate(90deg);
    }
    .workspace2-reorder-handle:hover,
    .workspace2-row.is-reordering .workspace2-reorder-handle {
      color: var(--workspace2-accent);
      opacity: 1;
    }
    .workspace2-name {
      min-width: 0;
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-row.is-folder > .workspace2-name,
    .workspace2-node-folder-header > .workspace2-name {
      opacity: 1;
    }
    .workspace2-row.is-file > .workspace2-name,
    .workspace2-node-row .workspace2-name,
    .workspace2-template-name {
      opacity: .9;
    }
    .workspace2-meta {
      color: var(--workspace2-muted);
      opacity: 1;
      font-size: var(--workspace2-meta-font);
      margin-left: 6px;
    }
    .workspace2-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
    }
    .workspace2-row:hover .workspace2-actions,
    .workspace2-row.is-selected .workspace2-actions,
    .workspace2-node-row:hover .workspace2-actions,
    .workspace2-node-row.is-selected .workspace2-actions,
    .workspace2-template-row:hover .workspace2-actions,
    .workspace2-node-folder-header:hover .workspace2-actions {
      opacity: 1;
    }
    .workspace2-panel.is-dragging,
    .workspace2-panel.is-dragging * {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .workspace2-icon-button {
      min-width: 24px;
      height: 22px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 78%, transparent);
      border-radius: var(--workspace2-radius-sm);
      color: inherit;
      background: transparent;
      cursor: pointer;
      font-size: 11px;
      padding: 0 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .workspace2-button svg,
    .workspace2-icon-button svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-icon-button.is-favorite-active {
      color: #ffd60a;
      border-color: rgba(255, 214, 10, 0.45);
      background: rgba(255, 214, 10, 0.08);
    }
    .workspace2-icon-button.is-favorite-active:hover {
      border-color: rgba(255, 214, 10, 0.65);
      background: rgba(255, 214, 10, 0.16);
    }
    .workspace2-icon-button.is-danger-action {
      color: var(--workspace2-muted);
    }
    .workspace2-icon-button.is-danger-action:hover {
      color: var(--workspace2-danger);
      border-color: var(--workspace2-danger-border);
      background: var(--workspace2-danger-soft);
    }
    .workspace2-rename-input {
      width: 100%;
      min-height: 22px;
      border: 1px solid var(--workspace2-accent);
      border-radius: var(--workspace2-radius-sm);
      color: inherit;
      background: var(--workspace2-control-bg);
      padding: 1px 5px;
      user-select: text;
    }
    .workspace2-empty {
      margin: 12px 4px;
      opacity: 0.65;
    }
    .workspace2-node-section {
      margin: 8px 0 10px;
    }
    .workspace2-node-tree > .workspace2-node-section + .workspace2-node-section {
      margin-top: 18px;
    }
    .workspace2-section-header .workspace2-meta {
      font-size: var(--workspace2-meta-font);
      margin-left: 0;
    }
    .workspace2-node-folder-header {
      min-height: var(--workspace2-row-height);
      display: grid;
      grid-template-columns: 18px 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 5px;
      padding: var(--workspace2-node-row-padding-y) 5px var(--workspace2-node-row-padding-y) var(--indent, 5px);
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-folder-font);
      font-weight: 500;
      cursor: pointer;
    }
    .workspace2-node-folder-header .workspace2-folder-icon {
      width: 16px;
      height: 14px;
    }
    .workspace2-node-folder-header:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-node-list {
      display: flex;
      flex-direction: column;
      gap: var(--workspace2-node-list-gap);
    }
    .workspace2-node-list > .workspace2-node-row {
      margin-left: var(--indent, 0px);
    }
    .workspace2-node-folder-header + .workspace2-node-list .workspace2-node-row {
      margin-left: var(--indent, 18px);
    }
    .workspace2-node-row {
      min-height: var(--workspace2-node-row-height);
      display: grid;
      grid-template-columns: 16px 8px minmax(0, 1fr) auto;
      align-items: center;
      gap: 5px;
      padding: var(--workspace2-node-row-padding-y) 5px var(--workspace2-node-row-padding-y) 8px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-node-font);
      user-select: none;
    }
    .workspace2-node-row:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-node-row > svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-node-row.is-invalid {
      opacity: 0.55;
      color: color-mix(in srgb, var(--workspace2-muted) 78%, transparent);
    }
    .workspace2-node-row.is-invalid .workspace2-node-dot {
      opacity: .35;
    }
    .workspace2-node-row.is-invalid:hover {
      background: color-mix(in srgb, var(--workspace2-hover) 45%, transparent);
    }
    .workspace2-node-dot {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--workspace2-muted);
      opacity: 0.85;
      justify-self: center;
    }
    .workspace2-node-category {
      min-width: 0;
      color: var(--workspace2-muted);
      opacity: 1;
      font-size: var(--workspace2-meta-font);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-popover {
      position: fixed;
      width: min(360px, calc(100vw - 24px));
      max-height: min(560px, calc(100vh - 24px));
      overflow: auto;
      z-index: 12000;
      pointer-events: none;
      border: 1px solid #51535c;
      border-radius: 10px;
      padding: 10px 11px 12px;
      background: #111215;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34);
      font-size: 9px;
      color: var(--p-text-color, var(--fg-color, #f2f2f2));
    }
    .workspace2-node-preview-details {
      padding: 9px 2px 0;
    }
    .workspace2-node-preview-details-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-header {
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      background: transparent;
      border-bottom: 0;
    }
    .workspace2-node-preview-dot {
      width: 8px;
      height: 8px;
      flex: 0 0 8px;
      border-radius: 50%;
      background: var(--workspace2-accent);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
    }
    .workspace2-node-preview-title {
      font-size: 9.5px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-body {
      padding: 0;
    }
    .workspace2-template-minimap {
      display: block;
      width: 100%;
      height: auto;
      margin-bottom: 8px;
      border: 1px solid #494c55;
      border-radius: 10px;
      background: #181a1f;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .workspace2-node-preview-card {
      margin-bottom: 0;
      overflow: hidden;
      border: 1px solid #494c55;
      border-radius: 12px;
      background: #282a2e;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
    }
    .workspace2-node-preview-card + .workspace2-node-preview-card {
      margin-top: 8px;
    }
    .workspace2-node-preview-card-header {
      min-height: 31px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 12px 3px;
      background: transparent;
      font-size: 11.5px;
    }
    .workspace2-node-preview-card-heading {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .workspace2-node-preview-card-chevron {
      width: 0;
      height: 0;
      flex: 0 0 auto;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid #aeb0b5;
      opacity: 0.9;
    }
    .workspace2-node-preview-card-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #f0f0f2;
      font-weight: 650;
      line-height: 1.2;
    }
    .workspace2-node-preview-kind {
      flex: 0 0 auto;
      max-width: 76px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px solid rgba(174, 176, 181, 0.32);
      border-radius: 999px;
      padding: 2px 6px;
      color: #cfd1d6;
      background: rgba(255, 255, 255, 0.055);
      font-size: 9.5px;
      font-weight: 650;
      line-height: 1.2;
    }
    .workspace2-node-preview-kind.is-image { border-color: rgba(100, 181, 246, 0.55); }
    .workspace2-node-preview-kind.is-audio { border-color: rgba(244, 143, 177, 0.55); }
    .workspace2-node-preview-kind.is-video { border-color: rgba(179, 157, 219, 0.55); }
    .workspace2-node-preview-kind.is-threeD { border-color: rgba(129, 199, 132, 0.55); }
    .workspace2-node-preview-kind.is-text { border-color: rgba(255, 193, 7, 0.55); }
    .workspace2-node-preview-surface {
      position: relative;
      min-height: 76px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      margin: 1px 12px 6px;
      overflow: hidden;
      border: 1px solid rgba(174, 176, 181, 0.18);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.16);
    }
    .workspace2-node-preview-surface.is-image,
    .workspace2-node-preview-surface.is-video {
      flex-direction: column;
      gap: 5px;
      background-color: #252930;
      background-image:
        linear-gradient(45deg, rgba(255,255,255,.055) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,.055) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,.055) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,.055) 75%);
      background-size: 14px 14px;
      background-position: 0 0, 0 7px, 7px -7px, -7px 0;
    }
    .workspace2-node-preview-surface-frame {
      width: min(112px, 52%);
      aspect-ratio: 16 / 9;
      border: 1px solid rgba(100, 181, 246, 0.48);
      border-radius: 4px;
      background: linear-gradient(135deg, rgba(100,181,246,.28), rgba(129,199,132,.12));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.035);
    }
    .workspace2-node-preview-surface.is-video .workspace2-node-preview-surface-frame {
      border-color: rgba(179, 157, 219, 0.58);
      background: linear-gradient(135deg, rgba(179,157,219,.32), rgba(100,181,246,.14));
    }
    .workspace2-node-preview-surface-timeline {
      position: absolute;
      right: 10px;
      bottom: 6px;
      left: 10px;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(179,157,219,.75) 38%, rgba(255,255,255,.14) 38%);
    }
    .workspace2-node-preview-surface.is-audio {
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      background: linear-gradient(180deg, rgba(244,143,177,.09), rgba(0,0,0,.14));
    }
    .workspace2-node-preview-surface-file {
      height: 13px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 6px;
      border: 1px solid rgba(174, 176, 181, 0.2);
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.2);
    }
    .workspace2-node-preview-surface-file-mark {
      width: 5px;
      height: 6px;
      border: 1px solid rgba(230, 232, 236, 0.58);
      border-radius: 1px;
    }
    .workspace2-node-preview-surface-file-line {
      width: 48%;
      height: 2px;
      border-radius: 999px;
      background: rgba(230, 232, 236, 0.35);
    }
    .workspace2-node-preview-audio-player {
      min-height: 27px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 7px;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.2);
    }
    .workspace2-node-preview-audio-play {
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid rgba(244, 143, 177, 0.9);
    }
    .workspace2-node-preview-audio-waveform {
      min-width: 0;
      flex: 1;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2px;
    }
    .workspace2-node-preview-surface-wave {
      width: 2px;
      height: var(--workspace2-wave-height);
      border-radius: 999px;
      background: rgba(244, 143, 177, 0.78);
    }
    .workspace2-node-preview-audio-volume {
      width: 7px;
      height: 7px;
      border: 1px solid rgba(244, 143, 177, 0.65);
      border-radius: 50%;
    }
    .workspace2-node-preview-surface.is-text {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      padding: 0 13px;
      background: linear-gradient(180deg, rgba(255,193,7,.07), rgba(0,0,0,.14));
    }
    .workspace2-node-preview-surface-line {
      display: block;
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 224, 130, 0.56);
    }
    .workspace2-node-preview-surface-line.is-1 { width: 78%; }
    .workspace2-node-preview-surface-line.is-2 { width: 92%; }
    .workspace2-node-preview-surface-line.is-3 { width: 58%; }
    .workspace2-node-preview-surface-line.is-4 { width: 72%; }
    .workspace2-node-preview-card-output {
      min-width: 0;
      flex: 0 1 64px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      color: #bfc1c7;
      font-size: 11.5px;
      line-height: 1;
    }
    .workspace2-node-preview-card-output-name {
      min-width: 0;
      max-width: 48px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-card-body {
      padding: 3px 12px 10px;
    }
    .workspace2-node-preview-layout-row {
      min-height: 23px;
      display: grid;
      /* Labels may shrink and ellipsize, but ports must always remain inside
       * the clipped card. The old 222px minimum pushed the output column past
       * the right edge in the narrow WorkspaceKit sidebar. */
      grid-template-columns: 7px minmax(0, 0.85fr) minmax(72px, 1.25fr) minmax(0, 0.85fr) 7px;
      align-items: center;
      gap: 4px;
    }
    .workspace2-node-preview-layout-row + .workspace2-node-preview-layout-row {
      margin-top: 1px;
    }
    .workspace2-node-preview-layout-label {
      min-width: 0;
      color: #bebfc4;
      font-size: 11.5px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-layout-label.is-output {
      color: #d2d3d7;
      text-align: right;
    }
    .workspace2-node-preview-layout-label.is-empty,
    .workspace2-node-preview-layout-control.is-empty,
    .workspace2-node-preview-mini-port.is-hidden {
      visibility: hidden;
    }
    .workspace2-node-preview-layout-control {
      min-width: 0;
    }
    .workspace2-node-preview-overflow {
      min-height: 23px;
      display: flex;
      align-items: center;
      padding: 0 2px;
      color: var(--workspace2-muted);
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    .workspace2-node-preview-mini-row {
      min-height: 23px;
      display: grid;
      grid-template-columns: 8px minmax(58px, 0.56fr) minmax(130px, 1.44fr);
      align-items: center;
      gap: 8px;
    }
    .workspace2-node-preview-mini-row + .workspace2-node-preview-mini-row {
      margin-top: 1px;
    }
    .workspace2-node-preview-mini-port {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--workspace2-preview-port, #8b8b8b);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.42);
    }
    .workspace2-node-preview-mini-port.is-output {
      justify-self: end;
    }
    .workspace2-node-preview-mini-row.is-widget .workspace2-node-preview-mini-port {
      visibility: hidden;
    }
    .workspace2-node-preview-mini-label {
      min-width: 0;
      color: #bebfc4;
      font-size: 11.5px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-mini-widget {
      min-width: 0;
      height: 20px;
      border: 1px solid #33363d;
      border-radius: 7px;
      background: #303238;
      color: #aeb0b5;
      font-size: 10px;
      line-height: 18px;
      padding: 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2);
    }
    .workspace2-node-preview-mini-widget.is-empty {
      visibility: hidden;
    }
    .workspace2-node-preview-mini-widget.is-combo {
      position: relative;
      padding-right: 18px;
    }
    .workspace2-node-preview-mini-widget.is-combo::after {
      content: "";
      position: absolute;
      right: 7px;
      top: 50%;
      width: 0;
      height: 0;
      border-left: 3px solid transparent;
      border-right: 3px solid transparent;
      border-top: 4px solid #aeb0b5;
      transform: translateY(-35%);
      opacity: 0.82;
    }
    .workspace2-node-preview-mini-widget.is-boolean {
      width: 38px;
      justify-self: start;
      border-radius: 999px;
      padding: 0;
    }
    .workspace2-node-preview-mini-widget.is-boolean::before {
      content: "";
      display: block;
      width: 14px;
      height: 14px;
      margin: 2px;
      border-radius: 50%;
      background: #8f9299;
    }
    .workspace2-node-preview-mini-widget.is-number {
      width: min(96px, 100%);
      justify-self: start;
    }
    .workspace2-node-preview-mini-empty {
      min-height: 18px;
      color: var(--workspace2-muted);
      font-size: 11px;
    }
    .workspace2-node-preview-slot-row {
      min-height: 18px;
      display: grid;
      grid-template-columns: 8px minmax(0, 0.68fr) minmax(54px, 1fr) minmax(0, 0.68fr) 8px;
      align-items: center;
      gap: 4px;
    }
    .workspace2-node-preview-slot-row + .workspace2-node-preview-slot-row {
      margin-top: 2px;
    }
    .workspace2-node-preview-slot-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-slot-name.is-output {
      text-align: right;
    }
    .workspace2-node-preview-slot-type {
      min-width: 0;
      height: 16px;
      border-radius: 5px;
      background: color-mix(in srgb, var(--workspace2-border) 42%, transparent);
      color: transparent;
      opacity: 1;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-widget-row {
      min-height: 18px;
      display: grid;
      grid-template-columns: 8px minmax(0, 0.68fr) minmax(54px, 1fr) 8px;
      align-items: center;
      gap: 4px;
      margin-top: 3px;
      color: color-mix(in srgb, var(--p-text-color, var(--fg-color, #fff)) 76%, transparent);
    }
    .workspace2-node-preview-widget-arrow {
      opacity: 0.55;
      text-align: center;
    }
    .workspace2-node-preview-meta {
      opacity: 0.58;
      overflow-wrap: anywhere;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .workspace2-node-preview-desc {
      opacity: 0.82;
      margin: 6px 0;
      line-height: 1.3;
      font-size: 11px;
    }
    .workspace2-node-preview-section {
      margin-top: 11px;
      border-top: 1px solid #4d5058;
      padding-top: 9px;
    }
    .workspace2-node-preview-section-title {
      margin-bottom: 8px;
      color: #a4a6ad;
      font-size: 11px;
      font-weight: 700;
      text-transform: none;
    }
    .workspace2-node-preview-row {
      min-height: 23px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
    }
    .workspace2-node-preview-row + .workspace2-node-preview-row {
      margin-top: 1px;
    }
    .workspace2-node-preview-port {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--workspace2-preview-port, #888);
    }
    .workspace2-node-preview-port.is-widget {
      border-radius: 2px;
    }
    .workspace2-node-preview-port.is-output {
      justify-self: end;
    }
    .workspace2-node-preview-name,
    .workspace2-node-preview-type {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
    }
    .workspace2-node-preview-name {
      color: #f0f0f2;
      font-weight: 650;
    }
    .workspace2-node-preview-type {
      color: #a3a5ab;
      opacity: 1;
      text-align: right;
      font-weight: 500;
    }
    .workspace2-canvas-group-list {
      flex: 1 1 auto;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .workspace2-canvas-group-row {
      min-height: 34px;
      display: grid;
      grid-template-columns: 12px minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      padding: 5px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-canvas-group-row:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-canvas-group-row.is-bypassed {
      opacity: 0.72;
    }
    .workspace2-canvas-group-swatch {
      width: 8px;
      height: 20px;
      border-radius: 999px;
      background: var(--workspace2-group-color, var(--workspace2-accent));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
    }
    .workspace2-canvas-group-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-canvas-group-meta {
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
      white-space: nowrap;
    }
    .workspace2-trash-list {
      flex: 1 1 auto;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .workspace2-trash-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 6px;
      align-items: center;
      min-height: 38px;
      padding: 5px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-trash-info {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .workspace2-trash-info > span {
      flex: 0 0 auto;
    }
    .workspace2-trash-text {
      min-width: 0;
    }
    .workspace2-trash-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .workspace2-trash-meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.62;
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-root-row {
      min-height: 32px;
      height: 32px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 156px;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      border: 1px solid color-mix(in srgb, var(--workspace2-accent) 24%, var(--workspace2-border));
      border-radius: var(--workspace2-radius);
      opacity: 0.96;
      background: color-mix(in srgb, var(--workspace2-accent) 7%, transparent);
      font-size: 12px;
    }
    .workspace2-root-row:hover,
    .workspace2-panel.is-dragging .workspace2-root-row {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
    }
    .workspace2-root-row.is-drop {
      background: var(--workspace2-accent-strong);
      border-color: var(--workspace2-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 28%, transparent), 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
    }
    .workspace2-root-row .workspace2-name {
      font-weight: 500;
    }
    .workspace2-root-target {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      overflow: hidden;
    }
    .workspace2-root-target svg {
      width: 15px;
      height: 15px;
      flex: 0 0 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-font-control {
      height: 28px;
      width: 156px;
      min-width: 156px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      gap: 5px;
      position: relative;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      white-space: nowrap;
    }
    .workspace2-font-control span {
      display: none;
      width: 18px;
      opacity: .72;
      font-size: 11px;
      text-align: center;
    }
    .workspace2-font-slider {
      width: 100%;
      min-width: 0;
      accent-color: var(--accent-color, #8ab4f8);
    }
    .workspace2-slider-value {
      position: absolute;
      right: 0;
      top: -22px;
      min-width: 34px;
      padding: 2px 6px;
      border-radius: var(--workspace2-radius-sm);
      color: var(--p-text-color, var(--fg-color, #fff));
      background: color-mix(in srgb, var(--workspace2-control-bg) 92%, black);
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 80%, transparent);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      font-size: 10px;
      line-height: 1.2;
      text-align: center;
      pointer-events: none;
      opacity: 0;
      transform: translateY(2px);
      transition: opacity 120ms ease, transform 120ms ease;
      z-index: 2;
    }
    .workspace2-font-control.is-adjusting .workspace2-slider-value,
    .workspace2-node-density.is-adjusting .workspace2-slider-value,
    .workspace2-font-control:focus-within .workspace2-slider-value,
    .workspace2-node-density:focus-within .workspace2-slider-value {
      opacity: 1;
      transform: translateY(0);
    }
    .workspace2-node-settings {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 6px;
    }
    .workspace2-node-density {
      width: 156px;
      min-width: 156px;
      height: 28px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      gap: 6px;
      position: relative;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      font-size: var(--workspace2-meta-font);
      white-space: nowrap;
    }
    .workspace2-node-root-row {
      grid-template-columns: minmax(0, 1fr) 156px;
    }
    .workspace2-node-density input {
      width: 100%;
      min-width: 0;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-node-density span:last-child {
      display: none;
      opacity: .72;
      text-align: right;
    }
    .workspace2-node-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      min-height: 27px;
      padding: 8px 0 0;
      border: 0;
      border-top: 1px solid color-mix(in srgb, var(--workspace2-border) 72%, transparent);
      border-radius: 0;
      background: transparent;
    }
    .workspace2-node-tab {
      min-width: 0;
      min-height: 23px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 0;
      border-radius: var(--workspace2-radius-sm);
      color: var(--workspace2-muted);
      background: transparent;
      cursor: pointer;
      font-size: var(--workspace2-meta-font);
      opacity: .72;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 3px 6px;
    }
    .workspace2-node-tab::before {
      display: none;
      content: none;
    }
    .workspace2-node-tab:hover {
      background: var(--workspace2-hover);
      opacity: .9;
    }
    .workspace2-node-tab.is-active {
      background: var(--workspace2-accent-soft);
      color: var(--workspace2-accent);
      opacity: 1;
      font-weight: 500;
    }
    .workspace2-node-tab.is-active::before {
      background: currentColor;
      box-shadow: inset 0 0 0 2px var(--workspace2-control-bg);
    }
    .workspace2-node-range {
      height: 28px;
      display: grid;
      grid-template-columns: auto minmax(44px, 1fr) 18px;
      align-items: center;
      gap: 6px;
      min-width: 0;
      padding: 0 7px;
      border: 1px solid var(--workspace2-border);
      border-radius: var(--workspace2-radius-sm);
      background: var(--workspace2-control-bg);
      white-space: nowrap;
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-node-range input {
      min-width: 0;
      width: 100%;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-node-range span:last-child {
      opacity: .72;
      text-align: right;
    }
    .workspace2-empty-trash-row {
      color: var(--workspace2-danger);
      border-color: var(--workspace2-danger-border);
      background: var(--workspace2-danger-soft);
    }
    .workspace2-empty-trash-row:hover {
      background: var(--workspace2-danger-mid);
      border-color: var(--workspace2-danger);
    }
    .workspace2-context {
      position: fixed;
      z-index: 100000;
      min-width: 160px;
      padding: 4px;
      border: 1px solid var(--border-color, #555);
      border-radius: 6px;
      background: var(--comfy-menu-bg, #202124);
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
    }
    .workspace2-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 28px;
      border: 0;
      border-radius: 4px;
      color: inherit;
      background: transparent;
      text-align: left;
      padding: 5px 9px;
      cursor: pointer;
    }
    .workspace2-menu-item-icon {
      flex: 0 0 15px;
      width: 15px;
      height: 15px;
      stroke: currentColor;
    }
    .workspace2-menu-item-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-menu-divider {
      height: 1px;
      margin: 4px 6px;
      background: color-mix(in srgb, var(--workspace2-border) 80%, transparent);
    }
    .workspace2-menu-check-item {
      position: relative;
      padding-left: 25px;
    }
    .workspace2-menu-check-item.is-active::before {
      content: "✓";
      position: absolute;
      left: 9px;
      top: 5px;
      color: var(--workspace2-accent);
      font-weight: 700;
    }
    .workspace2-menu-item.is-active {
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-menu-item:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .workspace2-personalize-panel {
      position: fixed;
      z-index: 100002;
      width: 282px;
      padding: 10px;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-surface, var(--comfy-menu-bg, #202124));
      box-shadow: 0 14px 34px rgba(0,0,0,.42);
      display: flex;
      flex-direction: column;
      gap: 10px;
      font: 12px/1.35 var(--font-family, Arial, sans-serif);
    }
    .workspace2-personalize-title {
      font-size: 13px;
      font-weight: 700;
    }
    .workspace2-personalize-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
      border-radius: 8px;
      background: color-mix(in srgb, var(--workspace2-hover, rgba(255,255,255,.075)) 60%, transparent);
    }
    .workspace2-personalize-preview-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-personalize-label {
      color: var(--workspace2-muted, rgba(255,255,255,.55));
      font-size: 11px;
    }
    .workspace2-personalize-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 5px;
    }
    .workspace2-personalize-choice,
    .workspace2-personalize-swatch {
      min-width: 0;
      height: 25px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 80%, transparent);
      border-radius: 7px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .workspace2-personalize-choice.is-active,
    .workspace2-personalize-swatch.is-active {
      border-color: var(--workspace2-accent, #0A84FF);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--workspace2-accent, #0A84FF) 45%, transparent);
    }
    .workspace2-personalize-swatch {
      background: var(--workspace2-swatch-color, transparent);
    }
    .workspace2-personalize-color-row {
      display: grid;
      grid-template-columns: 1fr 38px;
      gap: 7px;
      align-items: center;
    }
    .workspace2-personalize-color-row input[type="color"] {
      width: 38px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 7px;
      background: transparent;
    }
    .workspace2-personalize-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }
    .workspace2-personalize-actions button {
      min-height: 27px;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 7px;
      color: inherit;
      background: var(--workspace2-control-bg, #111);
      cursor: pointer;
      padding: 3px 9px;
    }
    .workspace2-personalize-actions button.is-primary {
      border-color: var(--workspace2-accent, #0A84FF);
      background: var(--workspace2-accent, #0A84FF);
      color: white;
    }
    .workspace2-drag-ghost {
      position: fixed;
      z-index: 100001;
      pointer-events: none;
      max-width: 280px;
      padding: 5px 9px;
      border: 1px solid var(--accent-color, #8ab4f8);
      border-radius: 5px;
      color: var(--fg-color, #ddd);
      background: var(--comfy-menu-bg, #202124);
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      opacity: 0.92;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.head.append(style);
}
