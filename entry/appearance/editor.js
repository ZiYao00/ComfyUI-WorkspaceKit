import { FIELD_META, GROUP_META, inferFieldMeta } from "./field-meta.js";
import { formatCssColor, parseCssColor, rgbToHex } from "./color-utils.js";
import { extractReferencePalette } from "./reference-palette.js";
import {
  cloneTheme,
  downloadTheme,
  getThemeValue,
  setThemeValue,
  validateThemeDocument,
} from "./theme-document.js";
import { ensureAppearanceStyles } from "./styles.js";
import { getLocale, t } from "../core/i18n.js";

const MAX_HISTORY = 80;
const GROUP_ORDER = new Map(GROUP_META.map((group, index) => [group.id, index]));

function element(document, tag, className = "", text = undefined) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function normalizedStem(value, fallback = "wk-theme") {
  const stem = String(value ?? "")
    .replace(/\.json$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || fallback;
}

function fieldSearchText(section, key, meta) {
  return `${section} ${key} ${meta?.label ?? ""} ${meta?.description ?? ""}`.toLowerCase();
}

function groupLabel(groupId) {
  const translated = t(`appearance.group.${groupId}`);
  if (translated !== `appearance.group.${groupId}`) return translated;
  return GROUP_META.find((item) => item.id === groupId)?.label ?? groupId;
}

function groupDescription(groupId) {
  const translated = t(`appearance.group.${groupId}.help`);
  if (translated !== `appearance.group.${groupId}.help`) return translated;
  return GROUP_META.find((item) => item.id === groupId)?.description ?? "";
}

export class AppearanceEditor {
  constructor(app, adapter) {
    this.app = app;
    this.adapter = adapter;
    this.document = null;
    this.ui = null;
    this.hosts = null;
    this.theme = null;
    this.baselineTheme = null;
    this.runtimeSnapshot = null;
    this.history = [];
    this.historyIndex = -1;
    this.livePreview = true;
    this.searchQuery = "";
    this.activeColorTarget = null;
    this.bundledThemes = [];
    this.sourceFile = "";
    this.fileStem = "workspacekit-theme";
    this.dirty = false;
    this.overwriteArmed = false;
    this.referenceUrl = "";
    this.referencePalette = [];
    this.referenceImage = null;
    this.legacyThemeCount = 0;
    this.headerStatus = null;
    this.refs = {};
  }

  mount({
    document = globalThis.document,
    headerHost,
    toolbarHost,
    controlsHost,
    contentHost,
    surface = contentHost,
    ui,
  }) {
    if (!document?.createElement || !headerHost || !toolbarHost || !controlsHost || !contentHost || !ui) {
      throw new TypeError("Appearance Editor requires WorkspaceKit Blueprint hosts and UI Kit.");
    }
    ensureAppearanceStyles(document);
    this.document = document;
    this.ui = ui;
    this.hosts = { headerHost, toolbarHost, controlsHost, contentHost, surface };
    this.runtimeSnapshot = this.adapter.captureSnapshot();
    const captured = validateThemeDocument(this.runtimeSnapshot, getLocale().startsWith("zh") ? "zh" : "en");
    captured.id = captured.id || `workspacekit-runtime-${Date.now()}`;
    captured.name = t("appearance.currentRuntime");
    this.setTheme(captured, { baseline: true, sourceFile: "", apply: false });
    this.render();
    void this.loadManifest();
    void this.loadLegacyStatus();
  }

  unmount({ restoreRuntime = true } = {}) {
    if (restoreRuntime && this.runtimeSnapshot) {
      this.adapter.applyTheme(this.runtimeSnapshot);
    }
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.referenceUrl = "";
    for (const host of Object.values(this.hosts ?? {})) host?.replaceChildren?.();
    this.hosts = null;
    this.ui = null;
    this.document = null;
  }

  setStatus(message = "") {
    this.headerStatus?.setStatus?.(message);
  }

  setTheme(theme, { baseline = true, sourceFile = "", apply = true } = {}) {
    this.theme = validateThemeDocument(theme, getLocale().startsWith("zh") ? "zh" : "en");
    this.sourceFile = sourceFile || "";
    this.fileStem = normalizedStem(
      sourceFile ? sourceFile.split("/").at(-1) : this.theme.id,
      "workspacekit-theme",
    );
    this.overwriteArmed = Boolean(sourceFile);
    if (baseline) this.baselineTheme = cloneTheme(this.theme);
    this.history = [cloneTheme(this.theme)];
    this.historyIndex = 0;
    this.dirty = false;
    if (apply && this.livePreview) this.adapter.applyTheme(this.theme);
  }

  pushHistory() {
    if (!this.theme) return;
    const snapshot = cloneTheme(this.theme);
    const current = this.history[this.historyIndex];
    if (current && JSON.stringify(current) === JSON.stringify(snapshot)) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.dirty = true;
    this.overwriteArmed = false;
    this.refreshHeaderStatus();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    this.theme = cloneTheme(this.history[this.historyIndex]);
    this.dirty = this.historyIndex !== 0;
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.renderContent();
    this.refreshHeaderStatus();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    this.theme = cloneTheme(this.history[this.historyIndex]);
    this.dirty = true;
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.renderContent();
    this.refreshHeaderStatus();
  }

  reset() {
    if (!this.baselineTheme) return;
    this.theme = cloneTheme(this.baselineTheme);
    this.pushHistory();
    if (this.livePreview) this.adapter.applyTheme(this.theme);
    this.render();
  }

  refreshHeaderStatus() {
    const state = this.dirty ? t("appearance.status.modified") : t("appearance.status.ready");
    this.setStatus(state);
  }

  render() {
    if (!this.hosts) return;
    this.renderHeader();
    this.renderToolbar();
    this.renderControls();
    this.renderContent();
  }

  renderHeader() {
    const { headerHost } = this.hosts;
    headerHost.hidden = false;
    headerHost.replaceChildren();
    const header = this.ui.createModuleHeader({ title: t("appearance.title") });
    header.element.classList.add("workspacekit-appearance");
    this.headerStatus = header;
    headerHost.append(header.element);
    this.refreshHeaderStatus();
  }

  renderToolbar() {
    const { toolbarHost } = this.hosts;
    toolbarHost.hidden = false;
    toolbarHost.replaceChildren();

    const search = element(this.document, "input", "workspacekit-appearance-search");
    search.type = "search";
    search.placeholder = t("appearance.search");
    search.value = this.searchQuery;
    search.addEventListener("input", () => {
      this.searchQuery = search.value.trim().toLowerCase();
      this.renderContent();
    });

    const undo = this.ui.createIconButton({ label: t("appearance.undo"), content: "↶", onPress: () => this.undo() });
    const redo = this.ui.createIconButton({ label: t("appearance.redo"), content: "↷", onPress: () => this.redo() });
    const reset = this.ui.createIconButton({ label: t("appearance.reset"), content: "⟲", onPress: () => this.reset() });
    const exportButton = this.ui.createIconButton({ label: t("appearance.export"), content: "⇩", onPress: () => this.theme && downloadTheme(this.theme) });
    const importButton = this.ui.createIconButton({ label: t("appearance.import"), content: "⇧", onPress: () => this.refs.importInput?.click() });

    const row = this.ui.createControlRow({
      leading: search,
      trailing: [undo, redo, reset, importButton, exportButton],
    });
    row.element.classList.add("workspacekit-appearance-toolbar");
    toolbarHost.append(row.element);
  }

  renderControls() {
    const { controlsHost } = this.hosts;
    controlsHost.hidden = false;
    controlsHost.replaceChildren();

    const wrap = element(this.document, "div", "workspacekit-appearance-controls");
    const themeLabel = element(this.document, "label", "workspacekit-appearance-control-label");
    themeLabel.append(element(this.document, "span", "", t("appearance.themeSource")));
    const select = element(this.document, "select", "workspacekit-appearance-select");
    const current = element(this.document, "option", "", t("appearance.currentRuntime"));
    current.value = "";
    select.append(current);
    for (const item of this.bundledThemes) {
      const option = element(this.document, "option", "", item.name || item.id);
      option.value = item.file;
      if (item.file === this.sourceFile) option.selected = true;
      select.append(option);
    }
    select.addEventListener("change", () => {
      if (!select.value) {
        const captured = this.adapter.captureSnapshot();
        captured.name = t("appearance.currentRuntime");
        this.setTheme(captured, { baseline: true, apply: false });
        this.render();
        return;
      }
      void this.loadBundledTheme(select.value);
    });
    themeLabel.append(select);

    const fileLabel = element(this.document, "label", "workspacekit-appearance-control-label");
    fileLabel.append(element(this.document, "span", "", t("appearance.fileName")));
    const fileInput = element(this.document, "input", "workspacekit-appearance-input");
    fileInput.type = "text";
    fileInput.value = this.fileStem;
    fileInput.addEventListener("change", () => {
      this.fileStem = normalizedStem(fileInput.value, this.theme?.id || "wk-theme");
      fileInput.value = this.fileStem;
      this.overwriteArmed = false;
    });
    fileLabel.append(fileInput);

    const right = element(this.document, "div", "workspacekit-appearance-field-editor");
    const live = element(this.document, "label", "workspacekit-appearance-live");
    const liveInput = this.document.createElement("input");
    liveInput.type = "checkbox";
    liveInput.checked = this.livePreview;
    liveInput.addEventListener("change", () => {
      this.livePreview = liveInput.checked;
      if (this.livePreview && this.theme) this.adapter.applyTheme(this.theme);
      if (!this.livePreview && this.runtimeSnapshot) this.adapter.applyTheme(this.runtimeSnapshot);
    });
    live.append(liveInput, element(this.document, "span", "", t("appearance.livePreview")));
    const save = this.ui.createButton({ label: t("appearance.save"), content: t("appearance.save"), onPress: () => void this.saveTheme() });
    right.append(live);
    if (this.legacyThemeCount > 0) {
      const migrate = this.ui.createButton({
        label: t("appearance.migrateLegacy", { count: this.legacyThemeCount }),
        content: t("appearance.migrateLegacyShort"),
        onPress: () => void this.migrateLegacyThemes(),
      });
      right.append(migrate);
    }
    right.append(save);

    const importInput = element(this.document, "input", "workspacekit-appearance-file-input");
    importInput.type = "file";
    importInput.accept = ".json,application/json";
    importInput.addEventListener("change", () => void this.importTheme(importInput.files?.[0]));
    this.refs.importInput = importInput;

    wrap.append(themeLabel, fileLabel, right, importInput);
    controlsHost.append(wrap);
  }

  renderContent() {
    const { contentHost } = this.hosts ?? {};
    if (!contentHost) return;
    contentHost.hidden = false;
    contentHost.replaceChildren();
    const root = element(this.document, "div", "workspacekit-appearance workspacekit-appearance-content");
    root.append(this.renderReferenceSection());

    if (!this.theme) {
      root.append(element(this.document, "div", "workspacekit-appearance-empty", t("appearance.noTheme")));
      contentHost.append(root);
      return;
    }

    const grouped = new Map();
    for (const [section, values] of Object.entries(this.theme.colors ?? {})) {
      if (!values || typeof values !== "object") continue;
      for (const [key, value] of Object.entries(values)) {
        const meta = inferFieldMeta(section, key, value);
        if (this.searchQuery && !fieldSearchText(section, key, meta).includes(this.searchQuery)) continue;
        const groupId = meta.group || "other";
        const items = grouped.get(groupId) ?? [];
        items.push({ section, key, value, meta });
        grouped.set(groupId, items);
      }
    }

    const groups = [...grouped.entries()].sort((left, right) =>
      (GROUP_ORDER.get(left[0]) ?? 999) - (GROUP_ORDER.get(right[0]) ?? 999));
    if (!groups.length) {
      root.append(element(this.document, "div", "workspacekit-appearance-empty", t("appearance.noMatches")));
    }
    for (const [groupId, items] of groups) {
      const grid = element(this.document, "div", "workspacekit-appearance-field-grid");
      for (const item of items) grid.append(this.renderField(item));
      const section = this.ui.createDisclosureSection({
        title: groupLabel(groupId),
        description: groupDescription(groupId),
        open: groupId !== "other",
        content: grid,
      });
      root.append(section.element);
    }
    contentHost.append(root);
  }

  renderField({ section, key, value, meta }) {
    const path = `${section}.${key}`;
    const row = element(this.document, "div", "workspacekit-appearance-field");
    if (path === this.activeColorTarget) row.classList.add("is-active-color");
    const copy = element(this.document, "div", "workspacekit-appearance-field-copy");
    const label = element(this.document, "div", "workspacekit-appearance-field-name", meta.label || key);
    label.title = meta.description || key;
    const keyNode = element(this.document, "div", "workspacekit-appearance-field-key", key);
    copy.append(label, keyNode);
    const editor = element(this.document, "div", "workspacekit-appearance-field-editor");

    if (meta.type === "color") {
      const parsed = parseCssColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
      const picker = element(this.document, "input", "workspacekit-appearance-color");
      picker.type = "color";
      picker.value = rgbToHex(parsed);
      const text = element(this.document, "input", "workspacekit-appearance-input workspacekit-appearance-value");
      text.type = "text";
      text.value = String(value ?? "");
      const activate = () => {
        this.activeColorTarget = path;
        row.classList.add("is-active-color");
      };
      picker.addEventListener("focus", activate);
      text.addEventListener("focus", activate);
      picker.addEventListener("input", () => {
        const old = parseCssColor(getThemeValue(this.theme, section, key)) ?? { a: 1 };
        const next = parseCssColor(picker.value);
        next.a = old.a;
        const formatted = formatCssColor(next, next.a >= 0.999);
        text.value = formatted;
        this.applyField(section, key, formatted, { commit: false });
      });
      picker.addEventListener("change", () => this.pushHistory());
      text.addEventListener("change", () => {
        const parsedText = parseCssColor(text.value);
        if (!parsedText) {
          text.value = String(getThemeValue(this.theme, section, key) ?? "");
          return;
        }
        const formatted = formatCssColor(parsedText, parsedText.a >= 0.999);
        picker.value = rgbToHex(parsedText);
        text.value = formatted;
        this.applyField(section, key, formatted);
      });
      editor.append(picker, text);
    } else if (meta.type === "number") {
      const input = element(this.document, "input", "workspacekit-appearance-input workspacekit-appearance-number");
      input.type = "number";
      input.min = String(meta.min ?? -9999);
      input.max = String(meta.max ?? 9999);
      input.step = String(meta.step ?? 1);
      input.value = String(value ?? 0);
      input.addEventListener("change", () => {
        const numeric = Number(input.value);
        if (!Number.isFinite(numeric)) return;
        this.applyField(section, key, numeric);
      });
      editor.append(input);
    } else if (meta.type === "select") {
      const select = element(this.document, "select", "workspacekit-appearance-select");
      for (const optionSpec of meta.options ?? []) {
        const option = element(this.document, "option", "", optionSpec.label ?? optionSpec.value);
        option.value = String(optionSpec.value);
        option.selected = String(value) === String(optionSpec.value);
        select.append(option);
      }
      select.addEventListener("change", () => {
        const sample = meta.options?.find((item) => String(item.value) === select.value)?.value;
        this.applyField(section, key, sample ?? select.value);
      });
      editor.append(select);
    } else {
      const input = element(this.document, "input", "workspacekit-appearance-input workspacekit-appearance-value");
      input.type = "text";
      input.value = String(value ?? "");
      input.addEventListener("change", () => this.applyField(section, key, input.value));
      editor.append(input);
    }

    row.append(copy, editor);
    return row;
  }

  applyField(section, key, value, { commit = true } = {}) {
    if (!this.theme) return;
    setThemeValue(this.theme, section, key, value);
    this.dirty = true;
    if (this.livePreview) this.adapter.applyField(section, key, value);
    if (commit) this.pushHistory();
    else this.refreshHeaderStatus();
  }

  renderReferenceSection() {
    const actions = [];
    const uploadInput = element(this.document, "input", "workspacekit-appearance-file-input");
    uploadInput.type = "file";
    uploadInput.accept = "image/*";
    uploadInput.addEventListener("change", () => void this.loadReferenceImage(uploadInput.files?.[0]));
    const browse = this.ui.createButton({ label: t("appearance.referenceBrowse"), content: t("appearance.referenceBrowse"), onPress: () => uploadInput.click() });
    actions.push(browse);
    const section = this.ui.createSection({
      title: t("appearance.referenceTitle"),
      description: t("appearance.referenceHelp"),
      actions,
    });
    const body = element(this.document, "div", "workspacekit-appearance-reference");
    if (this.referenceImage) {
      const preview = element(this.document, "img", "workspacekit-appearance-reference-preview");
      preview.src = this.referenceImage.src;
      preview.alt = t("appearance.referenceTitle");
      body.append(preview);
    } else {
      body.append(element(this.document, "div", "workspacekit-appearance-empty", t("appearance.referenceEmpty")));
    }
    const palette = element(this.document, "div", "workspacekit-appearance-palette");
    for (const color of this.referencePalette) {
      const swatch = element(this.document, "button", "workspacekit-appearance-swatch");
      swatch.type = "button";
      swatch.style.background = color;
      swatch.title = color;
      swatch.setAttribute("aria-label", color);
      swatch.addEventListener("click", () => this.applyPaletteColor(color));
      palette.append(swatch);
    }
    body.append(palette, uploadInput);
    section.element.append(body);
    return section.element;
  }

  async loadReferenceImage(file) {
    if (!file || !file.type?.startsWith("image/")) return;
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.referenceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.src = this.referenceUrl;
    if (typeof image.decode === "function") {
      try {
        await image.decode();
      } catch {
        // Fall through to the naturalWidth check below. Some browsers reject
        // decode() for images they can still render after the load event.
        await new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = resolve;
          image.onerror = resolve;
        });
      }
    } else {
      await new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        image.onload = resolve;
        image.onerror = resolve;
      });
    }
    if (!image.naturalWidth) {
      this.setStatus(t("appearance.referenceFailed"));
      return;
    }
    this.referenceImage = image;
    this.referencePalette = extractReferencePalette(image);
    this.renderContent();
    this.setStatus(t("appearance.referenceReady", { count: this.referencePalette.length }));
  }

  applyPaletteColor(color) {
    if (!this.activeColorTarget || !this.theme) {
      this.setStatus(t("appearance.pickTarget"));
      return;
    }
    const [section, ...rest] = this.activeColorTarget.split(".");
    const key = rest.join(".");
    const old = parseCssColor(getThemeValue(this.theme, section, key)) ?? { a: 1 };
    const next = parseCssColor(color);
    if (!next) return;
    next.a = old.a;
    this.applyField(section, key, formatCssColor(next, next.a >= 0.999));
    this.renderContent();
  }

  async loadLegacyStatus() {
    try {
      const response = await fetch("/workspacekit-theme/legacy-status", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) return;
      const next = Math.max(0, Number(result.count) || 0);
      if (next !== this.legacyThemeCount) {
        this.legacyThemeCount = next;
        if (this.hosts) this.renderControls();
      }
    } catch (error) {
      console.debug("[WorkspaceKit Appearance] Legacy theme status unavailable", error);
    }
  }

  async migrateLegacyThemes() {
    try {
      const response = await fetch("/workspacekit-theme/migrate-legacy", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || response.statusText);
      const migrated = Array.isArray(result.migrated) ? result.migrated.length : 0;
      const skipped = Array.isArray(result.skipped) ? result.skipped.length : 0;
      await this.loadManifest();
      await this.loadLegacyStatus();
      this.setStatus(t("appearance.migrateLegacyDone", { migrated, skipped }));
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Legacy theme migration failed", error);
      this.setStatus(t("appearance.migrateLegacyFailed"));
    }
  }

  async loadManifest() {
    try {
      const response = await fetch(new URL("./themes/manifest.json", import.meta.url), { cache: "no-store" });
      if (!response.ok) throw new Error(response.statusText);
      const manifest = await response.json();
      this.bundledThemes = (manifest.groups ?? []).flatMap((group) =>
        (group.items ?? []).map((item) => ({ ...item, groupId: group.id, groupName: group.name })));
      this.renderControls();
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Theme manifest failed to load", error);
      this.setStatus(t("appearance.manifestFailed"));
    }
  }

  async loadBundledTheme(file) {
    try {
      const response = await fetch(new URL(file, import.meta.url), { cache: "no-store" });
      if (!response.ok) throw new Error(response.statusText);
      const theme = validateThemeDocument(await response.json(), getLocale().startsWith("zh") ? "zh" : "en");
      this.setTheme(theme, { baseline: true, sourceFile: file });
      this.render();
      this.setStatus(t("appearance.status.loaded", { name: theme.name }));
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Theme load failed", file, error);
      this.setStatus(t("appearance.loadFailed"));
    }
  }

  async importTheme(file) {
    if (!file) return;
    try {
      const theme = validateThemeDocument(JSON.parse(await file.text()), getLocale().startsWith("zh") ? "zh" : "en");
      this.setTheme(theme, { baseline: true, sourceFile: "" });
      this.fileStem = normalizedStem(file.name, theme.id);
      this.render();
      this.setStatus(t("appearance.status.loaded", { name: theme.name }));
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Theme import failed", error);
      this.setStatus(t("appearance.importFailed"));
    }
  }

  async saveTheme() {
    if (!this.theme) return;
    this.theme.name = String(this.theme.name || this.fileStem || "WorkspaceKit Theme").trim();
    this.theme.id = String(this.theme.id || this.fileStem).trim();
    const payload = {
      fileName: normalizedStem(this.fileStem, this.theme.id),
      theme: this.theme,
      overwrite: this.overwriteArmed,
    };
    try {
      const response = await fetch("/workspacekit-theme/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409 && !this.overwriteArmed) {
        this.overwriteArmed = true;
        this.setStatus(t("appearance.overwriteArmed"));
        return;
      }
      if (!response.ok || result.ok === false) throw new Error(result.error || response.statusText);
      this.sourceFile = result.file || `themes/wk/${payload.fileName}.json`;
      this.fileStem = payload.fileName;
      this.overwriteArmed = true;
      this.baselineTheme = cloneTheme(this.theme);
      this.history = [cloneTheme(this.theme)];
      this.historyIndex = 0;
      this.dirty = false;
      await this.loadManifest();
      this.render();
      this.setStatus(t("appearance.saved"));
    } catch (error) {
      console.warn("[WorkspaceKit Appearance] Theme save failed", error);
      this.setStatus(t("appearance.saveFailed", { message: error?.message ?? String(error) }));
    }
  }
}
