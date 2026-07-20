# Release versioning

## One authoritative release version

`pyproject.toml` → `[project].version` is the sole authoritative release
version. It is the value consumed by the Comfy Registry. The backend reads the
same value at startup and serves it through `/workspace2/info`; the Settings
dialog therefore does not carry a separate hard-coded version.

Use semantic versions only:

- `0.2.2` for compatible bug fixes.
- `0.3.0` for compatible user-facing features.
- `1.0.0` for the first stable release.

“Public beta” is a product-channel label, not part of the semantic version.

## Release helper

Before a release, run:

```powershell
python scripts/release_version.py --check
python scripts/release_version.py --set 0.2.3 --date 2026-07-21
```

The update command changes the release source and the two README status lines,
then creates a Changelog placeholder if necessary. Fill in the real Changelog
notes, run tests, commit, push, and only then publish with `comfy node publish`.

`--check` fails if the package version, README status lines, runtime version
loader, or current Changelog heading disagree.

## Independent versions

Do not change these when only the product release changes:

- `schema_version` values for templates, caches, or saved settings: increment
  only when stored-data compatibility changes.
- `apiVersion`: increment only for an incompatible public panel/API contract.
- Calibration or migration versions: increment only when that specific
  migration must run again.
- Build identifiers used for browser cache-busting: rename them as `BUILD_ID`
  where practical; they are not product release versions.
