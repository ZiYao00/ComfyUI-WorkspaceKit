"""Service-level contract for WorkspaceKit export/import and auto-backup."""
import json
import sys
import tempfile
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
package = types.ModuleType("workspacekit_test")
package.__path__ = [str(REPO_ROOT)]
sys.modules["workspacekit_test"] = package

from workspacekit_test.service.folder_meta_service import write_folder_meta
from workspacekit_test.service.node_library_service import write_node_library
from workspacekit_test.service.template_library_service import write_template_library
from workspacekit_test.service.workspace_data_bundle import (
    build_workspace_data_bundle,
    import_workspace_data_bundle,
)


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    settings_path = root / "plugin-settings.json"
    write_node_library(root, {
        "groups": [{"id": "default", "name": "Default"}, {"id": "group", "name": "Group"}],
        "favorites": [{"type": "OriginalNode", "groupId": "group"}],
    })
    write_template_library(root, {
        "groups": [{"id": "templates", "name": "Templates"}],
        "templates": [{"id": "template", "name": "Original template", "groupId": "templates", "nodes": [], "links": []}],
        "trash": [{"id": "deleted", "template": {"id": "deleted", "name": "Deleted template", "nodes": [], "links": []}, "deletedAt": 1}],
    })
    write_folder_meta(root, {"folder": {"icon": "pi pi-folder", "color": "#123456"}})
    settings_path.write_text(json.dumps({"workflowsRootMode": "official"}), encoding="utf-8")

    bundle = build_workspace_data_bundle(root, {"workflowsRootMode": "official"})
    assert bundle["schema_version"] == 1
    assert bundle["data"]["node_library"]["favorites"][0]["type"] == "OriginalNode"
    bundle["data"]["node_library"]["favorites"] = [{"type": "ImportedNode"}]

    result = import_workspace_data_bundle(root, settings_path, bundle, {"workspace2.nodes.sort": "alphabetical"})
    backup = Path(result["backup_path"])
    current = json.loads((root / "user/default/comfyui-workspace2/node_library.json").read_text(encoding="utf-8"))
    backed_up = json.loads(backup.read_text(encoding="utf-8"))
    assert backup.exists()
    assert current["favorites"][0]["type"] == "ImportedNode"
    assert backed_up["data"]["node_library"]["favorites"][0]["type"] == "OriginalNode"
    assert backed_up["browser_preferences"]["workspace2.nodes.sort"] == "alphabetical"
    assert backed_up["data"]["template_library"]["trash"][0]["template"]["name"] == "Deleted template"

print("workspace data bundle round-trip passed")
