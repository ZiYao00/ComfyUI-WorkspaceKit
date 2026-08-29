"""Constrained, local-only storage for user-created WorkspaceKit theme files.

The Appearance editor must never receive a generic filesystem path from the
browser. This module accepts only a safe filename stem and can write only to
``entry/appearance/themes/wk``. It is intentionally independent from ComfyUI
so validation and rollback behaviour can be tested without starting the server.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


MAX_THEME_BYTES = 1_000_000
MAX_REQUEST_BYTES = MAX_THEME_BYTES + 16_384
_STEM_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,79}$")
_REQUIRED_COLOR_SECTIONS = ("node_slot", "litegraph_base", "comfy_base")


@dataclass
class ThemeStorageError(Exception):
    """A request error that can be returned to the browser without internals."""

    message: str
    status: int = 400

    def __str__(self) -> str:
        return self.message


class ThemeStorage:
    """Write validated themes into the plugin-owned WK theme collection only."""

    def __init__(self, package_root: Path | None = None) -> None:
        self.package_root = (package_root or Path(__file__).resolve().parents[1]).resolve()
        self.themes_root = self.package_root / "entry" / "appearance" / "themes"
        self.wk_dir = self.themes_root / "wk"
        # Keep recoverable backups outside WEB_DIRECTORY (``entry/``), so the
        # extension's static-file handler cannot expose them to the browser.
        self.backup_dir = self.package_root / ".theme-backups"
        self.manifest_path = self.themes_root / "manifest.json"
        legacy_root = self.package_root.parent / "ComfyUI-WorkspaceKit-Theme"
        # The former Theme runtime saved into js/themes/wk. An early project
        # layout also carried a root themes/wk collection, so both exact paths
        # are recognized without scanning unrelated sibling plugins.
        self.legacy_wk_dirs = (
            legacy_root / "js" / "themes" / "wk",
            legacy_root / "themes" / "wk",
        )

    def save(self, payload: Any) -> dict[str, Any]:
        """Validate and atomically persist one WK theme plus its manifest entry."""
        if not isinstance(payload, dict):
            raise ThemeStorageError("Request body must be a JSON object.")

        stem = self._validate_stem(payload.get("fileName"))
        theme = self._validate_theme(payload.get("theme"))
        overwrite = bool(payload.get("overwrite", False))
        theme_bytes = self._encode_json(theme)
        target = self._target_for_stem(stem)

        if target.exists() and not overwrite:
            raise ThemeStorageError("A theme file with this name already exists.", 409)

        manifest = self._read_manifest()
        manifest_bytes = self._encode_json(manifest)
        item = {
            "id": theme["id"],
            "name": theme["name"],
            "file": f"themes/wk/{stem}.json",
        }
        self._upsert_manifest_item(manifest, item)
        updated_manifest_bytes = self._encode_json(manifest)

        old_theme_bytes = target.read_bytes() if target.exists() else None
        self.wk_dir.mkdir(parents=True, exist_ok=True)
        if old_theme_bytes is not None:
            self._write_backup(stem, old_theme_bytes)

        try:
            self._atomic_write(target, theme_bytes)
            self._atomic_write(self.manifest_path, updated_manifest_bytes)
        except Exception:
            self._restore_after_failed_save(target, old_theme_bytes, manifest_bytes)
            raise

        return {
            "created": old_theme_bytes is None,
            "file": item["file"],
            "theme": item,
        }

    def legacy_status(self) -> dict[str, Any]:
        """Report exact legacy Theme files that are safe and not yet migrated."""
        candidates = self._legacy_candidates()
        return {
            "available": bool(candidates),
            "count": len(candidates),
            "files": [item["fileName"] for item in candidates],
        }

    def migrate_legacy(self) -> dict[str, Any]:
        """Copy valid legacy user themes into WorkspaceKit without deleting sources."""
        migrated: list[str] = []
        skipped: list[str] = []
        errors: list[str] = []
        for item in self._legacy_candidates(include_existing=True):
            stem = item["fileName"]
            target = self._target_for_stem(stem)
            if target.exists():
                skipped.append(stem)
                continue
            try:
                self.save({"fileName": stem, "theme": item["theme"], "overwrite": False})
                migrated.append(stem)
            except ThemeStorageError as exc:
                skipped.append(stem)
                errors.append(f"{stem}: {exc.message}")
            except Exception:
                errors.append(f"{stem}: migration failed")
        return {
            "migrated": migrated,
            "skipped": skipped,
            "errors": errors,
            "sourcePreserved": True,
        }

    def _legacy_candidates(self, *, include_existing: bool = False) -> list[dict[str, Any]]:
        by_stem: dict[str, dict[str, Any]] = {}
        for directory in self.legacy_wk_dirs:
            if not directory.is_dir():
                continue
            try:
                entries = sorted(directory.iterdir(), key=lambda path: path.name.casefold())
            except OSError:
                continue
            for source in entries:
                if not source.is_file() or source.suffix.lower() != ".json":
                    continue
                stem = source.stem.lower()
                if not _STEM_PATTERN.fullmatch(stem) or stem in by_stem:
                    continue
                try:
                    raw = source.read_bytes()
                    if len(raw) > MAX_THEME_BYTES:
                        continue
                    theme = self._validate_theme(json.loads(raw.decode("utf-8")))
                    target = self._target_for_stem(stem)
                except (OSError, UnicodeDecodeError, json.JSONDecodeError, ThemeStorageError):
                    continue
                if target.exists() and not include_existing:
                    continue
                by_stem[stem] = {"fileName": stem, "theme": theme}
        return list(by_stem.values())

    def _validate_stem(self, value: Any) -> str:
        if (
            not isinstance(value, str)
            or value.endswith(".json")
            or not _STEM_PATTERN.fullmatch(value)
        ):
            raise ThemeStorageError(
                "File name must use 1-80 lowercase letters, numbers, dots, dashes, or underscores."
            )
        return value

    def _validate_theme(self, value: Any) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ThemeStorageError("Theme must be a JSON object.")
        theme = dict(value)
        for key in ("id", "name"):
            text = theme.get(key)
            if not isinstance(text, str) or not text.strip() or len(text) > 120:
                raise ThemeStorageError(
                    f"Theme {key} must be a non-empty string up to 120 characters."
                )
            theme[key] = text.strip()
        colors = theme.get("colors")
        if not isinstance(colors, dict):
            raise ThemeStorageError("Theme colors must be an object.")
        for section in _REQUIRED_COLOR_SECTIONS:
            if not isinstance(colors.get(section), dict):
                raise ThemeStorageError(f"Theme colors.{section} must be an object.")
        return theme

    def _target_for_stem(self, stem: str) -> Path:
        target = (self.wk_dir / f"{stem}.json").resolve()
        if target.parent != self.wk_dir.resolve():
            raise ThemeStorageError("Theme file path is not allowed.")
        return target

    def _read_manifest(self) -> dict[str, Any]:
        try:
            manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise ThemeStorageError("Theme manifest cannot be read safely.", 500) from error
        if not isinstance(manifest, dict) or not isinstance(manifest.get("groups"), list):
            raise ThemeStorageError("Theme manifest has an invalid structure.", 500)
        return manifest

    def _upsert_manifest_item(self, manifest: dict[str, Any], item: dict[str, str]) -> None:
        group = next(
            (entry for entry in manifest["groups"] if entry.get("id") == "wk"),
            None,
        )
        if not isinstance(group, dict) or not isinstance(group.get("items"), list):
            raise ThemeStorageError("WK theme collection is unavailable.", 500)

        for existing in group["items"]:
            if not isinstance(existing, dict):
                raise ThemeStorageError("WK theme collection is invalid.", 500)
            if existing.get("id") == item["id"] and existing.get("file") != item["file"]:
                raise ThemeStorageError("Another WK theme already uses this theme ID.", 409)

        for index, existing in enumerate(group["items"]):
            if isinstance(existing, dict) and existing.get("file") == item["file"]:
                group["items"][index] = item
                return
        group["items"].append(item)

    def _write_backup(self, stem: str, content: bytes) -> None:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
        self._atomic_write(self.backup_dir / f"{timestamp}-{stem}.json", content)

    def _restore_after_failed_save(
        self,
        target: Path,
        old_theme_bytes: bytes | None,
        manifest_bytes: bytes,
    ) -> None:
        try:
            if old_theme_bytes is None:
                if target.exists():
                    target.unlink()
            else:
                self._atomic_write(target, old_theme_bytes)
            self._atomic_write(self.manifest_path, manifest_bytes)
        except OSError:
            # The original write failure is the useful error for callers. A
            # server-side log will still contain it; do not leak filesystem
            # paths to the browser.
            pass

    @staticmethod
    def _encode_json(value: Any) -> bytes:
        encoded = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        if len(encoded) > MAX_THEME_BYTES:
            raise ThemeStorageError("Theme file exceeds the 1 MB limit.", 413)
        return encoded

    @staticmethod
    def _atomic_write(path: Path, content: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{path.name}.",
            suffix=".tmp",
            dir=path.parent,
        )
        temporary_path = Path(temporary_name)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, path)
        finally:
            if temporary_path.exists():
                temporary_path.unlink()
