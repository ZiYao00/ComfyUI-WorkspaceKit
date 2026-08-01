export const PINNED_PROVIDER_KEY = "workspacekit.pinnedProviderId";

export function resolvePinnedProvider(providers, storedId = "") {
  const usable = providers.filter((provider) => provider?.id);
  return usable.find((provider) => provider.id === storedId)
    ?? usable.find((provider) => provider.defaultPinned)
    ?? [...usable].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || String(a.title).localeCompare(String(b.title)))[0]
    ?? null;
}

export function createWorkspaceTabPlan(coreIds, providers, storedId = "") {
  const mergedProviders = providers.filter((provider) => provider?.id);
  const pinned = resolvePinnedProvider(mergedProviders, storedId);
  return Object.freeze({
    coreIds: Object.freeze([...coreIds]),
    pinned,
    // The overflow selector is also the provider switcher, so it must retain
    // the current pinned provider instead of hiding it from the menu.
    mergedProviders: Object.freeze([...mergedProviders]),
  });
}
