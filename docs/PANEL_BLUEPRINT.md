# WorkspaceKit Panel Blueprint v1

Status: **stable public v1 structural contract**

> **Relationship to other docs**: this file records the visual/structural design intent for panels. The **runtime implementation contract** (versioned UI template, vendor export, host capability protocol) is tracked in [`PANEL_UI_TEMPLATE.md`](PANEL_UI_TEMPLATE.md); the batch-level execution log lives in the internal `.dev-docs/` tree (not published). The Provider surface is in [`PANEL_PROVIDER_API.md`](PANEL_PROVIDER_API.md). The approved-but-not-yet-implemented cross-family rebuild sequence is in [`WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md`](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md).

## Product anatomy

Every WorkspaceKit panel follows the same vertical order:

1. **Tab strip** — owned by the WorkspaceKit host; the active module tab is the
   hosted core panel's title.
2. **Toolbar** — optional search and immediate actions.
3. **Controls** — optional mode switches, sliders, and contextual actions.
4. **Content** — the module's scrollable feature area.
5. **Bottom status** — short stable metrics and optional contextual help.

The order is fixed. A module may omit Toolbar, Controls, or Bottom status when
it genuinely has no content for that slot; it must not create an empty visual
placeholder. `Header` remains an optional compatibility slot for standalone or
legacy Providers, not part of the hosted core-panel chrome.

## Ownership

| Layer | Owner | Examples |
| --- | --- | --- |
| Tab strip, background, sidebar lifecycle | WorkspaceKit host | fixed tabs, pinned provider, glass mode |
| Blueprint slot geometry | Panel UI Template | header/toolbar/control/content spacing and scrolling |
| Module words and behavior | Feature owner | Workflows actions, Layout commands, Nodes search |
| Optional external integration | Provider | fills compatible host slots; may use Vendor fallback |

The Blueprint is optional for external providers. It is the required product
standard for WorkspaceKit family panels.

## Adoption and evidence

This document intentionally does not track per-batch `Pending`/`Done` state.
Current implementation work is tracked locally in the development log; only
reproducible evidence belongs in [`TESTING.md`](TESTING.md). The next approved
cross-family evolution is recorded in
[`WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md`](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md).

`createPanelBlueprint()` exposes Header, Toolbar, Controls, and Content and
hides empty optional slots. `contextHost` remains a Toolbar compatibility alias
for legacy Providers.

### Hosted core-panel geometry

Workflows, Nodes, and Templates share one host-frame rule: the outer Blueprint
frame has no padding or gap; its individual slots own the visible rhythm.
Toolbar uses `8px 10px 0`, Controls uses `8px 10px 6px`, and the scrollable
Content body uses `0 10px 10px`. This prevents a feature panel from inheriting
both its legacy panel padding and the Blueprint slot padding.

Within Workflows, the visible content order is fixed as **Open → All/Favorites
switcher → workflow tree**. Browse remains a structural scroll container only;
it must not render a second visible `Browse` title or collapse control.

## Guardrails

- Do not migrate a feature's data, shortcuts, workflow state, or sidebar
  lifecycle in the same batch as its visual slot move.
- Workflows is the geometry reference, not a mandate to copy its feature
  controls into unrelated panels.
- Do not restore legacy outer padding on only one core panel. Core spacing must
  be changed through the shared hosted-frame rule and verified across all three
  built-in modules.
- Layout command SVG sizing remains Layout-owned; it is not a generic
  Blueprint or third-party icon rule.
