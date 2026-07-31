# WorkspaceKit Family-Module Provider (C-tier scaffold)

A complete, copyable scaffold for a ComfyUI plugin that **merges into the
WorkspaceKit sidebar as a tab** and **also works standalone** when WorkspaceKit
is absent. This is the "C-tier / family module" adoption level from
[`docs/PANEL_UI_TEMPLATE.md`](../../docs/PANEL_UI_TEMPLATE.md) §7.

For a lighter "host-only" panel that keeps its own DOM/styling, see
[`../minimal-panel-provider/`](../minimal-panel-provider/) (A-tier) instead.

## What you get

```
family-module-provider/
  __init__.py                              WEB_DIRECTORY = "./web"
  web/
    main.js                                orchestration (rarely edited)
    integrations/workspacekit-adapter.js   load-order-safe registration (generic, copy verbatim)
    foundation/i18n.js                     locale loader (generic)
    ui/provider.js                         provider identity + host wiring   ← CHANGE ME
    ui/module-view.js                      YOUR panel UI                     ← EDIT THIS
    ui/standalone-panel.js                 standalone fallback (generic)
    locales/en-US.json, zh-CN.json         your strings
    vendor/workspacekit-ui/                bundled UI Template copy (generated)
```

## Quick start (5 steps)

See [`docs/PANEL_QUICKSTART.md`](../../docs/PANEL_QUICKSTART.md) for the full
walkthrough. In short:

1. **Copy** this folder into `ComfyUI/custom_nodes/<your-plugin>/`.
2. **Rename identity** in `web/ui/provider.js`: `PROVIDER_ID`, `PROVIDER_TITLE`,
   `PROVIDER_ICON` (all marked `CHANGE ME`). Also update the `PANEL_ID` in
   `web/ui/standalone-panel.js`, the `EXTENSION_NAME` in `web/main.js`, and the
   log prefix in `web/foundation/i18n.js`.
3. **Build your UI** in `web/ui/module-view.js` using the shared `ui`
   primitives (`ui.createSection`, `ui.createRangeControl`, etc.). Keep every
   custom CSS selector under your own root class.
4. **Add your strings** to `web/locales/*.json`.
5. **Refresh the vendor copy**: add your plugin to
   `scripts/ui-template-consumers.json` in WorkspaceKit and run
   `node scripts/export-panel-ui-template.mjs --all`.

## Why a bundled `vendor/` copy?

So the plugin is self-contained after an ordinary GitHub / ComfyUI Manager
install. When WorkspaceKit is present, its live UI Template is used instead
(the bundled copy is the fallback). This mirrors how
`ComfyUI-WorkspaceKit-Layout` ships. Never hand-edit `vendor/` — it is
generated from WorkspaceKit's `entry/ui-kit/` source of truth.

## Rules that keep the sidebar stable

- Only append to the supplied hosts; return a `dispose()` that cleans up.
- Prefix every custom selector with your own root class; install styles once by
  a unique `<style>` id.
- Never target WorkspaceKit internal classes (`workspace2-*`, `xzg-*`) or use
  broad global selectors. Prefer the shared `ui` primitives + `--workspacekit-ui-*`
  tokens for chrome.
