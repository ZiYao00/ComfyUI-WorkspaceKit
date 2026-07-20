// Owns only persistence and defensive parsing for Browse custom-order data.
// Path remapping, reorder decisions, rendering, workflow files, and official
// Store synchronization remain in their existing callers.
export function createWorkflowCustomOrderStore({ storage, key }) {
  function read() {
    try {
      const parsed = JSON.parse(storage.getItem(key) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function save(order) {
    storage.setItem(key, JSON.stringify(order || {}));
  }

  return { read, save };
}
