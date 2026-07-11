import hashlib
import json
from pathlib import Path


NODE_INDEX_SCHEMA_VERSION = 1


def build_node_index_signature(comfy_path, registered_node_types):
    custom_nodes_root = Path(comfy_path) / "custom_nodes"
    plugins = []
    if custom_nodes_root.is_dir():
        for path in custom_nodes_root.iterdir():
            if not path.is_dir() or path.name.startswith(".") or path.name == "__pycache__":
                continue
            try:
                modified_ns = path.stat().st_mtime_ns
            except OSError:
                modified_ns = 0
            plugins.append((path.name.casefold(), modified_ns))

    node_types = sorted({
        str(node_type)
        for node_type in registered_node_types
        if str(node_type).strip()
    })
    payload = {
        "schemaVersion": NODE_INDEX_SCHEMA_VERSION,
        "plugins": sorted(plugins),
        "nodeTypes": node_types,
    }
    encoded = json.dumps(
        payload,
        ensure_ascii=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return {
        "schema_version": NODE_INDEX_SCHEMA_VERSION,
        "signature": hashlib.sha256(encoded).hexdigest(),
        "plugin_count": len(plugins),
        "registered_node_count": len(node_types),
    }
