"""Server-owned workflow favorites for the virtual Browse collection.

Favorites deliberately contain only normalized workflow-relative paths.  They
are not workflow files and they do not create a physical folder, so moving a
workflow remains a normal filesystem operation.  The frontend remaps/removes
these paths through its single workflow path-state transaction after a
successful rename, move, or trash action.
"""
import json
from pathlib import Path


WORKFLOW_FAVORITES_VERSION = 1


def workflow_favorites_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "workflow_favorites.json"


def normalize_workflow_favorites(data):
    """Return the stable on-disk schema, dropping malformed or duplicate paths."""
    raw = data.get("favorites") if isinstance(data, dict) else []
    favorites = []
    seen = set()
    if isinstance(raw, list):
        for value in raw:
            if not isinstance(value, str):
                continue
            path = value.strip().replace("\\", "/").strip("/")
            if not path or path.startswith("../") or "/../" in path or path in seen:
                continue
            favorites.append(path)
            seen.add(path)
    return {"version": WORKFLOW_FAVORITES_VERSION, "favorites": favorites}


def read_workflow_favorites(comfy_path):
    path = workflow_favorites_path(comfy_path)
    if not path.exists():
        return normalize_workflow_favorites({})
    try:
        with path.open("r", encoding="utf-8") as file:
            return normalize_workflow_favorites(json.load(file))
    except (OSError, ValueError, json.JSONDecodeError):
        return normalize_workflow_favorites({})


def write_workflow_favorites(comfy_path, data):
    normalized = normalize_workflow_favorites(data)
    path = workflow_favorites_path(comfy_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as file:
        json.dump(normalized, file, ensure_ascii=False, indent=2)
    temporary.replace(path)
    return normalized
