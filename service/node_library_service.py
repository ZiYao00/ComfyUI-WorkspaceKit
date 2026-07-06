import json
import time
from pathlib import Path


DEFAULT_GROUP_ID = "default"


def default_node_library():
    return {
        "version": 2,
        "groups": [
            {
                "id": DEFAULT_GROUP_ID,
                "name": "Default favorites",
                "order": 0,
                "collapsed": False,
            }
        ],
        "favorites": [],
        "settings": {
            "searchMode": "basic",
            "enablePinyinSearch": False,
            "enableFuzzySearch": False,
            "sortMode": "manual",
            "showOriginalCategory": True,
            "showNodeType": True,
        },
        "migration": {
            "nSidebarImported": False,
            "nSidebarImportedAt": 0,
        },
    }


def node_library_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "node_library.json"


def _normalize_group(group, index):
    group_id = str(group.get("id") or f"group-{index}").strip()
    name = str(group.get("name") or group_id).strip()
    return {
        "id": group_id,
        "name": name,
        "parentId": str(group.get("parentId") or "").strip(),
        "order": int(group.get("order") or index),
        "collapsed": bool(group.get("collapsed", False)),
        "icon": str(group.get("icon") or ""),
        "color": str(group.get("color") or ""),
    }


def _normalize_favorite(favorite, index, group_ids):
    node_type = str(favorite.get("type") or "").strip()
    if not node_type:
        return None
    group_id = str(favorite.get("groupId") or DEFAULT_GROUP_ID).strip()
    if group_id not in group_ids:
        group_id = DEFAULT_GROUP_ID
    return {
        "type": node_type,
        "title": str(favorite.get("title") or node_type),
        "alias": str(favorite.get("alias") or ""),
        "groupId": group_id,
        "order": int(favorite.get("order") or index),
        "rating": int(favorite.get("rating") or 0),
        "useCount": int(favorite.get("useCount") or 0),
        "lastUsed": int(favorite.get("lastUsed") or 0),
        "addedAt": int(favorite.get("addedAt") or int(time.time() * 1000)),
        "invalid": bool(favorite.get("invalid", False)),
        "source": str(favorite.get("source") or "manual"),
    }


def normalize_node_library(data):
    library = default_node_library()
    if not isinstance(data, dict):
        return library

    groups = data.get("groups")
    if isinstance(groups, list):
        normalized_groups = []
        seen = set()
        for index, group in enumerate(groups):
            if not isinstance(group, dict):
                continue
            normalized = _normalize_group(group, index)
            if normalized["id"] in seen:
                continue
            seen.add(normalized["id"])
            normalized_groups.append(normalized)
        if DEFAULT_GROUP_ID not in seen:
            normalized_groups.insert(0, library["groups"][0])
        if normalized_groups:
            library["groups"] = normalized_groups

    group_ids = {group["id"] for group in library["groups"]}
    for group in library["groups"]:
        if (
            group["id"] == DEFAULT_GROUP_ID
            or group["parentId"] == group["id"]
            or group["parentId"] not in group_ids
        ):
            group["parentId"] = ""
    favorites = data.get("favorites")
    if isinstance(favorites, list):
        normalized_favorites = []
        seen_types = set()
        for index, favorite in enumerate(favorites):
            if not isinstance(favorite, dict):
                continue
            normalized = _normalize_favorite(favorite, index, group_ids)
            if normalized is None or normalized["type"] in seen_types:
                continue
            seen_types.add(normalized["type"])
            normalized_favorites.append(normalized)
        library["favorites"] = normalized_favorites

    if isinstance(data.get("settings"), dict):
        library["settings"].update(data["settings"])
    if isinstance(data.get("migration"), dict):
        library["migration"].update(data["migration"])

    return library


def read_node_library(comfy_path):
    path = node_library_path(comfy_path)
    if not path.exists():
        return default_node_library()
    with path.open("r", encoding="utf-8") as file:
        return normalize_node_library(json.load(file))


def write_node_library(comfy_path, data):
    library = normalize_node_library(data)
    path = node_library_path(comfy_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(library, file, ensure_ascii=False, indent=2)
    return library
