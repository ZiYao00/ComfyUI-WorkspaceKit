import { buildDdTranslationAliasIndex } from "./dd-translation-aliases.js";

// DD Translation owns this endpoint.  WK asks for it only after the Nodes
// panel is opened, and only once for this browser session.  A missing plugin,
// disabled translation, malformed response, or timeout all safely mean no
// extra aliases.
export function createDdTranslationSearchAdapter({ fetchJson, timeoutMs = 3000 }) {
  let loadPromise = null;

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const payload = await fetchJson("/agl/get_translation", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "locale=zh-CN",
          signal: controller.signal,
        });
        return buildDdTranslationAliasIndex(payload);
      } catch {
        return new Map();
      } finally {
        clearTimeout(timeout);
      }
    })();
    return loadPromise;
  }

  return { load };
}
