const STYLE_ID = "workspacekit-layout-v2-styles";

export function ensureLayoutStyles(document = globalThis.document) {
  if (!document?.head || document.getElementById?.(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.workspacekit-layout-v2 { display:flex; flex-direction:column; min-width:0; }
.workspacekit-layout-v2-options { display:flex; align-items:center; justify-content:flex-end; min-height:30px; width:100%; }
.workspacekit-layout-v2-toggle { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-size:11px; opacity:.78; }
.workspacekit-layout-v2-toggle input { margin:0; }

/* Adobe-like compact alignment palette: commands are read by icon shape and
   stable position, not by stacked cards or repeated section descriptions. */
.workspacekit-layout-v2-palette { gap:10px; padding:2px 0 4px; }
.workspacekit-layout-v2-toolstrip,
.workspacekit-layout-v2-row { box-sizing:border-box; display:flex; align-items:center; min-width:0; min-height:38px; }
.workspacekit-layout-v2-toolstrip { gap:7px; overflow-x:auto; overflow-y:hidden; padding:2px 0 5px; scrollbar-width:thin; }
.workspacekit-layout-v2-cluster { display:inline-flex; align-items:center; gap:4px; flex:0 0 auto; }
.workspacekit-layout-v2-divider { width:1px; height:22px; flex:0 0 1px; background:var(--workspacekit-ui-border, rgba(127,127,127,.28)); opacity:.8; }
.workspacekit-layout-v2-command { appearance:none; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:38px; height:34px; min-width:38px; padding:5px; border:1px solid var(--workspacekit-ui-border, rgba(127,127,127,.24)); border-radius:6px; background:var(--workspacekit-ui-control-bg, rgba(127,127,127,.055)); color:var(--base-foreground, var(--fg-color, #ddd)); cursor:pointer; transition:background-color 100ms ease,border-color 100ms ease,color 100ms ease; }
.workspacekit-layout-v2-command:not(:disabled):hover { background:var(--secondary-background-hover, var(--comfy-menu-hover-bg, rgba(255,255,255,.11))); border-color:color-mix(in srgb, var(--workspacekit-ui-accent, #7aa2f7) 48%, var(--workspacekit-ui-border, rgba(127,127,127,.28))); }
.workspacekit-layout-v2-command:not(:disabled):active { transform:translateY(1px); }
.workspacekit-layout-v2-command:focus-visible { outline:1px solid var(--workspacekit-ui-accent, #7aa2f7); outline-offset:1px; }
.workspacekit-layout-v2-command:disabled { opacity:.32; cursor:default; }
.workspacekit-layout-v2-command .workspacekit-layout-command-icon { width:22px; height:22px; }
.workspacekit-layout-v2-row { gap:8px; border-top:1px solid color-mix(in srgb, var(--workspacekit-ui-border, rgba(127,127,127,.28)) 65%, transparent); padding-top:8px; }
.workspacekit-layout-v2-row-label { flex:0 0 34px; min-width:34px; font-size:11px; opacity:.68; white-space:nowrap; }
.workspacekit-layout-v2-number { box-sizing:border-box; width:66px; height:30px; border:1px solid var(--workspacekit-ui-border, rgba(127,127,127,.28)); border-radius:6px; padding:0 7px; background:var(--workspacekit-ui-control-bg, rgba(127,127,127,.08)); color:inherit; outline:none; font-variant-numeric:tabular-nums; }
.workspacekit-layout-v2-number:focus { border-color:var(--workspacekit-ui-accent, #7aa2f7); }
.workspacekit-layout-v2-size-row { align-items:flex-start; }
.workspacekit-layout-v2-size-row .workspacekit-layout-v2-row-label { padding-top:9px; }
.workspacekit-layout-v2-size-actions { flex-wrap:wrap; }

.workspacekit-layout-command-icon { overflow:visible; fill:none; stroke:currentColor; stroke-width:1.45; stroke-linecap:round; stroke-linejoin:round; }
.workspacekit-layout-command-icon rect { fill:currentColor; fill-opacity:.12; }

/* Canvas top bar uses the same command icons as the full Layout palette so the
   user's visual memory transfers between the two surfaces. */
.workspacekit-layout-topbar-slot { display:inline-flex; flex:0 0 auto; align-items:center; gap:2px; min-height:32px; margin-inline:4px; padding:2px 4px; border-radius:8px; background:var(--secondary-background, var(--comfy-menu-bg, rgba(255,255,255,.075))); }
.workspacekit-layout-topbar-slot[hidden] { display:none !important; }
.workspacekit-layout-topbar-button { appearance:none; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; min-width:28px; padding:4px; border:0; border-radius:6px; background:transparent; color:var(--base-foreground, var(--fg-color, #ddd)); cursor:pointer; }
.workspacekit-layout-topbar-button .workspacekit-layout-command-icon { width:18px; height:18px; }
.workspacekit-layout-topbar-button:not(:disabled):hover { background:var(--secondary-background-hover, var(--comfy-menu-hover-bg, rgba(255,255,255,.12))); }
.workspacekit-layout-topbar-button:disabled { opacity:.3; cursor:default; }
.workspacekit-layout-topbar-divider { width:1px; height:18px; margin:0 2px; background:var(--border-color, rgba(127,127,127,.35)); }

@media (max-width:420px) {
  .workspacekit-layout-v2-command { width:34px; min-width:34px; }
  .workspacekit-layout-v2-row-label { flex-basis:30px; min-width:30px; }
}
`;
  document.head.append(style);
}
