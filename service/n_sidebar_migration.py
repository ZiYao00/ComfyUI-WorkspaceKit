import json
import sys
from pathlib import Path


def candidate_n_sidebar_settings_paths(comfy_path, workspace_path):
    comfy_path = Path(comfy_path)
    workspace_path = Path(workspace_path)
    shared_root = Path(sys.executable).resolve().parent.parent
    candidates = [
        workspace_path.parent / "ComfyUI-N-Sidebar" / "app" / "settings.json",
        comfy_path / "custom_nodes" / "ComfyUI-N-Sidebar" / "app" / "settings.json",
        comfy_path.parent / "custom_nodes.backup" / "ComfyUI-N-Sidebar" / "app" / "settings.json",
        shared_root / "ComfyUI" / "custom_nodes" / "ComfyUI-N-Sidebar" / "app" / "settings.json",
        shared_root / "ComfyUI" / "custom_nodes.backup" / "ComfyUI-N-Sidebar" / "app" / "settings.json",
    ]
    seen = set()
    unique = []
    for path in candidates:
        resolved = str(path.resolve())
        if resolved not in seen:
            seen.add(resolved)
            unique.append(path)
    return unique


def _json_value(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, type(fallback)) else fallback
        except Exception:
            return fallback
    return fallback


def read_n_sidebar_settings(paths):
    for path in paths:
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        if isinstance(data, dict):
            return path, data
    return None, {}


def build_n_sidebar_preview(settings, source_path=""):
    pinned = _json_value(settings.get("sb_pinnedItems"), [])
    category_map = _json_value(settings.get("sb_categoryNodeMap"), {})
    if not isinstance(pinned, list):
        pinned = []
    if not isinstance(category_map, dict):
        category_map = {}

    pinned = [str(item) for item in pinned if str(item).strip()]
    groups = []
    grouped_nodes = set()
    for index, (name, nodes) in enumerate(category_map.items()):
        node_list = [str(item) for item in _json_value(nodes, []) if str(item).strip()]
        grouped_nodes.update(node_list)
        groups.append(
            {
                "name": str(name),
                "order": index,
                "nodes": node_list,
            }
        )

    all_nodes = []
    seen = set()
    for node_type in [*pinned, *grouped_nodes]:
        if node_type in seen:
            continue
        seen.add(node_type)
        all_nodes.append(node_type)

    return {
        "found": bool(source_path),
        "sourcePath": str(source_path) if source_path else "",
        "pinned": pinned,
        "groups": groups,
        "nodes": all_nodes,
        "summary": {
            "pinnedCount": len(pinned),
            "groupCount": len(groups),
            "nodeCount": len(all_nodes),
        },
    }
