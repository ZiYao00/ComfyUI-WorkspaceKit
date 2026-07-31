# WorkspaceKit Plugin Quickstart

How to build a new ComfyUI plugin that merges into the WorkspaceKit sidebar.
This is the practical "do this" companion to the reference docs:

- [`PANEL_PROVIDER_API.md`](PANEL_PROVIDER_API.md) — the registration contract
- [`PANEL_UI_TEMPLATE.md`](PANEL_UI_TEMPLATE.md) — the shared UI + versioning
- [`PANEL_BLUEPRINT.md`](PANEL_BLUEPRINT.md) — the panel anatomy (slots)

## Pick your adoption level

| Level | Use when | Start from |
| --- | --- | --- |
| **A — Host only** | You already have a panel with its own DOM/CSS and just want it to appear as a WorkspaceKit tab. | [`examples/minimal-panel-provider/`](../examples/minimal-panel-provider/) |
| **C — Family module** | You want one visual language, merged **and** standalone, self-contained after a normal install. | [`examples/family-module-provider/`](../examples/family-module-provider/) |

Level B (opt into the UI Template partially) is just level A that also reads the
optional `ui` capability — the A example shows the pattern.

The rest of this guide covers **level C** (the scaffold), which is what
WorkspaceKit family plugins (Layout, Theme, …) use.

## The mental model

- **One UI source of truth:** `entry/ui-kit/` in WorkspaceKit. You never
  hand-edit UI primitives in a plugin.
- **Each plugin bundles a generated copy** in `web/vendor/workspacekit-ui/`, so
  it works offline/standalone. When WorkspaceKit is installed, its **live**
  Template is used instead and the bundled copy is the fallback.
- **You own** your identity, your feature UI (`module-view.js`), your strings,
  and your feature logic. Everything else in the scaffold is generic wiring.

## 5 steps

### 1. Copy the scaffold

Copy `examples/family-module-provider/` to your new plugin, e.g.
`ComfyUI/custom_nodes/ComfyUI-MyThing/`.

### 2. Rename identity

Edit these `CHANGE ME` spots:

| File | What to change |
| --- | --- |
| `web/ui/provider.js` | `PROVIDER_ID`, `PROVIDER_TITLE`, `PROVIDER_ICON` |
| `web/ui/standalone-panel.js` | `PANEL_ID`, the standalone `icon` |
| `web/main.js` | `EXTENSION_NAME` |
| `web/foundation/i18n.js` | the `console.warn` log prefix |
| `web/ui/module-view.js` | `ROOT_CLASS` (your scoped CSS prefix) |

Use a unique, namespaced `PROVIDER_ID` (e.g. `mything.panel`) and a unique
`PANEL_ID` — collisions with another plugin break tab registration.

### 3. Build your UI in `module-view.js`

This is the only file you truly write. Render into the caller-owned slots
(`headerHost`, `controlsHost`, `contentHost`) using the shared `ui` primitives:

```js
const header = ui.createModuleHeader({ title: translate("mything.title") });
const section = ui.createSection({ title: "…", description: "…" });
const slider = ui.createRangeControl({ label: "Size", min: 8, max: 40, step: 1,
  formatValue: (v) => `${Math.round(v)}px`, onInput: (v) => applySize(v) });
```

Available primitives: `createModuleHeader`, `createSection`, `createControlRow`,
`createButton`, `createIconButton`, `createSegmentedControl`,
`createRangeControl`, `createCommandGrid`, `createContentSlots`,
`createStandaloneShell`, `createPanelBlueprint`.

Declare the capabilities you actually use in `provider.js` `UI_REQUIREMENTS` so
the host only replaces the bundled copy when it can supply them.

**Custom visuals** (a color picker, a responsive grid, anything the Template
doesn't provide) are fine — build them on top of the `--workspacekit-ui-*`
tokens and scope every selector under your own root class. Never target
`workspace2-*` / `xzg-*` or use bare `button`/`input` selectors.

### 4. Add your strings

Put keys in `web/locales/en-US.json` and `zh-CN.json`. Missing keys log a
warning and fall back to the key text.

### 5. Refresh the bundled UI Template

Add your plugin to WorkspaceKit's `scripts/ui-template-consumers.json`:

```json
{
  "schemaVersion": 1,
  "consumers": [
    { "name": "Layout", "path": "../ComfyUI-WorkspaceKit-Layout" },
    { "name": "MyThing", "path": "../ComfyUI-MyThing" }
  ]
}
```

Then, from the WorkspaceKit repo:

```bash
node scripts/export-panel-ui-template.mjs --all
```

This writes `web/vendor/workspacekit-ui/` (6 files + `manifest.json`) into every
listed plugin. Re-run it whenever WorkspaceKit's `entry/ui-kit/` changes. Verify
copies are in sync with:

```bash
node scripts/export-panel-ui-template.mjs --all --verify
```

## Lifecycle recap

1. Your `main.js` registers a standalone sidebar tab (fallback) and a provider.
2. If WorkspaceKit is present, it claims the provider and calls your
   `onHostClaimed`, which removes the standalone tab — no duplicate entry.
3. If WorkspaceKit is absent, the standalone tab renders the **same**
   `module-view` through the bundled Template. One UI, two placements.

## Don'ts

- Don't import WorkspaceKit private modules (anything under `entry/` other than
  what the export script copies into your `vendor/`).
- Don't `.gitignore` your `vendor/` — it must ship with the plugin.
- Don't hand-edit `vendor/` — regenerate it with the export script.
- Don't use Git submodules / npm / CDN for the UI — see
  [`PANEL_UI_TEMPLATE.md`](PANEL_UI_TEMPLATE.md) §11 for why.
