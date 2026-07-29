// Minimal third-party WorkspaceKit Panel Provider example.
//
// This is a complete, copyable reference for the Panel Provider API v1. It is
// a standalone ComfyUI extension: it imports nothing from WorkspaceKit and only
// talks to the public window.WorkspaceKitPanelAPI surface.
//
// Copy this file into your own extension's web/ directory and adjust the id,
// title, and render() body. See ../README.md for the load-order and CSS-scope
// rules.

import { app } from "../../../scripts/app.js";

const PROVIDER_ID = "example.minimal-panel";
const ROOT_CLASS = "example-panel-provider";
const PANEL_API_VERSION = 1;

// Install the provider's own scoped styles exactly once. Every selector is
// prefixed with ROOT_CLASS so it can never touch WorkspaceKit internals.
function installScopedStyles(doc) {
  const STYLE_ID = "example-panel-provider-style";
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
    .${ROOT_CLASS} h3 { margin: 0; font-size: 14px; }
    .${ROOT_CLASS} button { align-self: flex-start; cursor: pointer; }
    .${ROOT_CLASS} .example-count { font-variant-numeric: tabular-nums; }
  `;
  doc.head.appendChild(style);
}

// The provider object. apiVersion + id + render() are the only required fields.
const provider = {
  apiVersion: PANEL_API_VERSION,
  id: PROVIDER_ID,
  title: "Example Panel",   // required fallback label
  icon: "🧩",
  getTitle: () => "示例面板", // optional localized title

  render(context) {
    const { contentHost, ui } = context;
    const doc = contentHost.ownerDocument || document;
    installScopedStyles(doc);

    const root = doc.createElement("div");
    root.className = ROOT_CLASS;

    // Prefer the optional Panel UI Template header when a compatible host
    // provides it; otherwise fall back to a plain heading. A provider must
    // check the major contract it needs before using ui primitives.
    if (ui && typeof ui.supports === "function" && ui.supports(1) && typeof ui.createModuleHeader === "function") {
      try {
        root.appendChild(ui.createModuleHeader({ title: "Example Panel" }));
      } catch (_) {
        const h = doc.createElement("h3");
        h.textContent = "Example Panel";
        root.appendChild(h);
      }
    } else {
      const h = doc.createElement("h3");
      h.textContent = "Example Panel";
      root.appendChild(h);
    }

    let count = 0;
    const label = doc.createElement("div");
    label.className = "example-count";
    label.textContent = `Clicked ${count} times`;
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = "Click me";
    const onClick = () => {
      count += 1;
      label.textContent = `Clicked ${count} times`;
    };
    button.addEventListener("click", onClick);

    root.append(button, label);
    contentHost.appendChild(root);

    // Return dispose(): remove listeners and DOM so switching away from this
    // tab leaves nothing behind.
    return () => {
      button.removeEventListener("click", onClick);
      root.remove();
    };
  },
};

// Load-order-safe registration: register now if the API exists, otherwise queue
// on the public pending registry for WorkspaceKit to drain after it publishes.
function registerWithWorkspaceKit() {
  const api = window.WorkspaceKitPanelAPI;
  if (api && typeof api.register === "function") {
    api.register(provider);
    return;
  }
  const REGISTRY_KEY = "WorkspaceKitPanelProviderRegistry";
  const registry = window[REGISTRY_KEY] || (window[REGISTRY_KEY] = {
    version: PANEL_API_VERSION,
    providers: [],
    getProviders() { return this.providers.slice(); },
  });
  if (!registry.providers.some((p) => p && p.id === PROVIDER_ID)) {
    registry.providers.push(provider);
  }
}

app.registerExtension({
  name: "example.minimal-panel-provider",
  async setup() {
    registerWithWorkspaceKit();
  },
});
