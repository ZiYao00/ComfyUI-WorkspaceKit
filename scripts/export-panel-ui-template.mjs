import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPanelUiTemplateManifest, PANEL_UI_TEMPLATE_EXPORT_FILES, verifyPanelUiTemplateManifest } from "./lib/panel-ui-template-export.mjs";
import { PANEL_UI_TEMPLATE_VERSION } from "../entry/ui-kit/version.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceKitRoot = resolve(scriptDirectory, "..");
const targetArgument = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const targetRoot = resolve(targetArgument || resolve(workspaceKitRoot, "..", "ComfyUI-WorkspaceKit-Layout"));
const destination = resolve(targetRoot, "web", "vendor", "workspacekit-ui");
const verifyOnly = process.argv.includes("--verify");

function sourceCommit() {
  try {
    return execFileSync("git", ["-C", workspaceKitRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

async function sourceFiles() {
  const files = {};
  for (const name of PANEL_UI_TEMPLATE_EXPORT_FILES) {
    files[name] = await readFile(resolve(workspaceKitRoot, "entry", "ui-kit", name));
  }
  return files;
}

async function readDestinationFiles() {
  const files = {};
  for (const name of PANEL_UI_TEMPLATE_EXPORT_FILES) {
    files[name] = await readFile(resolve(destination, name));
  }
  return files;
}

const sources = await sourceFiles();
const manifest = createPanelUiTemplateManifest({
  uiVersion: PANEL_UI_TEMPLATE_VERSION,
  sourceCommit: sourceCommit(),
  files: sources,
});

if (!verifyOnly) {
  await mkdir(destination, { recursive: true });
  for (const [name, content] of Object.entries(sources)) {
    await writeFile(resolve(destination, name), content);
  }
  await writeFile(resolve(destination, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Exported Panel UI Template ${PANEL_UI_TEMPLATE_VERSION} to ${destination}`);
}

try {
  const actualManifest = JSON.parse(await readFile(resolve(destination, "manifest.json"), "utf8"));
  const actualFiles = await readDestinationFiles();
  const destinationResult = verifyPanelUiTemplateManifest(actualManifest, {
    uiVersion: PANEL_UI_TEMPLATE_VERSION,
    files: actualFiles,
  });
  const sourceResult = verifyPanelUiTemplateManifest(actualManifest, {
    uiVersion: PANEL_UI_TEMPLATE_VERSION,
    files: sources,
  });
  const errors = [...destinationResult.errors, ...sourceResult.errors];
  if (errors.length) throw new Error([...new Set(errors)].join("; "));
  console.log(`Verified Panel UI Template Vendor runtime at ${destination}`);
} catch (error) {
  console.error(`Panel UI Template export verification failed: ${error.message}`);
  process.exitCode = 1;
}
