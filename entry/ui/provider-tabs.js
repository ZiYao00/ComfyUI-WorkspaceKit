export const PINNED_PROVIDER_KEY = "workspacekit.pinnedProviderId";

export function resolvePinnedProvider(providers, storedId = "") {
  const usable = providers.filter((provider) => provider?.id);
  return usable.find((provider) => provider.id === storedId)
    ?? usable.find((provider) => provider.defaultPinned)
    ?? [...usable].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || String(a.title).localeCompare(String(b.title)))[0]
    ?? null;
}

export function createWorkspaceTabPlan(coreIds, providers, storedId = "") {
  const pinned = resolvePinnedProvider(providers, storedId);
  return Object.freeze({
    coreIds: Object.freeze([...coreIds]),
    pinned,
    overflowProviders: Object.freeze(providers.filter((provider) => provider !== pinned)),
  });
}
