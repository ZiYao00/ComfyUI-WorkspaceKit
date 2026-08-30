// WorkspaceKit command / keyboard-binding policy.
//
// This module is deliberately DOM- and ComfyUI-runtime-free. It owns stable
// command ids, default bindings, persistence, event matching, and conflict
// classification. entry.js decides how a command executes and how confirmation
// dialogs are presented.

export const WORKSPACE_COMMAND = Object.freeze({
  OPEN_WORKFLOWS: "workspace.openWorkflows",
  OPEN_NODES: "workspace.openNodes",
  OPEN_TEMPLATES: "workspace.openTemplates",
  OPEN_LAYOUT: "workspace.openLayout",
  OPEN_THEME: "workspace.openTheme",
  SAVE_TEMPLATE: "template.saveSelection",
  CREATE_GROUP: "group.create",
  UNGROUP: "group.ungroup",
});

export const COMMAND_BINDINGS_STORAGE_KEY = "workspace2.shortcuts.commandBindings.v1";
export const COMMAND_BINDINGS_VERSION = 1;

const combo = (code, key, modifiers = {}) => Object.freeze({
  code,
  key,
  ctrl: Boolean(modifiers.ctrl),
  alt: Boolean(modifiers.alt),
  shift: Boolean(modifiers.shift),
  meta: Boolean(modifiers.meta),
});

