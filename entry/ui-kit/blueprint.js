import { createPanelUiPrimitives } from "./primitives.js";

// The Panel Blueprint standardizes where a module puts information. It does
// not decide what a Workflow, Node, Template, or Provider renders in those
// areas, keeping feature behavior separate from shared product anatomy.
export function createPanelBlueprint({ document = globalThis.document } = {}) {
  const ui = createPanelUiPrimitives(document);
  const root = ui.createRoot();
  root.classList.add("workspacekit-ui-panel-blueprint");

  const header = document.createElement("div");
  header.className = "workspacekit-ui-panel-header-slot";
  const toolbar = document.createElement("div");
  toolbar.className = "workspacekit-ui-panel-toolbar-slot";
  const controls = document.createElement("div");
  controls.className = "workspacekit-ui-panel-controls-slot";
  const content = document.createElement("div");
  content.className = "workspacekit-ui-panel-content-slot";
  root.append(header, toolbar, controls, content);

  const setSlot = (slot, value) => {
    const children = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
    slot.replaceChildren(...children);
    slot.hidden = children.length === 0;
  };

  return Object.freeze({
    element: root,
    header,
    toolbar,
    controls,
    content,
    setHeader: (value) => setSlot(header, value),
    setToolbar: (value) => setSlot(toolbar, value),
    setControls: (value) => setSlot(controls, value),
    setContent: (value) => setSlot(content, value),
    // Hosted panels route status through the host-owned bottom-status controller.
    // Standalone/non-host blueprints keep a no-op compatibility method so shared
    // panel renderers never fail merely because the optional status slot is absent.
    setStatus: () => {},
  });
}
