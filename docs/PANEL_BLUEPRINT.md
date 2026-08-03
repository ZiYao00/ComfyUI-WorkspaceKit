# WorkspaceKit Panel Blueprint v1

Status: **stable public v1 structural contract**

> **Relationship to other docs**: this file records the visual/structural design intent for panels. The **runtime implementation contract** (versioned UI template, vendor export, host capability protocol) is tracked in [`PANEL_UI_TEMPLATE.md`](PANEL_UI_TEMPLATE.md); the batch-level execution log lives in the internal `.dev-docs/` tree (not published). The Provider surface is in [`PANEL_PROVIDER_API.md`](PANEL_PROVIDER_API.md). The approved-but-not-yet-implemented cross-family rebuild sequence is in [`WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md`](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md).

## Product anatomy

Every WorkspaceKit panel follows the same vertical order:

1. **Tab strip** — owned by the WorkspaceKit host.
2. **Header** — module title and short status.
3. **Toolbar** — optional search and immediate actions.
4. **Controls** — optional mode switches, sliders, and contextual actions.
5. **Content** — the module's scrollable feature area.

The order is fixed. A module may omit Toolbar or Controls when it genuinely has
no content for that slot; it must not create an empty visual placeholder.

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

## Guardrails

- Do not migrate a feature's data, shortcuts, workflow state, or sidebar
  lifecycle in the same batch as its visual slot move.
- Workflows is the geometry reference, not a mandate to copy its feature
  controls into unrelated panels.
- Layout command SVG sizing remains Layout-owned; it is not a generic
  Blueprint or third-party icon rule.
