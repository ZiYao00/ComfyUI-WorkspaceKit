# WorkspaceKit Panel UI Template v1

Status: **optional public v1.5.1 compatibility surface.** New capabilities are added only
after their compatibility and real-page evidence pass.
Scope: WorkspaceKit internal shared UI plus optional third-party Providers that choose to reuse it.


The Provider API v1 is the supported integration boundary for third-party plugins:
registration, lifecycle, host slots, and merging a tab into WorkspaceKit. A Provider does not
need to use WorkspaceKit's Panel UI Template, visual primitives, icons, spacing, or styling. The Template is opt-in only.

Reproducible acceptance evidence is recorded in [`TESTING.md`](TESTING.md).
The approved clean-rebuild and Layout/Theme migration sequence is tracked
separately in [`WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md`](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md); this public contract changes only after a planned capability has passed that sequence.

## 1. Product goal

WorkspaceKit is both a workspace product and a host for related tools. The
goal is one coherent visual language without requiring every plugin to become
one monolithic plugin.

Layout and Appearance are now built-in WorkspaceKit modules.
They consume WorkspaceKit's internal Host and shared UI directly; the public Template is
not their ownership, lifecycle, or integration boundary. Third-party plugins can merge a
tab through Provider API v1 and keep their own visual system.

Third-party plugins may merge into WorkspaceKit without adopting its UI. The
shared UI Template is an opt-in convenience, not a requirement for Provider
registration.

## 2. Terms and non-goals

| Term | Meaning |
| --- | --- |
| **Provider API** | Registration, tab planning, lifecycle, host slots, and optional settings contribution. |
| **Panel UI Template** | Versioned visual primitives, theme tokens, accessibility states, and layout rules. |
| **UI source** | The one editable WorkspaceKit source for template code and styles. |
| **Vendor runtime copy** | A generated, Git-tracked copy bundled by a standalone family plugin. It is a release artifact, not a separately designed UI. |

The template must not own a Provider's feature commands, graph logic, Undo
behavior, network calls, persistence, locale catalog, or ComfyUI compatibility
adapters. It must not turn the Provider API into a security sandbox.

## 3. Required behavior

### Built-in WorkspaceKit modules

Layout and Appearance render as built-in WorkspaceKit modules and consume the
host-owned slots/shared internal UI directly. Their feature lifecycle does not depend on
the public Panel UI Template runtime.

### Third-party Providers

WorkspaceKit publishes Provider API v1 for registration, lifecycle, host slots, and tab merge.
The optional UI Template runtime is published separately. Providers may use it, ignore it, or
render their own visual system. The Provider
integration preference controls whether optional external Provider tabs are exposed:

- integration enabled: registered external Provider tabs may merge into WorkspaceKit;
- integration disabled: external Provider tabs are hidden from the WorkspaceKit tab strip;
- in both cases: UI Template adoption remains optional and does not affect Provider registration or
  tab placement.

If the optional Template is unavailable or incompatible, an external Provider must continue to
render its own UI inside the Provider host slots. Template failure must never break the Provider
registry, the host shell, or built-in WorkspaceKit modules.


The runtime is published as `window.WorkspaceKitPanelUITemplate`. It is a
separate public capability from `window.WorkspaceKitPanelAPI`: the latter owns
Provider registration and tab placement, while the former creates compatible
visual primitives.

## 4. One source, independently installable releases

The editable Template source lives only in WorkspaceKit. Family plugins do not
hand-edit equivalent UI files.

```text
ComfyUI-WorkspaceKit
  entry/ui-kit/                   editable source of truth
  scripts/export-panel-ui-template.mjs
                                  deterministic export and manifest writer

ComfyUI-WorkspaceKit-Layout
  web/vendor/workspacekit-ui/     generated, Git-tracked standalone runtime
    manifest.json                 uiVersion, source commit, file hashes
```

After a WorkspaceKit UI change that should reach Layout:

1. Change only `ui-kit/` in WorkspaceKit.
2. Run the export command against Layout's checked-out repository.
3. The command replaces only the declared generated UI files and writes a
   manifest with UI semantic version, WorkspaceKit source commit, and SHA-256
   file inventory.
4. Run template, Layout, and visual regression checks.
5. Review and publish the WorkspaceKit and Layout Git changes separately.

The Vendor directory is a normal tracked release file, not `.gitignore`, a
backup, a Submodule, an NPM dependency, or a local link. This makes ordinary
GitHub/ComfyUI Manager installation of Layout self-contained.

