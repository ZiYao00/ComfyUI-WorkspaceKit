import json
import time
from pathlib import Path


def default_template_library():
    return {
        "version": 2,
        "groups": [],
        "templates": [],
        "trash": [],
        "settings": {},
    }


def template_library_path(comfy_path):
    return Path(comfy_path) / "user" / "default" / "comfyui-workspace2" / "template_library.json"


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


def _normalize_template(template, index, group_ids):
    template_id = str(template.get("id") or f"template-{index}-{int(time.time() * 1000)}").strip()
    group_id = str(template.get("groupId") or "").strip()
    if group_id and group_id not in group_ids:
        group_id = ""
    nodes = template.get("nodes")
    links = template.get("links")
    bounds = template.get("bounds")
    created_at = int(template.get("createdAt") or int(time.time() * 1000))
    updated_at = int(template.get("updatedAt") or created_at)
    return {
        "id": template_id,
        "name": str(template.get("name") or template_id).strip(),
        "groupId": group_id,
        "order": int(template.get("order") or index),
        "nodes": nodes if isinstance(nodes, list) else [],
        "links": links if isinstance(links, list) else [],
        "bounds": bounds if isinstance(bounds, dict) else {},
        "createdAt": created_at,
        "updatedAt": updated_at,
        "useCount": int(template.get("useCount") or 0),
        "lastUsed": int(template.get("lastUsed") or 0),
        "source": str(template.get("source") or "workspace2"),
    }


def _normalize_trash_entry(entry, index, group_ids):
    if not isinstance(entry, dict):
        return None
    template_data = entry.get("template")
    if not isinstance(template_data, dict):
        return None
    template = _normalize_template(template_data, index, group_ids)
    if not template.get("id"):
        return None
    return {
        "id": str(entry.get("id") or template["id"]).strip(),
        "template": template,
        "originalGroupId": str(entry.get("originalGroupId") or template.get("groupId") or "").strip(),
        "deletedAt": int(entry.get("deletedAt") or int(time.time() * 1000)),
    }


def normalize_template_library(data):
    library = default_template_library()
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
            if not normalized["id"] or normalized["id"] in seen:
                continue
            seen.add(normalized["id"])
            normalized_groups.append(normalized)
        library["groups"] = normalized_groups

    group_ids = {group["id"] for group in library["groups"]}
    for group in library["groups"]:
        if group["parentId"] == group["id"] or group["parentId"] not in group_ids:
            group["parentId"] = ""

    templates = data.get("templates")
    if isinstance(templates, list):
        normalized_templates = []
        seen = set()
        for index, template in enumerate(templates):
            if not isinstance(template, dict):
                continue
            normalized = _normalize_template(template, index, group_ids)
            if not normalized["id"] or normalized["id"] in seen:
                continue
            seen.add(normalized["id"])
            normalized_templates.append(normalized)
        library["templates"] = normalized_templates

    trash = data.get("trash")
    if isinstance(trash, list):
        normalized_trash = []
        seen = set()
        for index, entry in enumerate(trash):
            normalized = _normalize_trash_entry(entry, index, group_ids)
            if normalized is None or normalized["id"] in seen:
                continue
            seen.add(normalized["id"])
            normalized_trash.append(normalized)
        library["trash"] = normalized_trash

    if isinstance(data.get("settings"), dict):
        library["settings"].update(data["settings"])

    return library


def read_template_library(comfy_path):
    path = template_library_path(comfy_path)
    if not path.exists():
        return default_template_library()
    with path.open("r", encoding="utf-8") as file:
        return normalize_template_library(json.load(file))


def write_template_library(comfy_path, data):
    library = normalize_template_library(data)
    path = template_library_path(comfy_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(library, file, ensure_ascii=False, indent=2)
    return library