export const COMMAND_BINDING_DEFINITIONS = Object.freeze([
  Object.freeze({
    commandId: WORKSPACE_COMMAND.OPEN_WORKFLOWS,
    group: "panels",
    labelKey: "settings.shortcuts.commands.openWorkflows",
    defaultCombo: combo("Digit1", "1", { shift: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.OPEN_NODES,
    group: "panels",
    labelKey: "settings.shortcuts.commands.openNodes",
    defaultCombo: combo("Digit2", "2", { shift: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.OPEN_TEMPLATES,
    group: "panels",
    labelKey: "settings.shortcuts.commands.openTemplates",
    defaultCombo: combo("Digit3", "3", { shift: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.OPEN_LAYOUT,
    group: "panels",
    labelKey: "settings.shortcuts.commands.openLayout",
    defaultCombo: combo("Digit4", "4", { shift: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.OPEN_THEME,
    group: "panels",
    labelKey: "settings.shortcuts.commands.openTheme",
    defaultCombo: combo("Digit5", "5", { shift: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.SAVE_TEMPLATE,
    group: "actions",
    labelKey: "settings.shortcuts.commands.saveTemplate",
    defaultCombo: combo("KeyC", "c", { alt: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.CREATE_GROUP,
    group: "actions",
    labelKey: "settings.shortcuts.commands.createGroup",
    defaultCombo: combo("KeyG", "g", { ctrl: true }),
  }),
  Object.freeze({
    commandId: WORKSPACE_COMMAND.UNGROUP,
    group: "actions",
    labelKey: "settings.shortcuts.commands.ungroup",
    defaultCombo: combo("KeyG", "g", { shift: true }),
  }),
]);

const DEFINITION_BY_ID = new Map(COMMAND_BINDING_DEFINITIONS.map((definition) => [definition.commandId, definition]));
const LEGACY_ENABLED_KEYS = Object.freeze({
  [WORKSPACE_COMMAND.OPEN_WORKFLOWS]: "workspace2.shortcuts.modules.workflows.enabled",
  [WORKSPACE_COMMAND.OPEN_NODES]: "workspace2.shortcuts.modules.nodes.enabled",
  [WORKSPACE_COMMAND.OPEN_TEMPLATES]: "workspace2.shortcuts.modules.templates.enabled",
  [WORKSPACE_COMMAND.CREATE_GROUP]: "workspace2.canvasGroups.ctrlGCreate",
});

// Common ComfyUI shortcuts are used only for conflict messaging. Runtime
// handling remains WorkspaceKit-owned once the user explicitly accepts a
// conflict. Keep this list conservative and limited to stable/documented keys.
export const COMFY_CORE_SHORTCUT_HINTS = Object.freeze([
  [combo("Enter", "Enter", { ctrl: true }), "ComfyUI：加入生成队列"],
  [combo("Enter", "Enter", { ctrl: true, shift: true }), "ComfyUI：优先加入生成队列"],
  [combo("Enter", "Enter", { ctrl: true, alt: true }), "ComfyUI：取消当前生成"],
  [combo("KeyZ", "z", { ctrl: true }), "ComfyUI：撤销"],
  [combo("KeyY", "y", { ctrl: true }), "ComfyUI：重做"],
  [combo("KeyS", "s", { ctrl: true }), "ComfyUI：保存工作流"],
  [combo("KeyO", "o", { ctrl: true }), "ComfyUI：打开工作流"],
  [combo("KeyA", "a", { ctrl: true }), "ComfyUI：全选节点"],
  [combo("KeyC", "c", { alt: true }), "ComfyUI：折叠 / 展开选中节点"],
  [combo("KeyM", "m", { ctrl: true }), "ComfyUI：静音 / 取消静音节点"],
  [combo("KeyB", "b", { ctrl: true }), "ComfyUI：旁路 / 取消旁路节点"],
  [combo("Backspace", "Backspace", { ctrl: true }), "ComfyUI：清空工作流"],
  [combo("KeyC", "c", { ctrl: true }), "ComfyUI：复制"],
  [combo("KeyV", "v", { ctrl: true }), "ComfyUI：粘贴"],
  [combo("KeyV", "v", { ctrl: true, shift: true }), "ComfyUI：带外部连接粘贴"],
  [combo("KeyD", "d", { ctrl: true }), "ComfyUI：加载默认工作流"],
  [combo("KeyG", "g", { ctrl: true }), "ComfyUI：创建原生编组"],
  [combo("KeyP", "p"), "ComfyUI：固定 / 取消固定节点"],
  [combo("KeyQ", "q"), "ComfyUI：显示 / 隐藏队列"],
  [combo("KeyH", "h"), "ComfyUI：显示 / 隐藏历史"],
  [combo("KeyR", "r"), "ComfyUI：刷新画布"],
  [combo("KeyF", "f"), "ComfyUI：显示 / 隐藏菜单"],
  [combo("Period", "."), "ComfyUI：适配选择范围"],
  [combo("Delete", "Delete"), "ComfyUI：删除选中对象"],
  [combo("Backspace", "Backspace"), "ComfyUI：删除选中对象"],
]);

const HARD_RESERVED_SIGNATURES = new Map([
  ["C---|KeyW", "browser-close-tab"],
  ["C---|KeyT", "browser-new-tab"],
  ["C-S-|KeyT", "browser-reopen-tab"],
  ["C---|KeyN", "browser-new-window"],
  ["C---|KeyL", "browser-location"],
  ["---M|KeyW", "browser-close-tab"],
  ["--SM|KeyT", "browser-reopen-tab"],
  ["---M|KeyT", "browser-new-tab"],
  ["---M|KeyN", "browser-new-window"],
  ["---M|KeyL", "browser-location"],
  ["-A--|F4", "system-close-window"],
]);

function cloneCombo(value) {
  return value ? { ...value } : null;
}

export function commandBindingDefinition(commandId) {
  return DEFINITION_BY_ID.get(String(commandId || "")) || null;
}

export function defaultCommandBindings() {
  return Object.fromEntries(COMMAND_BINDING_DEFINITIONS.map((definition) => [
    definition.commandId,
    cloneCombo(definition.defaultCombo),
  ]));
}

export function normalizeKeyCombo(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const code = String(candidate.code || "").trim();
  const key = String(candidate.key || "").trim();
  if (!code && !key) return null;
  return {
    code: code || key,
    key: key || code,
    ctrl: Boolean(candidate.ctrl),
    alt: Boolean(candidate.alt),
    shift: Boolean(candidate.shift),
    meta: Boolean(candidate.meta),
  };
}

export function keyComboFromEvent(event) {
  if (!event) return null;
  const code = String(event.code || "").trim();
  const key = String(event.key || "").trim();
  if (!code && !key) return null;
  if (["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(code)) {
    return null;
  }
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return null;
  return normalizeKeyCombo({
    code: code || key,
    key: key.length === 1 ? key.toLowerCase() : key,
    ctrl: Boolean(event.ctrlKey),
    alt: Boolean(event.altKey),
    shift: Boolean(event.shiftKey),
    meta: Boolean(event.metaKey),
  });
}

export function keyComboSignature(candidate) {
  const value = normalizeKeyCombo(candidate);
  if (!value) return "";
  const modifiers = `${value.ctrl ? "C" : "-"}${value.alt ? "A" : "-"}${value.shift ? "S" : "-"}${value.meta ? "M" : "-"}`;
  return `${modifiers}|${value.code || value.key}`;
}

export function keyComboSemanticSignature(candidate) {
  const value = normalizeKeyCombo(candidate);
  if (!value) return "";
  const modifiers = `${value.ctrl || value.meta ? "C" : "-"}${value.alt ? "A" : "-"}${value.shift ? "S" : "-"}`;
  return `${modifiers}|${String(value.key || value.code).toLowerCase()}`;
}

function displayKey(value) {
  const code = String(value?.code || "");
  if (/^Digit\d$/.test(code)) return code.slice(-1);
  if (/^Key[A-Z]$/.test(code)) return code.slice(-1);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(-1)}`;
  const names = {
    Space: "Space",
    Escape: "Esc",
    Backspace: "Backspace",
    Delete: "Delete",
    Enter: "Enter",
    Tab: "Tab",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Period: ".",
    Comma: ",",
    Minus: "-",
    Equal: "+",
  };
  return names[code] || String(value?.key || code || "").toUpperCase();
}

export function formatKeyCombo(candidate, { isMac = false } = {}) {
  const value = normalizeKeyCombo(candidate);
  if (!value) return "";
  const parts = [];
  if (value.ctrl) parts.push(isMac ? "Ctrl" : "Ctrl");
  if (value.meta) parts.push(isMac ? "Cmd" : "Meta");
  if (value.alt) parts.push(isMac ? "Option" : "Alt");
  if (value.shift) parts.push("Shift");
  parts.push(displayKey(value));
  return parts.filter(Boolean).join(" + ");
}

export function matchesKeyCombo(event, candidate) {
  const value = normalizeKeyCombo(candidate);
  if (!event || !value) return false;
  if (Boolean(event.ctrlKey) !== value.ctrl) return false;
  if (Boolean(event.altKey) !== value.alt) return false;
  if (Boolean(event.shiftKey) !== value.shift) return false;
  if (Boolean(event.metaKey) !== value.meta) return false;
  const code = String(event.code || "");
  if (value.code && code) return value.code === code;
  const key = String(event.key || "");
  return String(value.key || "").toLowerCase() === key.toLowerCase();
}

export function normalizeCommandBindings(candidate, { applyLegacy = false, storage = null } = {}) {
  const defaults = defaultCommandBindings();
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const rawBindings = source.bindings && typeof source.bindings === "object" ? source.bindings : source;
  const normalized = {};
  for (const definition of COMMAND_BINDING_DEFINITIONS) {
    if (Object.prototype.hasOwnProperty.call(rawBindings, definition.commandId)) {
      const raw = rawBindings[definition.commandId];
      normalized[definition.commandId] = raw === null ? null : normalizeKeyCombo(raw);
    } else {
      normalized[definition.commandId] = cloneCombo(defaults[definition.commandId]);
    }
  }
  if (applyLegacy && storage) {
    for (const [commandId, key] of Object.entries(LEGACY_ENABLED_KEYS)) {
      if (storage.getItem?.(key) === "0") normalized[commandId] = null;
    }
  }
  return normalized;
}

export function readCommandBindings(storage = globalThis.localStorage) {
  const raw = storage?.getItem?.(COMMAND_BINDINGS_STORAGE_KEY);
  if (!raw) return normalizeCommandBindings(null, { applyLegacy: true, storage });
  try {
    const parsed = JSON.parse(raw);
    return normalizeCommandBindings(parsed);
  } catch {
    return normalizeCommandBindings(null, { applyLegacy: true, storage });
  }
}

export function writeCommandBindings(bindings, storage = globalThis.localStorage) {
  const normalized = normalizeCommandBindings(bindings);
  storage?.setItem?.(COMMAND_BINDINGS_STORAGE_KEY, JSON.stringify({
    version: COMMAND_BINDINGS_VERSION,
    bindings: normalized,
  }));
  return normalized;
}

export function setCommandBinding(commandId, nextCombo, storage = globalThis.localStorage) {
  const id = String(commandId || "");
  if (!DEFINITION_BY_ID.has(id)) return readCommandBindings(storage);
  const bindings = readCommandBindings(storage);
  bindings[id] = nextCombo === null ? null : normalizeKeyCombo(nextCombo);
  return writeCommandBindings(bindings, storage);
}

export function resetCommandBindings(storage = globalThis.localStorage) {
  return writeCommandBindings(defaultCommandBindings(), storage);
}

export function resolveBoundCommand(event, bindings = null) {
  const resolved = bindings || readCommandBindings();
  for (const definition of COMMAND_BINDING_DEFINITIONS) {
    const binding = resolved[definition.commandId];
    if (binding && matchesKeyCombo(event, binding)) return definition.commandId;
  }
  return null;
}

export function findInternalBindingConflict(commandId, candidate, bindings) {
  const signature = keyComboSignature(candidate);
  if (!signature) return null;
  const source = bindings || {};
  for (const definition of COMMAND_BINDING_DEFINITIONS) {
    if (definition.commandId === commandId) continue;
    if (keyComboSignature(source[definition.commandId]) === signature) return definition.commandId;
  }
  return null;
}

export function browserReservedShortcut(candidate) {
  const signature = keyComboSignature(candidate);
  const reason = HARD_RESERVED_SIGNATURES.get(signature);
  return reason ? { signature, reason } : null;
}

function externalComboToSemanticSignature(comboValue) {
  if (!comboValue || typeof comboValue !== "object") return "";
  const key = String(comboValue.key || "").toLowerCase();
  if (!key) return "";
  const modifiers = `${comboValue.ctrl || comboValue.meta ? "C" : "-"}${comboValue.alt ? "A" : "-"}${comboValue.shift ? "S" : "-"}`;
  return `${modifiers}|${key}`;
}

export function comfyKeybindingConflict(candidate, {
  newBindings = [],
  unsetBindings = [],
  coreHints = COMFY_CORE_SHORTCUT_HINTS,
} = {}) {
  const semantic = keyComboSemanticSignature(candidate);
  if (!semantic) return null;

  const unset = new Set((Array.isArray(unsetBindings) ? unsetBindings : []).map((item) => externalComboToSemanticSignature(item?.combo)));
  const custom = (Array.isArray(newBindings) ? newBindings : []).find((item) => externalComboToSemanticSignature(item?.combo) === semantic);
  if (custom) {
    return {
      source: "comfy-user",
      commandId: String(custom.commandId || ""),
      label: String(custom.commandId || "ComfyUI 自定义快捷键"),
    };
  }

  if (unset.has(semantic)) return null;
  for (const [coreCombo, label] of coreHints) {
    if (keyComboSemanticSignature(coreCombo) === semantic) {
      return { source: "comfy-core", commandId: "", label };
    }
  }
  return null;
}