## 5. Compatibility model

Plugin versions and Template versions are independent.

```text
WorkspaceKit plugin 2.0.0
  Panel UI Template v1.5.1

Layout plugin 1.0.0
  bundled Panel UI Template v1.2.0
```

Layout requests a Template **major** and named capabilities it supports. A
newer WorkspaceKit can render old Layout with its current UI when it preserves
that major contract and supplies the required primitives.
The bundled copy is then not used for the live UI. If a future Template v2 has
breaking API changes, WorkspaceKit must either keep a v1 compatibility adapter
or Layout must use its bundled v1 fallback until Layout is updated. It must
never force an incompatible renderer into an old Provider.

The export manifest is for release traceability and stale-copy detection; it is
not a requirement that both plugin releases share the same version number.

### Capability contract v1.5.1

The public Template and each created UI instance expose an immutable
`contract` object:

```js
{
  major: 1,
  version: "1.5.1",
  capabilities: ["module-header", "range-control", "segmented-control", ...]
}
```

Family plugins must request the required major and only the capabilities they
actually render. Compatibility validates both the declared capability and its
corresponding factory function; a host cannot pass merely by declaring words
in an array. Minor versions remain compatible when the contract is preserved.

For a future Template v2, WorkspaceKit must publish a v1 adapter object if it
wants v1 family plugins to inherit the new host UI. If it publishes only pure
v2, those plugins safely retain their generated Vendor runtime until upgraded.

## 6. Public UI Template contract

The host will pass an optional `ui` capability to `provider.render()` rather
than requiring a Provider to import WorkspaceKit private modules.

```js
provider.render({
  app,
  headerHost,
  toolbarHost,
  controlsHost,
  contextHost,
  contentHost,
  surface,
  ui, // optional Panel UI Template capability
})
```

`headerHost`, `toolbarHost`, `controlsHost`, and `contentHost` are the
Blueprint's four named host slots. `contextHost` remains a compatibility alias
for `toolbarHost`; existing Providers do not need to change merely because the
host has adopted the Blueprint. New Providers should prefer `toolbarHost` and
only populate `controlsHost` when they actually have a controls row.

The first version should expose only stable, generic primitives:

- `ui.version`, `ui.supports(requiredMajor)`, and `ui.contract`;
- `ui.createModuleHeader({ title, status })`;
- `ui.createSection({ title, description, actions })`;
- `ui.createIcon(iconKey, { size, className })`;
- `ui.createIconButton(options)`;
- `ui.createSegmentedControl(options)`;
- `ui.createRangeControl(options)`;
- `ui.createCommandGrid(options)`;
- documented token names for color, surface, border, radius, spacing, density,
  focus, hover, disabled, and reduced-motion states.

The exact function names may evolve before implementation, but the public
contract must be documented, versioned, and covered by a fake-Provider test
before it is offered to external authors.

## 7. Provider adoption levels

| Level | Audience | UI behavior |
| --- | --- | --- |
| A — Host only | Existing third-party panels | Uses WorkspaceKit tab/lifecycle slots; retains its own DOM and styling. |
| B — Template opt-in | New third-party panels | Uses the Panel UI Template for all or part of its presentation. |
| C — Family module | Layout and future ZiYao00 companion plugins | Uses the Template in both merged and standalone modes, with a generated Vendor runtime fallback. |

All Providers remain responsible for their own localized feature words,
command behavior, data, listener cleanup, and error handling. Providers must
scope their additional CSS under their own root and must not use broad selectors
such as `button`, `input`, `.p-button`, or WorkspaceKit private classes.

## 8. Visual and interaction standard

Template v1 must centralize:

- theme-aware foreground, muted text, surface, border, hover, focus, accent,
  disabled, and danger states;
- panel density, spacing scale, control height, icon size, border radius, and
  compact-sidebar responsive rules;
- headers, status text overflow, icon buttons, segmented controls, sliders,
  command grids, menus, and empty/error/loading states;
- keyboard focus visibility, Escape handling conventions, disabled controls,
  ARIA labels, pointer target size, and reduced-motion behavior;
- transparent and frosted WorkspaceKit background compatibility without
  changing the containing sidebar's layout or z-index.

Feature-specific visuals remain with the Provider. For example, Layout owns
alignment command icons and command availability, while the Template owns the
button treatment and grid geometry.

## 9. Implementation plan

