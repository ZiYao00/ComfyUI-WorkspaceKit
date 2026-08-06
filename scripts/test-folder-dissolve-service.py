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
    (workflows / "D" / "E" / "same.json").write_text("inner", encoding="utf-8")
    (workflows / "D" / "same.json").write_text("outer", encoding="utf-8")
    collided = module.dissolve_folder(workflows, comfy, "D/E", "en-US")
    assert collided["moved_count"] == 1
    assert collided["renamed_count"] == 1
    # The file already in the parent must keep its name and content; only the
    # promoted file is numbered, and its extension stays last.
    assert (workflows / "D" / "same.json").read_text(encoding="utf-8") == "outer"
    assert (workflows / "D" / "same (2).json").read_text(encoding="utf-8") == "inner"
    assert not (workflows / "D" / "E").exists()

    # Chinese locale uses full-width brackets, matching the copy-suffix style.
    # Numbering restarts at 2 because "same（2）" and "same (2)" are different
    # filenames; only an exact match counts as taken.
    (workflows / "D" / "zh").mkdir()
    (workflows / "D" / "zh" / "same.json").write_text("zh", encoding="utf-8")
    zh_result = module.dissolve_folder(workflows, comfy, "D/zh", "zh-CN")
    assert zh_result["renamed_count"] == 1
    assert (workflows / "D" / "same（2）.json").read_text(encoding="utf-8") == "zh"

    # A renamed child folder must carry its whole styled subtree with it.
    (workflows / "F" / "G" / "H" / "I").mkdir(parents=True)
    (workflows / "F" / "G" / "H" / "I" / "deep.json").write_text("{}", encoding="utf-8")
    (workflows / "F" / "H").mkdir()
    (workflows / "F" / "H" / "blocker.json").write_text("{}", encoding="utf-8")
    write_meta(comfy, {"F/G/H": {"icon": "keep-me"}, "F/G/H/I": {"color": "#abc"}})
    nested = module.dissolve_folder(workflows, comfy, "F/G", "en-US")
    assert nested["renamed_count"] == 1
    assert (workflows / "F" / "H (2)" / "I" / "deep.json").exists()
    assert nested["folder_meta"] == {"F/H (2)": {"icon": "keep-me"}, "F/H (2)/I": {"color": "#abc"}}

    # T-046: a top-level dissolve must not produce "./child" metadata keys.
    (workflows / "T1" / "T2" / "T3").mkdir(parents=True)
    (workflows / "T1" / "T2" / "T3" / "leaf.json").write_text("{}", encoding="utf-8")
    write_meta(comfy, {"T1/T2": {"icon": "star"}, "T1/T2/T3": {"color": "#0f0"}})
    top = module.dissolve_folder(workflows, comfy, "T1", "en-US")
    assert top["parent_path"] == "", repr(top["parent_path"])
    assert top["folder_meta"] == {"T2": {"icon": "star"}, "T2/T3": {"color": "#0f0"}}, top["folder_meta"]

    # A child sharing its parent folder's name (A/B/B) must be numbered. The
    # source directory is still on disk while its children are moved, so
    # treating its name as free would make the rename fail outright.
    (workflows / "S" / "S").mkdir(parents=True)
    (workflows / "S" / "S" / "inner.json").write_text("inner", encoding="utf-8")
    (workflows / "S" / "loose.json").write_text("loose", encoding="utf-8")
    same_name = module.dissolve_folder(workflows, comfy, "S", "en-US")
    assert same_name["renamed_count"] == 1, same_name
    assert (workflows / "S (2)" / "inner.json").read_text(encoding="utf-8") == "inner"
    assert (workflows / "loose.json").read_text(encoding="utf-8") == "loose"

    (workflows / "empty").mkdir()
    try:
        module.dissolve_folder(workflows, comfy, "empty")
        raise AssertionError("Expected empty-folder dissolve rejection")
    except ValueError as exc:
        assert "empty" in str(exc).lower()
    assert (workflows / "empty").exists()

    # T-048: flatten promotes files from every depth and removes the subtree.
    (workflows / "P" / "Q" / "R").mkdir(parents=True)
    (workflows / "P" / "Q" / "top.json").write_text("top", encoding="utf-8")
    (workflows / "P" / "Q" / "R" / "deep.json").write_text("deep", encoding="utf-8")
    (workflows / "P" / "Q" / "R" / "top.json").write_text("clash", encoding="utf-8")
    write_meta(comfy, {"P/Q": {"icon": "gone"}, "P/Q/R": {"color": "#f00"}, "P": {"icon": "stay"}})
    flat = module.flatten_folder(workflows, comfy, "P/Q", "en-US")
    assert flat["moved_count"] == 3
    assert flat["renamed_count"] == 1
    assert not (workflows / "P" / "Q").exists()
    assert (workflows / "P" / "deep.json").read_text(encoding="utf-8") == "deep"
    names = sorted(item.name for item in (workflows / "P").iterdir())
    assert names == ["deep.json", "top (2).json", "top.json"], names
    # Every folder under the flattened source is gone, so its styling must go
    # too, or a future folder at the same path would inherit it.
    assert flat["folder_meta"] == {"P": {"icon": "stay"}}, flat["folder_meta"]

    (workflows / "empty2" / "inner").mkdir(parents=True)
    try:
        module.flatten_folder(workflows, comfy, "empty2")
        raise AssertionError("Expected empty-folder flatten rejection")
    except ValueError as exc:
        assert "empty" in str(exc).lower()
    assert (workflows / "empty2" / "inner").exists()

    # A failure after every file has moved is the worst moment for flatten: the
    # subtree directories are gone and the metadata write is mid-flight. All of
    # it must come back.
    (workflows / "R" / "x" / "y").mkdir(parents=True)
    (workflows / "R" / "x" / "one.json").write_text("1", encoding="utf-8")
    (workflows / "R" / "x" / "y" / "two.json").write_text("2", encoding="utf-8")
    write_meta(comfy, {"R/x": {"icon": "i"}, "R/x/y": {"color": "#111"}, "keep": {"icon": "k"}})
    files_before = {
        str(path.relative_to(workflows)).replace("\\", "/"): path.read_text(encoding="utf-8")
        for path in workflows.rglob("*") if path.is_file()
    }
    meta_before = module.read_folder_meta(comfy)
    original_write = module.write_folder_meta
    attempts = []

    def failing_write(comfy_path, data):
        attempts.append(data)
        if len(attempts) == 1:
            raise OSError("simulated metadata write failure")
        return original_write(comfy_path, data)

    module.write_folder_meta = failing_write
    try:
        module.flatten_folder(workflows, comfy, "R/x", "en-US")
        raise AssertionError("Expected the simulated write failure to surface")
    except OSError:
        pass
    finally:
        module.write_folder_meta = original_write
    files_after = {
        str(path.relative_to(workflows)).replace("\\", "/"): path.read_text(encoding="utf-8")
        for path in workflows.rglob("*") if path.is_file()
    }
    assert files_after == files_before, sorted(set(files_before) ^ set(files_after))
    assert module.read_folder_meta(comfy) == meta_before
    assert (workflows / "R" / "x" / "y").is_dir()

print("folder dissolve service contract passed")
