import { createHash } from "node:crypto";

export const PANEL_UI_TEMPLATE_EXPORT_FILES = Object.freeze([
  "blueprint.js",
  "compatibility.js",
  "icons.js",
  "primitives.js",
  "styles.js",
  "template.js",
  "version.js",
]);

// Line endings are normalized before hashing. Git's autocrlf rewrites the WK
// source checkout to CRLF on Windows while the exported Vendor copies stay LF,
// which made every file report a hash mismatch even when the code was byte-for-
// byte equivalent. A permanently red verification is worse than none: it hides
// the real content divergence it exists to catch (a missing Vendor helper once
// stopped Theme from loading at all). Browsers do not care which terminator a
// module uses, so equivalence here is the property worth asserting.
function normalizeForHash(content) {
  return String(content).replace(/\r\n/g, "\n");
}

export function sha256(content) {
  return createHash("sha256").update(normalizeForHash(content)).digest("hex");
}

export function createPanelUiTemplateManifest({ uiVersion, sourceCommit, files }) {
  const inventory = {};
  for (const name of [...Object.keys(files)].sort()) {
    inventory[name] = sha256(files[name]);
  }
  return Object.freeze({
    schemaVersion: 1,
    uiVersion,
    sourceCommit,
    files: inventory,
  });
}

export function verifyPanelUiTemplateManifest(manifest, { uiVersion, files }) {
  const expected = createPanelUiTemplateManifest({
    uiVersion,
    sourceCommit: manifest?.sourceCommit || "",
    files,
  });
  const errors = [];
  if (!manifest || manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1");
  if (manifest?.uiVersion !== uiVersion) errors.push(`uiVersion expected ${uiVersion}, got ${manifest?.uiVersion ?? "missing"}`);
  for (const [name, hash] of Object.entries(expected.files)) {
    if (manifest?.files?.[name] !== hash) errors.push(`hash mismatch: ${name}`);
  }
  for (const name of Object.keys(manifest?.files || {})) {
    if (!(name in expected.files)) errors.push(`unexpected manifest file: ${name}`);
  }
  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors) });
}
