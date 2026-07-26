# WorkspaceKit Panel Blueprint v1

Status: **active staged migration**

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

## Migration batches

| Batch | Scope | Status | Acceptance boundary |
| --- | --- | --- | --- |
| B1 | Blueprint factory, scoped styles, Vendor export | Complete | Static Template and Vendor contracts pass |
| B2 | WorkspaceKit host exposes all four module slots without moving existing content | Done | Existing Workflows/Nodes/Templates still mount unchanged; `contextHost` remains a `toolbarHost` compatibility alias |
| B3 | Workflows becomes the reference Blueprint panel | Complete | Normal and trash branches, search clear, sorting menu, close/reopen, and Layout tab regression passed; creation/import/drag remain in the broader workflow regression checklist |
| B4 | Layout consumes the same host slot semantics | Pending | Commands, toolbar modes, density slider, close/reopen and standalone Vendor fallback pass |
| B5 | Nodes and Templates migrate | Pending | Search, folder operations, template save/rename and shortcut regressions pass |
| B6 | Theme, narrow width, accessibility and third-party example | Pending | Dark/light/transparent/frosted visual matrix and provider compatibility matrix pass |

## B1 evidence

- `createPanelBlueprint()` produces Header, Toolbar, Controls, and Content
  slots and hides an empty optional slot.
- The WorkspaceKit host now exposes the same four named DOM slots through its
  Provider render contract. This is intentionally structural-only: built-in
  module renderers retain their current content mount until their own migration
  batch, and legacy Providers can keep using `contextHost`.
- `entry/ui-kit/blueprint.js` is part of the deterministic Vendor inventory.
- WorkspaceKit Template/API/host contracts and Layout Vendor/Provider tests
  passed on 2026-07-24.

## B3 evidence

- Workflows maps title/status to Header, search/actions to Toolbar, root-drop
  plus list-scale to Controls, and Open/Browse or Trash to Content.
- It retains the existing workflow content mount, services, state, and event
  handlers; this batch does not move workflow data or change any operation.
- Browser acceptance on the test package confirmed all four slots for both
  normal and trash branches, search input/clear, sort-menu open/close,
  close/reopen, and the merged Layout tab without console errors.

## Guardrails

- Do not migrate a feature's data, shortcuts, workflow state, or sidebar
  lifecycle in the same batch as its visual slot move.
- Workflows is the geometry reference, not a mandate to copy its feature
  controls into unrelated panels.
- Layout command SVG sizing remains Layout-owned; it is not a generic
  Blueprint or third-party icon rule.
