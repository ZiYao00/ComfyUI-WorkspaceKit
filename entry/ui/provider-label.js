/** Resolves provider presentation without requiring its locale keys in WorkspaceKit. */
export function resolveWorkspacePanelProviderLabel(provider) {
  const fallback = String(provider?.title || provider?.id || "Extension");
  let title = fallback;
  try {
    const localized = provider?.getTitle?.();
    if (typeof localized === "string" && localized.trim()) title = localized.trim();
  } catch (error) {
    console.warn("[WorkspaceKit] Provider title resolver failed", provider?.id, error);
  }
  const icon = typeof provider?.icon === "string" ? provider.icon.trim() : "";
  return Object.freeze({ icon, title, text: icon ? `${icon} ${title}` : title });
}
