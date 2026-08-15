// Shared ownership for the optional bottom status slot. Built-in panels and
// Providers may ignore it during the R2 rollout; the host remains visually
// unchanged until a later migration explicitly calls `show()`.
export function createWorkspacePanelStatusController({
  host,
  document = globalThis.document,
} = {}) {
  if (!host?.append || !document?.createElement) {
    throw new TypeError("A status host and DOM document are required.");
  }

  let line = null;

  const clear = () => {
    if (typeof host.replaceChildren === "function") host.replaceChildren();
    else if (line?.remove) line.remove();
    line = null;
    host.hidden = true;
  };

  const show = ({ text, tone = "neutral", live = "polite" } = {}) => {
    const message = String(text ?? "").trim();
    if (!message) {
      clear();
      return false;
    }
    if (!line) {
      line = document.createElement("div");
      line.className = "workspace2-module-status";
      host.append(line);
    }
    line.className = `workspace2-module-status is-${["neutral", "success", "warning", "error"].includes(tone) ? tone : "neutral"}`;
    line.textContent = message;
    line.setAttribute("role", "status");
    line.setAttribute("aria-live", live === "assertive" ? "assertive" : "polite");
    host.hidden = false;
    return true;
  };

  return Object.freeze({ show, clear, dispose: clear });
}
