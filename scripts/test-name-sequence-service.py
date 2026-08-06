"""Regression checks for collision numbering and folder-metadata self-healing."""

import importlib.util
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_NAME = "workspacekit_name_test_package"

package = types.ModuleType(PACKAGE_NAME)
package.__path__ = [str(ROOT)]
service_package = types.ModuleType(f"{PACKAGE_NAME}.service")
service_package.__path__ = [str(ROOT / "service")]
sys.modules[PACKAGE_NAME] = package
sys.modules[f"{PACKAGE_NAME}.service"] = service_package


def load(name):
    spec = importlib.util.spec_from_file_location(
        f"{PACKAGE_NAME}.service.{name}",
        ROOT / "service" / f"{name}.py",
        submodule_search_locations=[str(ROOT / "service")],
    )
    module = importlib.util.module_from_spec(spec)
    module.__package__ = f"{PACKAGE_NAME}.service"
    sys.modules[f"{PACKAGE_NAME}.service.{name}"] = module
    spec.loader.exec_module(module)
    return module


names = load("name_sequence_service")
meta = load("folder_meta_service")


# A free name is returned unchanged; nothing is numbered speculatively.
assert names.unique_name("flow.json", False, set()) == "flow.json"
assert names.unique_name("Folder", True, set()) == "Folder"

# The extension must stay last so ComfyUI still recognizes the workflow.
assert names.unique_name("flow.json", False, {"flow.json"}) == "flow (2).json"
assert names.unique_name("flow.json", False, {"flow.json", "flow (2).json"}) == "flow (3).json"

# A folder has no extension to protect, so the whole name is numbered.
assert names.unique_name("Folder", True, {"folder"}) == "Folder (2)"

# Case-insensitive: Windows treats these as one name, so a case-sensitive check
# would return a name that then fails to move.
assert names.unique_name("Flow.json", False, {"flow.json"}) == "Flow (2).json"

# Renaming an already-numbered item continues one series instead of nesting.
assert names.unique_name("flow (2).json", False, {"flow (2).json"}) == "flow (3).json"
assert names.unique_name("flow (2).json", False, {"flow (2).json", "flow (3).json"}) == "flow (4).json"

# Chinese locale mirrors the copy-suffix convention.
assert names.unique_name("流程.json", False, {"流程.json"}, "zh-CN") == "流程（2）.json"
assert names.unique_name("流程（2）.json", False, {"流程（2）.json"}, "zh-CN") == "流程（3）.json"

# Dotfiles have no stem to number, so the whole name is treated as the stem.
assert names.split_name(".hidden", False) == (".hidden", "")
assert names.unique_name(".hidden", False, {".hidden"}) == ".hidden (2)"

# Every name is resolved before any move, and each accepted name is reserved
# immediately. Without that, both of these would be sent to "flow (3).json".
resolved = names.resolve_names(
    [("flow.json", False), ("flow (2).json", False)],
    {"flow.json", "flow (2).json"},
)
assert resolved == [
    ("flow.json", "flow (3).json", True),
    ("flow (2).json", "flow (4).json", True),
], resolved

# Two identically named children of different sources cannot both keep the name.
same = names.resolve_names([("a.json", False), ("a.json", False)], set())
assert same == [("a.json", "a.json", False), ("a.json", "a (2).json", True)], same

# An exhausted range raises rather than looping or overwriting.
try:
    names.unique_name("x.json", False, {"x.json", "x (2).json"}, "en-US", limit=1)
    raise AssertionError("Expected exhausted-name rejection")
except FileExistsError:
    pass


# T-046 self-heal: keys written by the old top-level dissolve carried a "./"
# prefix that matched no folder, hiding the icon and colour they held.
healed = meta.normalize_folder_meta({"./N2": {"icon": "star"}, "./N2/N3": {"color": "#0f0"}})
assert healed == {"N2": {"icon": "star"}, "N2/N3": {"color": "#0f0"}}, healed

# A correct key always wins over a healed duplicate, whichever order they
# appear in, because it reflects what the user styled most recently.
assert meta.normalize_folder_meta({"./N2": {"icon": "old"}, "N2": {"icon": "new"}}) == {"N2": {"icon": "new"}}
assert meta.normalize_folder_meta({"N2": {"icon": "new"}, "./N2": {"icon": "old"}}) == {"N2": {"icon": "new"}}

# A bare "." was never a real folder and must not survive as an entry.
assert meta.normalize_folder_meta({".": {"icon": "x"}, "keep": {"icon": "y"}}) == {"keep": {"icon": "y"}}

# Backslash normalization and empty-entry rejection still hold.
assert meta.normalize_folder_meta({"a\\b": {"color": "#fff"}}) == {"a/b": {"color": "#fff"}}
assert meta.normalize_folder_meta({"a": {}, "b": {"icon": ""}}) == {}
assert meta.normalize_folder_meta(None) == {}

print("name sequence and folder metadata contract passed")
