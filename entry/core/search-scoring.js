// Generic text search-scoring primitives shared by the Workflow, Template, and
// Node search subsystems. Pure functions with no domain, DOM, or state coupling:
// they turn arbitrary field strings + a query into comparable score tuples, and
// build pinyin-augmented field lists. Node-specific scoring lives in
// nodes/search.js; entry.js injects these into the workflow/template factories.
import { pinyin as pinyinPro } from "../pinyin-pro.esm.js";

export function pinyinText(value, mode = "full") {
  const text = String(value || "");
  if (!text || !/[㐀-鿿]/.test(text)) {
    return "";
  }
  try {
    return pinyinPro(text, {
      pattern: mode === "initial" ? "first" : "pinyin",
      toneType: "none",
      type: "string",
    }).replace(/\s/g, "").toLowerCase();
  } catch {
    return "";
  }
}

export function pinyinSearchText(values) {
  return values
    .flatMap((value) => [pinyinText(value, "full"), pinyinText(value, "initial")])
    .filter(Boolean)
    .join(" ");
}

export function compactSearchFields(values, pinyinValues = []) {
  const fields = values.filter((value) => String(value || "").trim());
  const pinyin = pinyinSearchText(pinyinValues);
  if (pinyin) {
    fields.push(pinyin);
  }
  return fields;
}

export function officialSearchWords(value) {
  return String(value || "")
    .split(/ |\b|(?<=[a-z])(?=[A-Z])|(?=[A-Z][a-z])/)
    .map((item) => item.toLocaleLowerCase())
    .filter(Boolean);
}

export function officialCalcAuxSingle(query, item, score = 0) {
  const text = String(item || "").toLocaleLowerCase();
  const itemWords = officialSearchWords(item);
  const queryParts = String(query || "").split(" ").filter(Boolean);
  let main = 9;
  let aux1 = 0;
  let aux2 = 0;

  if (text === query) {
    main = 0;
  } else if (text.startsWith(query)) {
    main = 1;
    aux2 = text.length;
  } else if (itemWords.includes(query)) {
    main = 2;
    aux1 = text.indexOf(query) + text.length * 0.5;
    aux2 = text.length;
  } else if (text.includes(query)) {
    main = 3;
    aux1 = text.indexOf(query) + text.length * 0.5;
    aux2 = text.length;
  } else if (queryParts.length && queryParts.every((part) => itemWords.includes(part))) {
    const indexes = queryParts.map((part) => itemWords.indexOf(part));
    const min = Math.min(...indexes);
    const max = Math.max(...indexes);
    main = 4;
    aux1 = max - min + max * 0.5 + text.length * 0.5;
    aux2 = text.length;
  } else if (queryParts.length && queryParts.every((part) => text.includes(part))) {
    const min = Math.min(...queryParts.map((part) => text.indexOf(part)));
    const max = Math.max(...queryParts.map((part) => text.indexOf(part) + part.length));
    main = 5;
    aux1 = max - min + max * 0.5 + text.length * 0.5;
    aux2 = text.length;
  }

  const lengthPenalty = 0.2 * (1 - Math.min(text.length, query.length) / Math.max(text.length, query.length));
  return [main, aux1, aux2, score + (Number.isFinite(lengthPenalty) ? lengthPenalty : 0)];
}

export function compareSearchScores(a, b) {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index];
    }
  }
  return a.length - b.length;
}

export function genericSearchScores(fields, query, frequencyScore = 0) {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) {
    return [0, frequencyScore, 0, 0, 0];
  }
  const scores = fields
    .map((value) => officialCalcAuxSingle(normalized, value, 0))
    .sort(compareSearchScores);
  const best = scores[0] || [9, 0, 0, 1];
  const deprecatedPenalty = fields
    .some((value) => String(value || "").toLocaleLowerCase().includes("deprecated")) && best[0] !== 0 ? 5 : 0;
  return [best[0] + deprecatedPenalty, frequencyScore, ...best.slice(1)];
}
