import json
from pathlib import Path


def folder_meta_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "folder_meta.json"


def _clean_meta_key(key):
    """Normalize a folder key to the panel's plain relative form.

    Earlier builds dissolved a top-level folder into keys like "./child"
    because `Path("A").parent` is `Path(".")`. Those keys can still be sitting
    in a user's saved metadata, where they match no folder and so hide the
    icon and colour they were meant to carry. Strip the prefix on every read
    and write so stored data heals itself without a migration step.
    """
    clean = key.strip().replace("\\", "/")
    while clean.startswith("./"):
        clean = clean[2:]
    clean = clean.strip("/")
    # A lone "." is the same artifact without a suffix: it named no folder, so
    # it must not survive as an entry either.
    return "" if clean == "." else clean


def normalize_folder_meta(data):
    if not isinstance(data, dict):
        return {}
    exact = {}
    healed = {}
    for key, value in data.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            continue
        clean_key = _clean_meta_key(key)
        if not clean_key:
            continue
        icon = str(value.get("icon") or "").strip()
        color = str(value.get("color") or "").strip()
        entry = {}
        if icon:
            entry["icon"] = icon
        if color:
            entry["color"] = color
        if not entry:
            continue
        # Keep healed "./child" keys apart from keys that were already correct.
        # Merging in dict order would let a stale duplicate win at random.
        target = exact if clean_key == key.strip().replace("\\", "/") else healed
        target.setdefault(clean_key, entry)
    for clean_key, entry in healed.items():
        exact.setdefault(clean_key, entry)
    return exact


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
