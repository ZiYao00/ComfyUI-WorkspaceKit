// Public, browser-only Provider registry for optional WorkspaceKit modules.
//
// This module deliberately owns no DOM, sidebar registration, or provider
// rendering. Phase 1 only establishes a stable contract; the WorkspaceKit
// host and Layout provider are connected in later, independently verified
// batches. Keeping the registry side-effect free prevents a provider error
// from hiding WorkspaceKit's existing Workflows/Nodes/Templates sidebar.

export const WORKSPACEKIT_PANEL_API_VERSION = 1;
export const WORKSPACEKIT_PANEL_API_KEY = "WorkspaceKitPanelAPI";
export const WORKSPACEKIT_PROVIDER_REGISTRY_KEY = "WorkspaceKitPanelProviderRegistry";
const REGISTRY_KEY = "__workspaceKitPanelRegistryV1";

function invalid(code, message) {
  return Object.freeze({ ok: false, code, message });
}

function valid(provider) {
  const id = String(provider?.id || "").trim();
  if (!provider || typeof provider !== "object") return invalid("invalid-provider", "Provider must be an object.");
  if (provider.apiVersion !== WORKSPACEKIT_PANEL_API_VERSION) {
    return invalid("incompatible-api", `Provider must declare apiVersion ${WORKSPACEKIT_PANEL_API_VERSION}.`);
  }
  if (!id) return invalid("invalid-id", "Provider id is required.");
  if (typeof provider.render !== "function") return invalid("invalid-render", "Provider render() is required.");
  return Object.freeze({ ok: true, id });
}

function getRegistry(target) {
  const existing = target[REGISTRY_KEY];
  if (existing?.providers instanceof Map && existing?.listeners instanceof Set) {
    if (typeof existing.providersEnabled !== "boolean") existing.providersEnabled = true;
    return existing;
  }
  const registry = { providers: new Map(), listeners: new Set(), providersEnabled: true };
  Object.defineProperty(target, REGISTRY_KEY, {
    configurable: false, enumerable: false, value: registry, writable: false,
  });
  return registry;
}

function emit(registry, event) {
  for (const listener of [...registry.listeners]) {
    try {
      listener(event);
    } catch (error) {
      // A consumer must never be able to block another provider's lifecycle.
      console.warn("[WorkspaceKit Panel API] provider listener failed", error);
    }
  }
}

function createApi(registry, { providersEnabled = true } = {}) {
  registry.providersEnabled = providersEnabled !== false;
  const api = {
    version: WORKSPACEKIT_PANEL_API_VERSION,
    register(provider) {
      const result = valid(provider);
      if (!result.ok) return result;
      const existing = registry.providers.get(result.id);
      if (existing) {
        return Object.freeze({
          ok: existing === provider,
          code: existing === provider ? "already-registered" : "duplicate-id",
          id: result.id,
        });
      }
      registry.providers.set(result.id, provider);
      if (!registry.providersEnabled) {
        // Preserve the provider in memory while integration is disabled.  It
        // is not exposed to the host, but can become available immediately
        // after the user enables integrations without a second plugin load.
        return Object.freeze({ ok: true, code: "deferred-disabled", id: result.id });
      }
      emit(registry, Object.freeze({ type: "registered", id: result.id, provider }));
      return Object.freeze({ ok: true, code: "registered", id: result.id });
    },
    unregister(providerId, provider = undefined) {
      const id = String(providerId || "").trim();
      const existing = registry.providers.get(id);
      if (!existing) return Object.freeze({ ok: false, code: "not-found", id });
      if (provider !== undefined && existing !== provider) {
        return Object.freeze({ ok: false, code: "provider-mismatch", id });
      }
      registry.providers.delete(id);
      emit(registry, Object.freeze({ type: "unregistered", id, provider: existing }));
      return Object.freeze({ ok: true, code: "unregistered", id });
    },
    getProviders() {
      return Object.freeze(registry.providersEnabled ? [...registry.providers.values()] : []);
    },
    getProvidersEnabled() {
      return registry.providersEnabled;
    },
    setProvidersEnabled(enabled) {
      const next = enabled !== false;
      if (registry.providersEnabled === next) return Object.freeze({ ok: true, code: "unchanged", enabled: next });
      registry.providersEnabled = next;
      emit(registry, Object.freeze({ type: "availability-changed", enabled: next }));
      return Object.freeze({ ok: true, code: next ? "enabled" : "disabled", enabled: next });
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      registry.listeners.add(listener);
      return () => registry.listeners.delete(listener);
    },
  };
  return Object.freeze(api);
}

export function publishWorkspaceKitPanelApi(target = globalThis, { providersEnabled = true } = {}) {
  const existing = target?.[WORKSPACEKIT_PANEL_API_KEY];
  if (existing) {
    if (existing.version === WORKSPACEKIT_PANEL_API_VERSION
      && typeof existing.register === "function"
      && typeof existing.unregister === "function") {
      if (typeof existing.setProvidersEnabled === "function") {
        existing.setProvidersEnabled(providersEnabled);
      }
      return Object.freeze({ ok: true, code: "existing", api: existing });
    }
    return invalid("api-conflict", "A different WorkspaceKit Panel API is already published.");
  }
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return invalid("invalid-target", "A global object is required to publish the Panel API.");
  }
  const api = createApi(getRegistry(target), { providersEnabled });
  Object.defineProperty(target, WORKSPACEKIT_PANEL_API_KEY, {
    configurable: true, enumerable: true, value: api, writable: false,
  });
  return Object.freeze({ ok: true, code: "published", api });
}

// Layout can load before WorkspaceKit. Its public pending registry is scanned
// only after this API exists; this is the load-order guarantee, not a timer.
export function registerPendingWorkspaceKitPanelProviders(api, target = globalThis) {
  const registry = target?.[WORKSPACEKIT_PROVIDER_REGISTRY_KEY];
  if (registry?.version !== WORKSPACEKIT_PANEL_API_VERSION || typeof registry.getProviders !== "function") {
    return Object.freeze([]);
  }
  return Object.freeze(registry.getProviders().map((provider) => api.register(provider)));
}
