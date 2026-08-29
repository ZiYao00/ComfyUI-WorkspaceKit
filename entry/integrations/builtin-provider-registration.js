import {
  WORKSPACEKIT_PANEL_API_KEY,
  WORKSPACEKIT_PANEL_API_VERSION,
  WORKSPACEKIT_PROVIDER_REGISTRY_KEY,
} from "./panel-api.js";

export const WORKSPACEKIT_BUILTIN_PROVIDER_REGISTRY_KEY = "WorkspaceKitBuiltinPanelProviders";

function getBuiltinRegistry(target = globalThis) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) return null;
  const existing = target[WORKSPACEKIT_BUILTIN_PROVIDER_REGISTRY_KEY];
  if (existing?.providers instanceof Map) return existing;
  const registry = { providers: new Map() };
  Object.defineProperty(target, WORKSPACEKIT_BUILTIN_PROVIDER_REGISTRY_KEY, {
    configurable: true,
    enumerable: false,
    value: registry,
    writable: false,
  });
  return registry;
}

export function getBuiltinWorkspaceKitProviders(target = globalThis) {
  const registry = getBuiltinRegistry(target);
  return Object.freeze(registry ? [...registry.providers.values()] : []);
}

function rememberBuiltinProvider(provider, target = globalThis) {
  if (!provider?.id) return Object.freeze({ ok: false, code: "invalid-provider" });
  const registry = getBuiltinRegistry(target);
  if (!registry) return Object.freeze({ ok: false, code: "invalid-target" });
  registry.providers.set(provider.id, provider);
  return Object.freeze({ ok: true, code: "remembered", id: provider.id });
}

/**
 * Register a built-in WorkspaceKit panel when the public Provider API is ready,
 * otherwise queue it on the deterministic pending registry that the host drains.
 *
 * Built-in identity is remembered separately from external Provider availability.
 * This lets the WorkspaceKit tab planner expose Layout/Appearance even when the
 * user disables third-party Provider merging; the public Panel API remains the
 * compatibility transport and does not become the product-ownership boundary.
 */
export function registerOrQueueBuiltinProvider(provider, target = globalThis) {
  const remembered = rememberBuiltinProvider(provider, target);
  if (!remembered.ok) return remembered;

  const api = target?.[WORKSPACEKIT_PANEL_API_KEY];
  if (api) {
    if (api.version !== WORKSPACEKIT_PANEL_API_VERSION || typeof api.register !== "function") {
      return Object.freeze({ ok: false, code: "api-conflict" });
    }
    return api.register(provider);
  }

  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return Object.freeze({ ok: false, code: "invalid-target" });
  }
  const registry = target[WORKSPACEKIT_PROVIDER_REGISTRY_KEY]
    || (target[WORKSPACEKIT_PROVIDER_REGISTRY_KEY] = {
      version: WORKSPACEKIT_PANEL_API_VERSION,
      providers: [],
      getProviders() { return this.providers.slice(); },
    });
  if (registry.version !== WORKSPACEKIT_PANEL_API_VERSION
    || !Array.isArray(registry.providers)
    || typeof registry.getProviders !== "function") {
    return Object.freeze({ ok: false, code: "registry-conflict" });
  }
  if (registry.providers.some((item) => item?.id === provider?.id)) {
    return Object.freeze({ ok: true, code: "already-queued", id: provider?.id });
  }
  registry.providers.push(provider);
  return Object.freeze({ ok: true, code: "queued", id: provider?.id });
}
