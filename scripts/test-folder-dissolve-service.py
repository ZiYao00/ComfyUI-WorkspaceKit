"""Regression checks for safe workflow-folder dissolution."""

import importlib.util
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = "workspacekit_test_package"
spec = importlib.util.spec_from_file_location(
    f"{PACKAGE_NAME}.service.folder_dissolve_service",
    ROOT / "service" / "folder_dissolve_service.py",
    submodule_search_locations=[str(ROOT / "service")],
)
module = importlib.util.module_from_spec(spec)
module.__package__ = f"{PACKAGE_NAME}.service"
import sys
import types

package = types.ModuleType(PACKAGE_NAME)
package.__path__ = [str(ROOT)]
service_package = types.ModuleType(f"{PACKAGE_NAME}.service")
service_package.__path__ = [str(ROOT / "service")]
sys.modules[PACKAGE_NAME] = package
sys.modules[f"{PACKAGE_NAME}.service"] = service_package
spec.loader.exec_module(module)


def write_meta(comfy, data):
    path = comfy / "user" / "default" / "comfyui-workspace2" / "folder_meta.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


with tempfile.TemporaryDirectory() as temp:
    base = Path(temp)
    workflows = base / "workflows"
    comfy = base / "comfy"
    (workflows / "A" / "B" / "C").mkdir(parents=True)
    (workflows / "A" / "B" / "one.json").write_text("{}", encoding="utf-8")
    (workflows / "A" / "B" / "C" / "two.json").write_text("{}", encoding="utf-8")
    write_meta(comfy, {"A/B": {"icon": "old"}, "A/B/C": {"color": "#fff"}, "other": {"icon": "keep"}})

    result = module.dissolve_folder(workflows, comfy, "A/B")
    assert result["moved_count"] == 2
    assert not (workflows / "A" / "B").exists()
    assert (workflows / "A" / "one.json").exists()
    assert (workflows / "A" / "C" / "two.json").exists()
    assert result["folder_meta"] == {"A/C": {"color": "#fff"}, "other": {"icon": "keep"}}

    (workflows / "D" / "E").mkdir(parents=True)
    (workflows / "D" / "E" / "same.json").write_text("{}", encoding="utf-8")
    (workflows / "D" / "same.json").write_text("{}", encoding="utf-8")
    try:
        module.dissolve_folder(workflows, comfy, "D/E")
        raise AssertionError("Expected target collision")
    except FileExistsError:
        pass
    assert (workflows / "D" / "E" / "same.json").exists()
    assert (workflows / "D" / "same.json").exists()

    (workflows / "empty").mkdir()
    try:
        module.dissolve_folder(workflows, comfy, "empty")
        raise AssertionError("Expected empty-folder dissolve rejection")
    except ValueError as exc:
        assert "empty" in str(exc).lower()
    assert (workflows / "empty").exists()

print("folder dissolve service contract passed")
