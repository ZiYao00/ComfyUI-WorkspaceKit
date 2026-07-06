import json
import shutil
from datetime import datetime
from pathlib import Path

from .node_library_service import DEFAULT_GROUP_ID, read_node_library


BOOKMARKS_KEY = "Comfy.NodeLibrary.Bookmarks.V2"
BOOKMARKS_CUSTOMIZATION_KEY = "Comfy.NodeLibrary.BookmarksCustomization"


def official_settings_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfy.settings.json"


def _read_settings(path):
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return data if isinstance(data, dict) else {}


def _backup_settings(path):
    if not path.exists():
        return ""
    backup = path.with_name(
        f"{path.name}.workspace2-official-favorites-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    )
    shutil.copy2(path, backup)
    return str(backup)


def _favorite_title(favorite):
    value = str(favorite.get("type") or favorite.get("title") or "").strip()
    return value


def _official_group_entry(marker, node_type):
    if node_type.startswith(marker):
        return node_type
    return f"{marker}{node_type}"


def build_official_bookmarks_from_workspace2(library):
    groups = {
        str(group.get("id")): group
        for group in library.get("groups", [])
        if isinstance(group, dict)
    }
    grouped = {}
    root = []
    for favorite in sorted(library.get("favorites", []), key=lambda item: int(item.get("order") or 0)):
        if not isinstance(favorite, dict):
            continue
        node_type = _favorite_title(favorite)
        if not node_type:
            continue
        group_id = str(favorite.get("groupId") or DEFAULT_GROUP_ID)
        if group_id == DEFAULT_GROUP_ID or group_id not in groups:
            root.append(node_type)
            continue
        grouped.setdefault(group_id, []).append(node_type)

    bookmarks = []
    seen = set()

    def add(value):
        if not value or value in seen:
            return
        seen.add(value)
        bookmarks.append(value)

    for node_type in root:
        add(node_type)

    ordered_groups = sorted(
        [group for group_id, group in groups.items() if group_id != DEFAULT_GROUP_ID],
        key=lambda group: int(group.get("order") or 0),
    )
    for group in ordered_groups:
        group_id = str(group.get("id"))
        nodes = grouped.get(group_id) or []
        if not nodes:
            continue
        group_name = str(group.get("name") or group_id).strip().strip("/")
        if not group_name:
            continue
        marker = f"{group_name}/"
        add(marker)
        for node_type in nodes:
            add(_official_group_entry(marker, node_type))

    return bookmarks


def write_workspace2_favorites_to_official(comfy_path):
    library = read_node_library(comfy_path)
    bookmarks = build_official_bookmarks_from_workspace2(library)
    settings_path = official_settings_path(comfy_path)
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings = _read_settings(settings_path)
    backup_path = _backup_settings(settings_path)
    settings[BOOKMARKS_KEY] = bookmarks
    if BOOKMARKS_CUSTOMIZATION_KEY not in settings or not isinstance(settings.get(BOOKMARKS_CUSTOMIZATION_KEY), dict):
        settings[BOOKMARKS_CUSTOMIZATION_KEY] = {}
    with settings_path.open("w", encoding="utf-8") as file:
        json.dump(settings, file, ensure_ascii=False, indent=2)
    group_markers = [item for item in bookmarks if isinstance(item, str) and item.endswith("/")]
    return {
        "settingsPath": str(settings_path),
        "backupPath": backup_path,
        "nodeCount": len([item for item in bookmarks if not str(item).endswith("/")]),
        "groupCount": len(group_markers),
        "bookmarkCount": len(bookmarks),
    }
