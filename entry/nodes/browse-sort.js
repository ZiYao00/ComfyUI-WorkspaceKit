// Produces stable, display-safe browse keys for Nodes trees. The visible title
// never changes: only a leading decorative prefix is ignored when ordering.
// Chinese titles use the same tone-free pinyin implementation as node search.
import { pinyinText } from "../core/search-scoring.js";

const keyCache = new Map();
const DECORATIVE_PREFIX = /^[\s\p{Extended_Pictographic}★☆●○◆◇▪▫▶▷▸▹•·|/\\_~!@#$%^&*+=\-–—:：;；,.，。()[\]【】{}<>《》“”"']+/u;

function normalizedLabel(value) {
  const display = String(value || "").trim();
  const stripped = display.replace(DECORATIVE_PREFIX, "").trim();
  return stripped || display;
}

export function nodeBrowseSortKey(value) {
  const display = String(value || "").trim();
  if (keyCache.has(display)) return keyCache.get(display);
  const normalized = normalizedLabel(display);
  const pinyin = pinyinText(normalized, "full");
  const key = (pinyin || normalized).normalize("NFKD").toLocaleLowerCase();
  if (keyCache.size >= 4096) keyCache.clear();
  keyCache.set(display, key);
  return key;
}

export function nodeBrowseInitial(value) {
  const first = nodeBrowseSortKey(value).match(/[a-z]/i)?.[0]?.toUpperCase() || "#";
  return /^[A-Z]$/.test(first) ? first : "#";
}

export function compareNodeBrowseLabels(aLabel, bLabel, aType = "", bType = "") {
  const keyDiff = nodeBrowseSortKey(aLabel).localeCompare(nodeBrowseSortKey(bLabel), "en", {
    numeric: true,
    sensitivity: "base",
  });
  if (keyDiff) return keyDiff;
  const labelDiff = String(aLabel || "").localeCompare(String(bLabel || ""), "zh-Hans-CN", {
    numeric: true,
    sensitivity: "base",
  });
  if (labelDiff) return labelDiff;
  return String(aType || "").localeCompare(String(bType || ""));
}
