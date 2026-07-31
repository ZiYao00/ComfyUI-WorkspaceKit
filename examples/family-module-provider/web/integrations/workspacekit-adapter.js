// Public discovery bridge for optional WorkspaceKit hosting.
//
// This file is generic: it contains no plugin-specific logic and can be copied
// verbatim into a new family-module plugin. It records a provider first, then
// uses a compatible WorkspaceKit API immediately when one is already available.
// If WorkspaceKit loads later, it drains the public pending registry.

export const WORKSPACEKIT_PANEL_API_KEY = "WorkspaceKitPanelAPI";
export const WORKSPACEKIT_PANEL_API_VERSION = 1;
export const WORKSPACEKIT_PROVIDER_REGISTRY_KEY = "WorkspaceKitPanelProviderRegistry";
const INTERNAL_REGISTRY_KEY = "__workspaceKitPanelProviderRegistryV1";

function result(ok, code, extra = {}) {
  return Object.freeze({ ok, code, ...extra });
}

function validateProvider(provider) {
  const id = String(provider?.id || "").trim();
  if (!provider || typeof provider !== "object") return result(false, "invalid-provider");
  if (provider.apiVersion !== WORKSPACEKIT_PANEL_API_VERSION) return result(false, "incompatible-provider-api");
  if (!id) return result(false, "invalid-provider-id");
  if (typeof provider.render !== "function") return result(false, "invalid-provider-render");
  return result(true, "valid", { id });
}

function createProviderRegistry() {
  const providers = new Map();
  return Object.freeze({
    version: WORKSPACEKIT_PANEL_API_VERSION,
    register(provider) {
      const checked = validateProvider(provider);
      if (!checked.ok) return checked;
      const existing = providers.get(checked.id);
      if (existing) {
        return result(existing === provider, existing === provider ? "already-registered" : "duplicate-id", { id: checked.id });
      }
      providers.set(checked.id, provider);
      return result(true, "registered", { id: checked.id });
    },
    unregister(providerId, provider = undefined) {
      const id = String(providerId || "").trim();
      const existing = providers.get(id);
      if (!existing) return result(false, "not-found", { id });
      if (provider !== undefined && provider !== existing) return result(false, "provider-mismatch", { id });
      providers.delete(id);
      return result(true, "unregistered", { id });
    },
    getProviders() {
      return Object.freeze([...providers.values()]);
    },
  });
}

/** Publishes the load-order-safe, public pending-provider registry. */
export function publishWorkspaceKitProviderRegistry(target = globalThis) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return result(false, "invalid-target");
  }
  const existing = target[WORKSPACEKIT_PROVIDER_REGISTRY_KEY];
  if (existing) {
    if (existing.version === WORKSPACEKIT_PANEL_API_VERSION
      && typeof existing.register === "function"
      && typeof existing.getProviders === "function") {
      return result(true, "existing", { registry: existing });
    }
    return result(false, "registry-conflict");
  }
  const registry = createProviderRegistry();
  Object.defineProperty(target, INTERNAL_REGISTRY_KEY, {
    configurable: false, enumerable: false, value: registry, writable: false,
  });
  Object.defineProperty(target, WORKSPACEKIT_PROVIDER_REGISTRY_KEY, {
    configurable: true, enumerable: true, value: registry, writable: false,
  });
  return result(true, "published", { registry });
}

/**
 * Records a provider first, then uses a compatible WorkspaceKit API immediately
 * when one is already available. WorkspaceKit scans the public registry in its
 * following host-claim batch when this plugin loaded first.
 */
export function registerWorkspaceKitProvider(provider, target = globalThis) {
  const published = publishWorkspaceKitProviderRegistry(target);
  if (!published.ok) return published;
  const recorded = published.registry.register(provider);
  if (!recorded.ok) return recorded;

  const api = target[WORKSPACEKIT_PANEL_API_KEY];
  if (!api) return result(true, "deferred", { id: recorded.id });
  if (api.version !== WORKSPACEKIT_PANEL_API_VERSION || typeof api.register !== "function") {
    return result(false, "incompatible-workspacekit-api", { id: recorded.id });
  }
  return api.register(provider);
}
