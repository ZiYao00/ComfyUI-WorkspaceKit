import json
from pathlib import Path


FAVORITE_KEYWORDS = ("favorite", "favourite", "bookmark", "pinned")
NODE_KEYWORDS = ("node", "nodes", "nodelibrary", "node_library")
MAX_JSON_BYTES = 1024 * 1024


def _looks_like_node_list(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value[:50])


def _is_folder_marker(value):
    return isinstance(value, str) and value.strip().endswith("/")


def _extract_node_list(value):
    if not _looks_like_node_list(value):
        return []
    seen = set()
    nodes = []
    for item in value:
        node_type = str(item).strip()
        if not node_type or _is_folder_marker(node_type) or node_type in seen:
            continue
        seen.add(node_type)
        nodes.append(node_type)
    return nodes


def _extract_path_groups(value):
    if not _looks_like_node_list(value):
        return []
    folder_names = []
    folder_set = set()
    for item in value:
        marker = str(item).strip()
        if not _is_folder_marker(marker):
            continue
        if marker in folder_set:
            continue
        folder_set.add(marker)
        folder_names.append(marker)

    groups = []
    for folder_name in folder_names:
        nodes = []
        seen = set()
        for item in value:
            node_type = str(item).strip()
            if not node_type.startswith(folder_name) or _is_folder_marker(node_type):
                continue
            if node_type in seen:
                continue
            seen.add(node_type)
            nodes.append(node_type)
        if nodes:
            groups.append({
                "name": folder_name.strip("/"),
                "path": folder_name,
                "nodes": nodes,
                "count": len(nodes),
            })
    return groups


def _extract_group_candidates(value):
    groups = []

    def add_group(name, nodes):
        clean_name = str(name or "").strip()
        clean_nodes = _extract_node_list(nodes)
        if not clean_name or not clean_nodes:
            return
        groups.append({
            "name": clean_name,
            "nodes": clean_nodes,
            "count": len(clean_nodes),
        })

    if isinstance(value, dict):
        for key, child in value.items():
            if _looks_like_node_list(child):
                add_group(key, child)
            elif isinstance(child, dict):
                for nodes_key in ("nodes", "items", "bookmarks", "favorites", "children"):
                    if nodes_key in child and _looks_like_node_list(child[nodes_key]):
                        add_group(child.get("name") or child.get("title") or key, child[nodes_key])
                        break
    elif isinstance(value, list):
        groups.extend(_extract_path_groups(value))
        for index, child in enumerate(value[:200]):
            if not isinstance(child, dict):
                continue
            for nodes_key in ("nodes", "items", "bookmarks", "favorites", "children"):
                if nodes_key in child and _looks_like_node_list(child[nodes_key]):
                    add_group(child.get("name") or child.get("title") or f"group-{index}", child[nodes_key])
                    break

    return groups[:200]


def _summarize_value(value):
    if isinstance(value, list):
        strings = [item for item in value if isinstance(item, str)]
        nodes = _extract_node_list(value)
        groups = _extract_group_candidates(value)
        return {
            "type": "list",
            "count": len(value),
            "stringCount": len(strings),
            "sample": strings[:20],
            "looksLikeNodeList": _looks_like_node_list(value),
            "nodes": nodes,
            "groups": groups,
        }
    if isinstance(value, dict):
        groups = _extract_group_candidates(value)
        return {
            "type": "dict",
            "keys": list(value.keys())[:30],
            "count": len(value),
            "groups": groups,
        }
    return {
        "type": type(value).__name__,
        "repr": str(value)[:160],
    }


def _is_candidate_key(key):
    lowered = str(key).lower().replace(".", "").replace("_", "")
    return any(word in lowered for word in FAVORITE_KEYWORDS) and any(word in lowered for word in NODE_KEYWORDS)


def _walk_candidates(value, path=""):
    matches = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            if _is_candidate_key(child_path) or _is_candidate_key(key):
                matches.append({
                    "key": child_path,
                    "summary": _summarize_value(child),
                })
                continue
            matches.extend(_walk_candidates(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value[:50]):
            if isinstance(child, (dict, list)):
                matches.extend(_walk_candidates(child, f"{path}[{index}]"))
    return matches


def _scan_json_file(path):
    if path.stat().st_size > MAX_JSON_BYTES:
        return None
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except Exception:
        return None
    matches = _walk_candidates(data)
    if not matches:
        return None
    return {
        "path": str(path),
        "size": path.stat().st_size,
        "matches": matches[:20],
    }


def probe_official_favorites(comfy_path):
    user_default = Path(comfy_path) / "user" / "default"
    checked_paths = []
    file_matches = []
    if user_default.exists():
        for path in user_default.rglob("*.json"):
            if "workflows" in path.parts or "trash" in path.parts or "comfyui-workspace2" in path.parts:
                continue
            if ".workspace2-backup-" in path.name:
                continue
            checked_paths.append(str(path))
            result = _scan_json_file(path)
            if result:
                file_matches.append(result)

    return {
        "found": bool(file_matches),
        "source": "user/default json scan",
        "checkedPaths": checked_paths,
        "files": file_matches,
        "summary": {
            "checkedFileCount": len(checked_paths),
            "matchedFileCount": len(file_matches),
            "candidateCount": sum(len(item.get("matches", [])) for item in file_matches),
        },
    }
