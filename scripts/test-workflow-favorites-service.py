"""Contract for server-owned virtual workflow favorites."""
import sys
import tempfile
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
package = types.ModuleType("workspacekit_test")
package.__path__ = [str(REPO_ROOT)]
sys.modules["workspacekit_test"] = package

from workspacekit_test.service.workflow_favorites_service import read_workflow_favorites, write_workflow_favorites

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    saved = write_workflow_favorites(root, {"favorites": ["A.json", "folder\\B.json", "A.json", "../bad.json", 3]})
    assert saved == {"version": 1, "favorites": ["A.json", "folder/B.json"]}
    assert read_workflow_favorites(root) == saved

print("workflow favorites service contract passed")
