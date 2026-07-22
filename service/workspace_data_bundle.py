"""Portable WorkspaceKit data bundles with backup-first import semantics.

Workflow files and the derived node-object cache are intentionally excluded:
they are either user documents or reproducible cache, not WorkspaceKit data.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from .folder_meta_service import folder_meta_path, normalize_folder_meta, read_folder_meta
from .node_library_service import node_library_path, normalize_node_library, read_node_library
from .template_library_service import template_library_path, normalize_template_library, read_template_library


BUNDLE_SCHEMA_VERSION = 1


def _now_stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def _atomic_write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    temporary.replace(path)


def data_backup_directory(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "data_backups"


def _clean_settings(data):
    return data if isinstance(data, dict) else {}


def build_workspace_data_bundle(comfy_path, workspace_settings):
    return {
        "schema_version": BUNDLE_SCHEMA_VERSION,
        "kind": "comfyui-workspacekit-data",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "node_library": read_node_library(comfy_path),
            "template_library": read_template_library(comfy_path),
            "folder_meta": read_folder_meta(comfy_path),
            "workspace_settings": _clean_settings(workspace_settings),
        },
    }


def normalize_workspace_data_bundle(bundle):
    if not isinstance(bundle, dict):
        raise ValueError("WorkspaceKit data bundle must be a JSON object")
    if int(bundle.get("schema_version") or 0) != BUNDLE_SCHEMA_VERSION:
        raise ValueError("Unsupported WorkspaceKit data bundle version")
    data = bundle.get("data")
    if not isinstance(data, dict):
        raise ValueError("WorkspaceKit data bundle is missing data")
    return {
        "schema_version": BUNDLE_SCHEMA_VERSION,
        "kind": "comfyui-workspacekit-data",
        "exported_at": str(bundle.get("exported_at") or ""),
        "data": {
            "node_library": normalize_node_library(data.get("node_library")),
            "template_library": normalize_template_library(data.get("template_library")),
            "folder_meta": normalize_folder_meta(data.get("folder_meta")),
            "workspace_settings": _clean_settings(data.get("workspace_settings")),
        },
    }


def import_workspace_data_bundle(comfy_path, workspace_settings_path, bundle, browser_preferences):
    """Back up all replaced plugin data before atomically replacing each file."""
    normalized = normalize_workspace_data_bundle(bundle)
    current = build_workspace_data_bundle(comfy_path, _read_json_object(workspace_settings_path))
    backup = {
        **current,
        "kind": "comfyui-workspacekit-data-backup",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "browser_preferences": browser_preferences if isinstance(browser_preferences, dict) else {},
    }
    backup_path = data_backup_directory(comfy_path) / f"workspacekit-before-import-{_now_stamp()}.json"
    _atomic_write_json(backup_path, backup)

    data = normalized["data"]
    _atomic_write_json(node_library_path(comfy_path), data["node_library"])
    _atomic_write_json(template_library_path(comfy_path), data["template_library"])
    _atomic_write_json(folder_meta_path(comfy_path), data["folder_meta"])
    _atomic_write_json(workspace_settings_path, data["workspace_settings"])
    return {"bundle": normalized, "backup_path": str(backup_path)}


def _read_json_object(path):
    path = Path(path)
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as file:
            return _clean_settings(json.load(file))
    except (OSError, ValueError, json.JSONDecodeError):
        return {}
