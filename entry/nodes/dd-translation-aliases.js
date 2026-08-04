// Pure adapter for ComfyUI-DD-Translation payloads.  The translator replaces
// LiteGraph titles in the browser but its table still keeps the original node
// name as the key.  This module deliberately does not fetch, cache, or mutate
// node definitions; integration decides when the optional data is available.
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function parsePayload(payload) {
  let value = payload;
  for (let attempt = 0; attempt < 2 && typeof value === "string"; attempt += 1) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return asObject(value);
}

function text(value) {
  return String(value || "").trim();
}

function translatedTitle(record) {
  const entry = asObject(record);
  return text(entry?.title || entry?.display_name || entry?.displayName);
}

// Reverse lookup is intentionally restricted to titles with a single source
// key.  Generic translations such as "Image" must never make an unrelated
// English node name searchable.
export function buildDdTranslationAliasIndex(payload) {
  const root = parsePayload(payload);
  const nodes = asObject(root?.Nodes || root?.nodes);
  const translatedBySourceKey = new Map();
  const sourceByTranslatedTitle = new Map();

  for (const [sourceKey, record] of Object.entries(nodes || {})) {
    const source = text(sourceKey);
    const translated = translatedTitle(record);
    if (!source || !translated || source === translated) continue;
    translatedBySourceKey.set(source, translated);
    if (!sourceByTranslatedTitle.has(translated)) {
      sourceByTranslatedTitle.set(translated, source);
    } else if (sourceByTranslatedTitle.get(translated) !== source) {
      sourceByTranslatedTitle.set(translated, null);
    }
  }
  return {
    translatedBySourceKey,
    sourceByTranslatedTitle,
    get size() {
      return translatedBySourceKey.size;
    },
  };
}

export function resolveDdTranslationSearchAliases(node, aliasIndex) {
  if (!aliasIndex?.translatedBySourceKey || !aliasIndex?.sourceByTranslatedTitle) return [];
  const aliases = [];
  const seen = new Set();
  for (const candidate of [node?.type, node?.rawTitle, node?.title]) {
    const value = text(candidate);
    const translated = aliasIndex.translatedBySourceKey.get(value);
    if (translated && !seen.has(translated)) {
      seen.add(translated);
      aliases.push(translated);
    }
    const source = aliasIndex.sourceByTranslatedTitle.get(value);
    if (source && !seen.has(source)) {
      seen.add(source);
      aliases.push(source);
    }
  }
  return aliases;
}
