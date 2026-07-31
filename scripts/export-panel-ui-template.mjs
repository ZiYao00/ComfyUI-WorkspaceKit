import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPanelUiTemplateManifest, PANEL_UI_TEMPLATE_EXPORT_FILES, verifyPanelUiTemplateManifest } from "./lib/panel-ui-template-export.mjs";
import { PANEL_UI_TEMPLATE_VERSION } from "../entry/ui-kit/version.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceKitRoot = resolve(scriptDirectory, "..");
const consumersManifestPath = resolve(scriptDirectory, "ui-template-consumers.json");

const positionalArguments = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const verifyOnly = process.argv.includes("--verify");
const exportAll = process.argv.includes("--all");

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

async function readDestinationFiles(destination) {
  const files = {};
  for (const name of PANEL_UI_TEMPLATE_EXPORT_FILES) {
    files[name] = await readFile(resolve(destination, name));
  }
  return files;
}

// Resolve the list of consumers to process. A positional path argument targets a
// single consumer (back-compatible with the original one-target usage). `--all`
// reads the tracked consumer manifest. With neither, default to the historical
// sibling Layout path so existing muscle memory keeps working.
async function resolveConsumers() {
  if (exportAll) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(consumersManifestPath, "utf8"));
    } catch (error) {
      throw new Error(`cannot read consumer manifest ${consumersManifestPath}: ${error.message}`);
    }
    const consumers = Array.isArray(manifest?.consumers) ? manifest.consumers : [];
    if (!consumers.length) throw new Error(`consumer manifest ${consumersManifestPath} lists no consumers`);
    return consumers.map((consumer) => ({
      name: String(consumer?.name || consumer?.path || "consumer"),
      root: resolve(workspaceKitRoot, consumer.path),
      // Most plugins bundle under web/vendor; some (e.g. Theme) use js/vendor.
      vendorDir: String(consumer?.vendorDir || "web/vendor/workspacekit-ui"),
    }));
  }

  const targetRoot = resolve(
    positionalArguments[0] || resolve(workspaceKitRoot, "..", "ComfyUI-WorkspaceKit-Layout"),
  );
  return [{
    name: positionalArguments[0] ? targetRoot : "Layout",
    root: targetRoot,
    vendorDir: "web/vendor/workspacekit-ui",
  }];
}

const sources = await sourceFiles();
const manifest = createPanelUiTemplateManifest({
  uiVersion: PANEL_UI_TEMPLATE_VERSION,
  sourceCommit: sourceCommit(),
  files: sources,
});

const consumers = await resolveConsumers();
let failed = false;

for (const consumer of consumers) {
  const destination = resolve(consumer.root, consumer.vendorDir);

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
    const actualFiles = await readDestinationFiles(destination);
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
    console.error(`Panel UI Template export verification failed for ${consumer.name}: ${error.message}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
