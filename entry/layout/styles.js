const STYLE_ID = "workspacekit-layout-v2-styles";

export function ensureLayoutStyles(document = globalThis.document) {
  if (!document?.head || document.getElementById?.(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.workspacekit-layout-v2 { display:flex; flex-direction:column; min-width:0; }
.workspacekit-layout-v2-palette { gap:9px; padding:2px 0 4px; }

/* L1-A1.1: display preferences stay quiet; parameterized spacing is the only
   colored group so the number field and its two actions read as one control. */
.workspacekit-layout-v2-options { box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:36px; width:100%; padding:2px 0 5px; }
.workspacekit-layout-v2-display-mode { appearance:none; flex:0 0 auto; min-height:28px; padding:0 8px; border:1px solid transparent; border-radius:6px; background:transparent; color:inherit; font:inherit; font-size:11px; opacity:.72; cursor:pointer; }
.workspacekit-layout-v2-display-mode:hover { opacity:1; border-color:var(--workspacekit-ui-border, rgba(127,127,127,.28)); background:var(--workspacekit-ui-control-bg, rgba(127,127,127,.06)); }
.workspacekit-layout-v2-display-mode:focus-visible { outline:1px solid var(--workspacekit-ui-accent, #7aa2f7); outline-offset:1px; }

.workspacekit-layout-v2-spacing-accent { box-sizing:border-box; display:grid; grid-template-columns:minmax(52px,66px) repeat(2,34px); align-items:center; gap:3px; min-width:0; padding:3px; border:1px solid color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 48%, transparent); border-radius:7px; background:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 10%, transparent); color:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 76%, var(--base-foreground, var(--fg-color, #ddd))); }
.workspacekit-layout-v2-number { box-sizing:border-box; width:100%; min-width:0; height:30px; border:1px solid color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 40%, var(--workspacekit-ui-border, rgba(127,127,127,.28))); border-radius:5px; padding:0 6px; background:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 8%, var(--workspacekit-ui-control-bg, rgba(127,127,127,.08))); color:inherit; outline:none; font-variant-numeric:tabular-nums; }
.workspacekit-layout-v2-number:focus { border-color:var(--workspacekit-ui-accent, #7aa2f7); box-shadow:0 0 0 1px color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 22%, transparent); }

/* The first eight commands are deliberately positional: two equal 4-column rows.
   The next five size commands use one equal-width row. No semantic cards or
   irregular clusters are allowed to disturb position memory. */
.workspacekit-layout-v2-primary-grid { display:flex; flex-direction:column; gap:4px; width:100%; min-width:0; }
.workspacekit-layout-v2-primary-row { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:4px; width:100%; min-width:0; }
.workspacekit-layout-v2-size-grid { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:4px; width:100%; min-width:0; padding-top:8px; border-top:1px solid color-mix(in srgb, var(--workspacekit-ui-border, rgba(127,127,127,.28)) 65%, transparent); }

.workspacekit-layout-v2-command { appearance:none; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:100%; min-width:0; height:36px; padding:5px; border:1px solid var(--workspacekit-ui-border, rgba(127,127,127,.24)); border-radius:6px; background:var(--workspacekit-ui-control-bg, rgba(127,127,127,.055)); color:var(--base-foreground, var(--fg-color, #ddd)); cursor:pointer; transition:background-color 100ms ease,border-color 100ms ease,color 100ms ease; }
.workspacekit-layout-v2-command:not(:disabled):hover { background:var(--secondary-background-hover, var(--comfy-menu-hover-bg, rgba(255,255,255,.11))); border-color:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 48%, var(--workspacekit-ui-border, rgba(127,127,127,.28))); }
.workspacekit-layout-v2-command:not(:disabled):active { transform:translateY(1px); }
.workspacekit-layout-v2-command:focus-visible { outline:1px solid var(--workspacekit-ui-accent, #7aa2f7); outline-offset:1px; }
.workspacekit-layout-v2-command:disabled { opacity:.32; cursor:default; }
.workspacekit-layout-v2-command .workspacekit-layout-command-icon { width:var(--workspacekit-layout-command-icon-size, 22px); height:var(--workspacekit-layout-command-icon-size, 22px); }
.workspacekit-layout-v2-spacing-command { height:30px; padding:4px; border-color:transparent; background:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 10%, transparent); color:currentColor; }
.workspacekit-layout-v2-spacing-command:not(:disabled):hover { border-color:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 58%, transparent); background:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 18%, transparent); }
.workspacekit-layout-v2-spacing-command .workspacekit-layout-command-icon { width:20px; height:20px; }

.workspacekit-layout-command-icon { overflow:visible; fill:none; stroke:currentColor; stroke-width:1.65; stroke-linecap:round; stroke-linejoin:round; }
.workspacekit-layout-command-icon.is-nodealigner-legacy { fill:currentColor; stroke:none; }

/* Canvas top toolbar: same eight commands and same historical icon vocabulary. */
.workspacekit-layout-topbar-slot { display:inline-flex; flex:0 0 auto; align-items:center; gap:2px; min-height:32px; margin-inline:4px; padding:2px 4px; border-radius:8px; background:var(--secondary-background, var(--comfy-menu-bg, rgba(255,255,255,.075))); }
.workspacekit-layout-topbar-slot[hidden] { display:none !important; }
.workspacekit-layout-topbar-button { appearance:none; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; min-width:28px; padding:4px; border:0; border-radius:6px; background:transparent; color:var(--base-foreground, var(--fg-color, #ddd)); cursor:pointer; }
.workspacekit-layout-topbar-button .workspacekit-layout-command-icon { width:var(--workspacekit-layout-topbar-icon-size, 18px); height:var(--workspacekit-layout-topbar-icon-size, 18px); }
.workspacekit-layout-topbar-button:not(:disabled):hover { background:var(--secondary-background-hover, var(--comfy-menu-hover-bg, rgba(255,255,255,.12))); }
.workspacekit-layout-topbar-button:disabled { opacity:.3; cursor:default; }
.workspacekit-layout-topbar-divider { width:1px; height:18px; margin:0 2px; background:var(--border-color, rgba(127,127,127,.35)); }

/* Modern replacement for the old NodeAligner Shadow-DOM toolbar. Pinned and
   selection modes share this one surface and the unified command registry. */
.workspacekit-layout-floating-toolbar { position:fixed; z-index:1000; box-sizing:border-box; display:inline-flex; align-items:center; gap:2px; width:max-content; max-width:calc(100vw - 16px); min-height:38px; padding:4px; overflow-x:auto; overflow-y:hidden; border:1px solid color-mix(in srgb, var(--border-color, rgba(255,255,255,.18)) 82%, transparent); border-radius:7px; background:color-mix(in srgb, var(--comfy-menu-bg, #202124) 90%, transparent); box-shadow:0 8px 24px rgba(0,0,0,.18); color:var(--base-foreground, var(--fg-color, #ddd)); backdrop-filter:blur(8px); scrollbar-width:thin; }
.workspacekit-layout-floating-toolbar[hidden] { display:none !important; }
.workspacekit-layout-floating-button,
.workspacekit-layout-floating-handle,
.workspacekit-layout-floating-close { appearance:none; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; min-width:28px; padding:4px; border:1px solid transparent; border-radius:5px; background:transparent; color:inherit; cursor:pointer; }
.workspacekit-layout-floating-button { width:calc(var(--workspacekit-layout-command-icon-size, 22px) + 8px); height:calc(var(--workspacekit-layout-command-icon-size, 22px) + 8px); min-width:28px; }
.workspacekit-layout-floating-button .workspacekit-layout-command-icon { width:var(--workspacekit-layout-command-icon-size, 22px); height:var(--workspacekit-layout-command-icon-size, 22px); }
.workspacekit-layout-floating-button:not(:disabled):hover,
.workspacekit-layout-floating-handle:hover,
.workspacekit-layout-floating-close:hover { background:var(--comfy-menu-hover-bg, rgba(255,255,255,.08)); border-color:color-mix(in srgb, var(--border-color, rgba(255,255,255,.18)) 76%, transparent); }
.workspacekit-layout-floating-button:disabled { opacity:.3; cursor:default; }
.workspacekit-layout-floating-handle { padding:0; color:var(--descrip-text, #bdbdbd); cursor:grab; font-size:16px; line-height:1; }
.workspacekit-layout-floating-handle:active { cursor:grabbing; }
.workspacekit-layout-floating-close { padding:0; color:var(--descrip-text, #bdbdbd); font-size:18px; line-height:1; }
.workspacekit-layout-floating-divider { width:1px; height:18px; margin:0 2px; background:var(--border-color, rgba(127,127,127,.35)); }

.workspacekit-layout-settings-focus { outline:1px solid color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 70%, transparent); outline-offset:4px; border-radius:5px; }

@media (max-width:420px) {
  .workspacekit-layout-v2-options { gap:5px; }
  .workspacekit-layout-v2-display-mode { padding-inline:5px; }
  .workspacekit-layout-v2-spacing-accent { grid-template-columns:52px repeat(2,32px); }
  .workspacekit-layout-v2-command { height:34px; padding:4px; }
}
`;
  document.head.append(style);
}
