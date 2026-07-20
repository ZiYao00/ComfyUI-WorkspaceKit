// Shared icon presentation helper. It only mutates the supplied DOM element;
// callers retain icon choice, feature data, persistence, and all panel state.
export function isPrimeIconClass(icon) {
  return /^pi(\s|$)/.test(String(icon || "").trim());
}

export function applyDecoratedIcon(element, icon, color, fallbackClass) {
  const value = String(icon || "").trim();
  element.className = "";
  element.textContent = "";
  element.style.removeProperty("--workspace2-icon-color");
  if (color) element.style.setProperty("--workspace2-icon-color", String(color));
  if (value && !isPrimeIconClass(value)) {
    element.className = "workspace2-emoji-icon";
    element.textContent = value;
    return;
  }
  element.className = "workspace2-prime-icon " + (value || fallbackClass);
}
