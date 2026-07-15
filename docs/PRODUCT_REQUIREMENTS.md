# WorkspaceKit Product Requirements

Version: 1.0  
Date: 2026-07-15

## Product family

- `ComfyUI-WorkspaceKit`: modular workspace, sidebar, panel host, workflow and node organization.
- `ComfyUI-WorkspaceKit-Layout`: independent professional node alignment and layout extension that integrates automatically when WorkspaceKit is installed.

The two repositories share a product family but must remain independently installable, updateable, disableable, and recoverable.

## Background

The project started as `ComfyUI-Workspace2`, combining practical ideas from workflow management, node search, pinyin search, favorites, reusable templates, canvas grouping, and safer file operations. Its scope has grown beyond a second version of a single workspace plugin, so the public product name is now WorkspaceKit.

The new layout direction is inspired by long-term use of Adobe Photoshop and Illustrator. Their efficiency comes not only from individual commands but from a mature system of floating panels, docking, tab groups, compact toolbars, keyboard commands, key-object alignment, numeric spacing, and reusable workspaces.

Existing ComfyUI alignment extensions prove that alignment commands are useful, but they generally provide isolated panels or menus. WorkspaceKit should solve the broader problem of how professional tools are organized without turning the main repository into an unmaintainable collection of unrelated features.

## Main plugin responsibilities

WorkspaceKit owns:

- Workflow file organization.
- Node browsing, search, pinyin search, favorites, and groups.
- Reusable node templates.
- Canvas group enhancements.
- Recoverable trash behavior.
- Workspace state.
- A versioned panel registry and event bus.
- Docked and floating panel hosting in later phases.
- Optional integration points for WorkspaceKit family extensions.

WorkspaceKit does not own alignment algorithms, smart guides, radial alignment menus, or automatic graph layout. Those belong in WorkspaceKit Layout.

## Layout plugin responsibilities

WorkspaceKit Layout owns:

- Left, center, right, top, middle, and bottom alignment.
- Horizontal and vertical distribution.
- Numeric horizontal and vertical spacing.
- Equal width, equal height, and equal size.
- Key-node alignment.
- Selection bounds and key-node reference modes.
- A full layout panel.
- Selection Toolbox commands.
- Official commands and configurable keybindings.
- A standalone host when WorkspaceKit is absent.
- A WorkspaceKit adapter when the main plugin is present.
- Later: radial menu, smart guides, snapping, groups, reroutes, and automatic layout.

## Integration rules

- WorkspaceKit must not fail when Layout is missing.
- Layout must not fail when WorkspaceKit is missing.
- Layout first checks for a compatible WorkspaceKit API, then listens for a ready event.
- Only one full layout panel instance may be active by default.
- Public APIs must expose an `apiVersion`.
- Unsupported API versions must produce a warning and fall back safely.
- Integration state must not alter layout calculations.

## Panel API MVP

The first WorkspaceKit panel API should support:

- Register and unregister a panel.
- Show, hide, and toggle a panel.
- Retrieve and list registered panels.
- Duplicate-registration protection.
- Panel cleanup through `dispose()`.
- Ready, registered, shown, hidden, and layout-changed events.
- Versioned persisted visibility and size state.

Full Adobe-style docking is not an MVP requirement. It follows after the registry, state store, and Layout integration are stable.

## Compatibility

- Public naming changes to WorkspaceKit immediately in new documentation and repository metadata.
- Existing Workspace2 runtime identifiers and data remain readable.
- Runtime renaming must be driven by an audit, migration map, tests, and rollback plan.
- No user workflow, favorite, template, group, settings, or trash data may be silently moved or discarded.

## Implementation principles

- Use current official ComfyUI extension APIs where available.
- Keep ComfyUI-specific access inside adapters.
- Separate UI, state, services, geometry, layout calculations, and migrations.
- Avoid broad monkey patches.
- Prefer mature existing structures, but audit source licenses before copying code.
- Every optional integration must degrade safely.
- Batch layout changes should form one undo action.

## Delivery phases

### Phase 0 — Audit

Document current architecture, runtime identifiers, storage keys, API dependencies, monkey patches, third-party code, licenses, and migration risks.

### Phase 1 — WorkspaceKit foundation

Add an event bus, panel registry, versioned workspace state, compatibility reads for old settings, and a test external panel.

### Phase 2 — Layout MVP

Build a pure layout engine, geometry and selection services, commands, undo integration, a full standalone panel, and unit tests.

### Phase 3 — Product-family integration

Register Layout in WorkspaceKit, handle either load order, avoid duplicate panels, and provide standalone fallback.

### Phase 4 — Basic docking

Add page-level floating panels, left/right/bottom docking, resize, collapse, safe viewport recovery, and persisted layout.

### Phase 5 — Panel groups and workspaces

Add tab groups, drag-out, split regions, presets, reset, import, and export.

### Phase 6 — Advanced layout

Add radial menus, smart guides, equal-gap hints, snapping, group and reroute support, and previewable automatic layout.

## MVP completion criteria

WorkspaceKit is ready when its existing major features remain usable, the public name is updated, old data remains readable, a versioned panel API exists, panel state restores safely, and optional panels cannot prevent ComfyUI from starting.

WorkspaceKit Layout is ready when it installs independently, performs core alignment, distribution, spacing, sizing, and key-node operations, uses one undo step per operation, provides a full panel and official commands, includes tests, and integrates with WorkspaceKit without duplicate UI.