### Batch 1 — Establish the UI core without visual migration

- Back up both repositories using their project-local `.codex-backups` rules.
- Inventory current WorkspaceKit panel primitives and the existing Layout
  standalone chrome; map equivalent controls and identify Layout-only controls.
- Create a source-only `ui-kit/` in WorkspaceKit with no feature business
  logic, no direct graph access, and no Provider registration.
- Add a deterministic export command and manifest/hash validation. Do not yet
  make Layout consume it.

Acceptance: exported files are repeatable; changed source produces an explicit
Layout diff; unchanged source produces no diff; a stale or hand-edited Vendor
file is detected.

### Batch 2 — Public host capability and example Provider

- Extend Provider render context with an optional, versioned `ui` capability
  while retaining current Provider API v1 behavior unchanged.
- Add a minimal internal fake Provider that renders only standard primitives.
- Verify load order, integration enabled/disabled, Provider exception
  isolation, cleanup, and narrow panel width behavior.

Acceptance: an old Provider works unchanged; the example Provider works with
and without the `ui` capability; a malformed Provider cannot break the core
WorkspaceKit entry.

### Batch 3 — Migrate Layout merged mode

- Replace Layout's hosted call to `ensureStandalonePanelStyles()` with the
  host-provided Template capability.
- Keep Layout command/Undo/selection/toolbar semantics untouched.
- Render title/status, density slider, mode group, actions, and command grid
  through Template primitives; preserve Layout-owned icons and translations.

Acceptance: merged Layout matches Workflows/Nodes/Templates in dark, light,
transparent, and frosted modes; tab close/reopen creates no duplicate controls
or listeners; all Layout commands remain functional.

### Batch 4 — Migrate Layout standalone mode

- Export the Template runtime into Layout's tracked Vendor directory.
- Make Layout standalone render through that same Template API.
- Publish a clear compatibility/fallback diagnostic only when the host Template
  is absent or incompatible; never disable the standalone panel.

Acceptance: Layout alone works after a normal GitHub installation; Layout with
WorkspaceKit uses the host Template; disabling panel merging changes placement
but not visual language; no network request or local absolute path is required.

### Batch 5 — Documentation and external release

- Update the Provider API document with final UI capability signatures,
  compatibility guarantees, CSS scope rules, and a complete copyable example.
  **Done (2026-07-28):** `docs/PANEL_PROVIDER_API.md` now documents CSS scope
  rules and points to the copyable `examples/minimal-panel-provider/`, whose
  contract is verified on the test package by
  `scripts/e2e/t016-example-provider.mjs`.
- Add a contributor guide for exporting the Vendor runtime and a release check
  that reports source/manifest mismatch.
- Publish the Template only after both family modes and a minimal third-party
  Provider pass the visual and lifecycle matrix. The lifecycle half is covered
  by the Provider-lifecycle and example-provider e2e checks; the visual matrix
  (dark/light/transparent/frosted, standalone) remains a manual acceptance
  item.

## 10. Release acceptance matrix

| Scenario | Required result |
| --- | --- |
| Layout alone | Full independent UI using its bundled Vendor runtime. |
| Layout + WorkspaceKit, integration enabled | One WorkspaceKit Layout tab; host Template UI; no duplicate Layout entry. |
| Layout + WorkspaceKit, integration disabled | Independent Layout entry; host Template UI; no merged tab. |
| WorkspaceKit newer, compatible Template major | Old Layout automatically receives current host visual treatment. |
| WorkspaceKit Template major incompatible | Layout safely uses its bundled Vendor runtime; no hidden entry or broken controls. |
| Dark/light/transparent/frosted | Same spacing, controls, focus, contrast, and no sidebar displacement. |
| Provider switch/close/reopen | No leaked listeners, duplicated DOM, stale menus, or stylesheet conflicts. |
| Template-opt-in third party | Uses documented public primitives without importing private WorkspaceKit code. |

## 11. Explicitly rejected approaches

- Local directory Junctions or absolute imports: only work on one development
  machine and fail for GitHub users.
- Git Submodules: normal ComfyUI Manager or ordinary Git downloads may omit
  them.
- CDN/NPM-only runtime loading: breaks offline local-first installation and
  introduces an extra installation/build contract.
- Copying Layout's existing standalone chrome as a second editable design:
  guarantees future visual drift.
- Letting third parties target WorkspaceKit internal CSS classes: breaks on
  ordinary internal refactors and exposes unsupported implementation details.
