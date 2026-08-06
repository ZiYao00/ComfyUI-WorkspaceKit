"""Regression contract for atomic, concurrent WorkspaceKit node-library saves."""
import json
import sys
import tempfile
import types
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
package = types.ModuleType("workspacekit_test")
package.__path__ = [str(REPO_ROOT)]
sys.modules["workspacekit_test"] = package

from workspacekit_test.service.node_library_service import (
    node_library_path,
    read_node_library,
    write_node_library,
)


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)

    def save(index):
        return write_node_library(root, {
            "groups": [{"id": "default", "name": "Default"}],
            "favorites": [{"type": f"Node{index}", "title": f"Node {index}"}],
        })

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(save, range(48)))

    path = node_library_path(root)
    raw = path.read_text(encoding="utf-8")
    decoded = json.loads(raw)
    loaded = read_node_library(root)
    assert isinstance(decoded, dict)
    assert len(loaded["favorites"]) == 1
    assert not list(path.parent.glob(f".{path.stem}-*.tmp"))

print("node library atomic-write contract passed")
