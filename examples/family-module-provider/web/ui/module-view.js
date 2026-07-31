// The plugin-owned UI. THIS IS THE FILE YOU EDIT to build your panel.
//
// It renders into caller-owned Blueprint slots (Header / Controls / Content)
// using the shared WorkspaceKit Panel UI Template `ui`. The same view is used
// for both the merged (hosted) tab and the standalone fallback, so there is one
// visual source. Do not add a hand-rolled DOM/CSS fallback here — resolve a
// complete UI Template first (host runtime or the bundled Vendor copy).

const STYLE_ID = "example-family-module-style";
const ROOT_CLASS = "example-family-module"; // CHANGE ME: your own scoped prefix

// Install plugin-scoped styles once. Every selector is prefixed with ROOT_CLASS
// so it can never touch WorkspaceKit internals. Prefer the shared `ui` tokens
// (var(--workspacekit-ui-*)) over hardcoded colors so you inherit the theme.
function ensureStyles(document) {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} { display: grid; gap: 10px; }
    .${ROOT_CLASS}-hello { color: var(--workspacekit-ui-muted, #9aa); font-size: 12px; }
  `;
  document.head.append(style);
}

// Guard: the view requires a complete Template with the primitives it uses.
function supportsHostUi(ui) {
  return Boolean(
    ui?.supports?.(1)
    && typeof ui.createModuleHeader === "function"
    && typeof ui.createSection === "function"
    && typeof ui.createButton === "function",
  );
}

/**
 * Render the plugin's Header / Controls / Content regions into caller slots.
 *
 * @returns {() => void} dispose — remove listeners and DOM so switching away
 *   from the tab leaves nothing behind.
 */
export function renderModuleView({
  document = globalThis.document,
  headerHost,
  toolbarHost = null,
  contextHost,
  controlsHost = contextHost,
  contentHost,
  translate,
  ui = null,
}) {
  if (!document?.createElement || !headerHost || !contentHost || !supportsHostUi(ui)) {
    throw new TypeError("Module view requires a complete WorkspaceKit Panel UI Template and Header/Content hosts.");
  }

  ensureStyles(document);

  headerHost.replaceChildren();
  contentHost.replaceChildren();
  // This example has no toolbar/controls band; hide the optional slots rather
  // than rendering a decorative empty divider. Remove these lines when you add
  // a controls row via ui.createControlRow().
  if (toolbarHost) { toolbarHost.replaceChildren(); toolbarHost.hidden = true; }
  if (controlsHost && controlsHost !== contentHost) { controlsHost.replaceChildren(); controlsHost.hidden = true; }

  // --- Header (A: title + status) --------------------------------------------
  const header = ui.createModuleHeader({ title: translate("example.title") });
  headerHost.append(header.element);

  // --- Content (your feature area) -------------------------------------------
  // TODO: Replace everything below with your own UI. This placeholder shows the
  // shared section + button primitives and a click counter.
  const root = document.createElement("div");
  root.className = ROOT_CLASS;

  const section = ui.createSection({
    title: translate("example.section.title"),
    description: translate("example.section.desc"),
  });

  const hello = document.createElement("p");
  hello.className = `${ROOT_CLASS}-hello`;
  let count = 0;
  const renderHello = () => { hello.textContent = translate("example.clicked", { count }); };
  renderHello();

  const onClick = () => { count += 1; renderHello(); };
  const button = ui.createButton({ label: translate("example.button"), onPress: onClick });

  section.element.append(hello, button);
  root.append(section.element);
  contentHost.append(root);

  header.setStatus(translate("example.ready"));

  return () => {
    // ui.createButton attaches its own listener; dropping the DOM releases it.
    headerHost.replaceChildren();
    contentHost.replaceChildren();
    if (toolbarHost) toolbarHost.replaceChildren();
    if (controlsHost && controlsHost !== contentHost) controlsHost.replaceChildren();
  };
}
