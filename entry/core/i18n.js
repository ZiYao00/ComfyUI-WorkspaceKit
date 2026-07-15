import { DEFAULT_LOCALE } from "./constants.js";

let appRef = null;
let fallbackStrings = {};
let locale = DEFAULT_LOCALE;
let strings = {};
const missingKeys = new Set();

export function normalizeLocale(value) {
  return String(value || DEFAULT_LOCALE).toLowerCase().startsWith("zh")
    ? "zh-CN"
    : DEFAULT_LOCALE;
}

export function detectLocale() {
  const settingKeys = ["Comfy.Locale", "Comfy_Locale", "Comfy.Locale.value", "Comfy_Locale.value"];
  const settings = appRef?.ui?.settings;
  for (const key of settingKeys) {
    const value = settings?.getSettingValue?.(key)
      ?? appRef?.extensionManager?.setting?.get?.(key)
      ?? localStorage.getItem(key);
    if (value) return normalizeLocale(value);
  }
  return normalizeLocale(document.documentElement?.lang || navigator.language);
}

function localeAssetUrl(value) {
  return new URL(`../locales/${value}.json`, import.meta.url).href;
}

export async function configureI18n(app, fallback = {}) {
  appRef = app || appRef;
  fallbackStrings = fallback || fallbackStrings;
  locale = detectLocale();
  strings = {};
  try {
    const response = await fetch(localeAssetUrl(locale), { cache: "no-store" });
    if (!response.ok) throw new Error(response.statusText);
    strings = await response.json();
  } catch {
    if (locale !== DEFAULT_LOCALE) {
      const response = await fetch(localeAssetUrl(DEFAULT_LOCALE), { cache: "no-store" });
      strings = response.ok ? await response.json() : {};
    }
  }
  return locale;
}

export function getLocale() {
  return locale;
}

export function t(key, values = {}) {
  // JSON is the source of truth.  The inline map is only an offline fallback
  // while the remaining legacy strings are migrated out of entry.js.
  const template = strings[key]
    || fallbackStrings[locale]?.[key]
    || fallbackStrings[DEFAULT_LOCALE]?.[key]
    || key;
  if (template === key && !missingKeys.has(key)) {
    missingKeys.add(key);
    console.warn(`[WorkspaceKit] Missing translation key: ${key}`);
  }
  return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}
