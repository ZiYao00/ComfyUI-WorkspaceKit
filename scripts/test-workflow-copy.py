import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from service.workflow_copy_service import copy_workflow_file


with tempfile.TemporaryDirectory() as temporary_directory:
    root = Path(temporary_directory)
    nested = root / "folder"
    nested.mkdir()
    source = nested / "example.json"
    source.write_text(json.dumps({"nodes": [1]}), encoding="utf-8")

    first = copy_workflow_file(root, "folder/example.json", "en-US")
    second = copy_workflow_file(root, "folder/example.json", "en-US")
    third = copy_workflow_file(root, first, "en-US")
    chinese_first = copy_workflow_file(root, "folder/example.json", "zh-CN")
    chinese_second = copy_workflow_file(root, chinese_first, "zh-CN")
    assert first == "folder/example (Copy 1).json"
    assert second == "folder/example (Copy 2).json"
    assert third == "folder/example (Copy 3).json"
    assert chinese_first == "folder/example（副本 1）.json"
    assert chinese_second == "folder/example（副本 2）.json"
    assert (root / first).read_text(encoding="utf-8") == source.read_text(encoding="utf-8")
    assert (root / second).read_text(encoding="utf-8") == source.read_text(encoding="utf-8")

    # Old builds could produce nested suffixes such as "(copy) (copy)".
    # A new copy must normalize that history instead of adding a third suffix.
    legacy = nested / "legacy (copy) (copy).json"
    legacy.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    legacy_copy = copy_workflow_file(root, "folder/legacy (copy) (copy).json", "en-US")
    assert legacy_copy == "folder/legacy (Copy 1).json"
    try:
        copy_workflow_file(root, "../outside.json", "zh-CN")
    except ValueError:
        pass
    else:
        raise AssertionError("Path traversal was accepted")

print("Workflow copy service contract passed.")
