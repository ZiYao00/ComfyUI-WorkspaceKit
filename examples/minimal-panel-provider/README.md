# Minimal WorkspaceKit Panel Provider example

A complete, copyable example of a third-party ComfyUI extension that registers
an optional panel with WorkspaceKit through the public
`window.WorkspaceKitPanelAPI` (Panel Provider API v1).

It demonstrates the whole contract with no dependency on any WorkspaceKit
private module:

- registering on `WorkspaceKitPanelAPI` with the correct `apiVersion`
- surviving load order (WorkspaceKit may load before or after this plugin)
- rendering only into the supplied hosts and returning a `dispose()`
- using the optional Panel UI Template `ui` capability when present, with a
  safe local fallback when it is absent
- scoping all custom CSS under the provider's own root class

## Files

- `web/example-panel-provider.js` — the extension. Drop this folder into
  `ComfyUI/custom_nodes/` (or point an extension loader at `web/`) and it
  registers a "Example Panel" tab inside WorkspaceKit when the integration
  setting is enabled.

## How registration works

WorkspaceKit and this plugin can load in any order:

1. If `window.WorkspaceKitPanelAPI` already exists, the provider registers
   immediately.
2. If not, the provider pushes itself onto the public pending registry
   `window.WorkspaceKitPanelProviderRegistry`, which WorkspaceKit drains once
   its API is published. This is the documented load-order guarantee, not a
   timer.

## CSS scope rule

All custom styles are prefixed with the provider's own root class
(`example-panel-provider`). Third-party providers must never target
WorkspaceKit internal classes (`workspace2-*`, `xzg-*`) or use broad global
selectors — those are private and may change between releases.
