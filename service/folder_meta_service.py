import json
from pathlib import Path


def folder_meta_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "folder_meta.json"


def normalize_folder_meta(data):
    if not isinstance(data, dict):
        return {}
    result = {}
    for key, value in data.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            continue
        clean_key = key.strip().replace("\\", "/")
        if not clean_key:
            continue
        icon = str(value.get("icon") or "").strip()
        color = str(value.get("color") or "").strip()
        entry = {}
        if icon:
            entry["icon"] = icon
        if color:
            entry["color"] = color
        if entry:
            result[clean_key] = entry
    return result


def read_folder_meta(comfy_path):
    path = folder_meta_path(comfy_path)
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        return normalize_folder_meta(json.load(file))


def write_folder_meta(comfy_path, data):
    meta = normalize_folder_meta(data)
    path = folder_meta_path(comfy_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(meta, file, ensure_ascii=False, indent=2)
    return meta
