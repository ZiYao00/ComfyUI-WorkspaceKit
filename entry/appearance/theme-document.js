function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function validateThemeDocument(input, locale = "zh") {
  const messages = locale === "en"
    ? {
      invalid: "Theme file must be a JSON object.",
      missingColors: "Theme file is missing the colors object.",
      invalidSection: (section) => `colors.${section} must be an object.`,
    }
    : {
      invalid: "主题文件必须是一个 JSON 对象。",
      missingColors: "主题文件缺少 colors 对象。",
      invalidSection: (section) => `colors.${section} 必须是对象。`,
    };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(messages.invalid);
  }
  if (!input.colors || typeof input.colors !== "object") {
    throw new Error(messages.missingColors);
  }

  const theme = clone(input);
  theme.id = String(theme.id || `workspacekit-theme-${Date.now()}`);
  theme.name = String(theme.name || theme.id);
  theme.colors.node_slot ??= {};
  theme.colors.litegraph_base ??= {};
  theme.colors.comfy_base ??= {};

  for (const section of ["node_slot", "litegraph_base", "comfy_base"]) {
    if (typeof theme.colors[section] !== "object" || Array.isArray(theme.colors[section])) {
      throw new Error(messages.invalidSection(section));
    }
  }

  return theme;
}

export function setThemeValue(theme, section, key, value) {
  theme.colors ??= {};
  theme.colors[section] ??= {};
  theme.colors[section][key] = value;
}

export function getThemeValue(theme, section, key) {
  return theme?.colors?.[section]?.[key];
}

export function cloneTheme(theme) {
  return clone(theme);
}

export function downloadTheme(theme) {
  const safeId = String(theme?.id || "workspacekit-theme")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "workspacekit-theme";
  const blob = new Blob([`${JSON.stringify(theme, null, 2)}\n`], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeId}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
