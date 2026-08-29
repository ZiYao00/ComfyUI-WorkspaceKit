import { getBuiltinWorkspaceKitProviders } from "../integrations/builtin-provider-registration.js";

export const PINNED_PROVIDER_KEY = "workspacekit.pinnedProviderId";

function uniqueProviders(providers) {
  const byId = new Map();
  for (const provider of providers) {
    if (!provider?.id) continue;
    // The built-in registry is appended after the external list and therefore
    // wins an accidental id collision. WorkspaceKit's own module identity must
    // never be shadowed by a third-party provider with the same id.
    byId.set(provider.id, provider);
  }
  return [...byId.values()];
}

export function resolvePinnedProvider(providers, storedId = "") {
  const usable = providers.filter((provider) => provider?.id);
  return usable.find((provider) => provider.id === storedId)
    ?? usable.find((provider) => provider.defaultPinned)
    ?? [...usable].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || String(a.title).localeCompare(String(b.title)))[0]
    ?? null;
}

export function createWorkspaceTabPlan(
  coreIds,
  providers,
  storedId = "",
  target = globalThis,
  { providerFilter = () => true } = {},
) {
  const externalProviders = providers.filter((provider) => provider?.id && providerFilter(provider));
  const builtinProviders = getBuiltinWorkspaceKitProviders(target).filter(providerFilter);
  const mergedProviders = uniqueProviders([...externalProviders, ...builtinProviders]);
  const pinned = resolvePinnedProvider(mergedProviders, storedId);
  return Object.freeze({
    coreIds: Object.freeze([...coreIds]),
    pinned,
    // Built-in module identity is independent from the public Provider API, but
    // the host may still hide a first-party tab through its own visibility policy.
    mergedProviders: Object.freeze([...mergedProviders]),
  });
}
