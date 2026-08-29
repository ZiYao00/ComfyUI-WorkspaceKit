from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from service.theme_storage import ThemeStorage, ThemeStorageError


def make_theme(theme_id: str = "test-theme", name: str = "Test Theme") -> dict:
    return {
        "id": theme_id,
        "name": name,
        "colors": {
            "node_slot": {"input": "#111111"},
            "litegraph_base": {"background": "#222222"},
            "comfy_base": {"menu_bg": "#333333"},
        },
    }


class ThemeStorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        themes = self.root / "entry" / "appearance" / "themes"
        (themes / "wk").mkdir(parents=True)
        (themes / "manifest.json").write_text(
            json.dumps({"schemaVersion": 1, "groups": [{"id": "wk", "items": []}]}),
            encoding="utf-8",
        )
        self.storage = ThemeStorage(self.root)

    def tearDown(self) -> None:
        self.directory.cleanup()

    def test_new_theme_creates_file_and_manifest_entry(self) -> None:
        result = self.storage.save({"fileName": "my-theme", "theme": make_theme()})
        self.assertTrue(result["created"])
        self.assertTrue(
            (self.root / "entry/appearance/themes/wk/my-theme.json").is_file()
        )
        manifest = json.loads(
            (self.root / "entry/appearance/themes/manifest.json").read_text(encoding="utf-8")
        )
        self.assertEqual(manifest["groups"][0]["items"], [result["theme"]])
        self.assertEqual(
            result["file"],
            "themes/wk/my-theme.json",
        )

    def test_overwrite_requires_explicit_permission_and_backs_up(self) -> None:
        self.storage.save({"fileName": "my-theme", "theme": make_theme("old", "Old")})
        with self.assertRaisesRegex(ThemeStorageError, "already exists"):
            self.storage.save({"fileName": "my-theme", "theme": make_theme("new", "New")})
        result = self.storage.save(
            {"fileName": "my-theme", "theme": make_theme("new", "New"), "overwrite": True}
        )
        self.assertFalse(result["created"])
        backups = list((self.root / ".theme-backups").glob("*-my-theme.json"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(json.loads(backups[0].read_text(encoding="utf-8"))["id"], "old")

    def test_rejects_paths_invalid_structure_and_duplicate_id(self) -> None:
        for name in ("../escape", "WK Theme", "name.json", ""):
            with self.assertRaises(ThemeStorageError):
                self.storage.save({"fileName": name, "theme": make_theme()})
        invalid = make_theme()
        invalid["colors"].pop("comfy_base")
        with self.assertRaises(ThemeStorageError):
            self.storage.save({"fileName": "invalid", "theme": invalid})
        self.storage.save({"fileName": "first", "theme": make_theme("same-id")})
        with self.assertRaisesRegex(ThemeStorageError, "theme ID"):
            self.storage.save({"fileName": "second", "theme": make_theme("same-id")})

    def test_legacy_migration_copies_only_valid_non_existing_themes(self) -> None:
        base = self.root / "legacy-migration-fixture"
        main_root = base / "ComfyUI-WorkspaceKit"
        themes = main_root / "entry" / "appearance" / "themes"
        (themes / "wk").mkdir(parents=True, exist_ok=True)
        (themes / "manifest.json").write_text(
            json.dumps({"schemaVersion": 1, "groups": [{"id": "wk", "items": []}]}),
            encoding="utf-8",
        )
        legacy = base / "ComfyUI-WorkspaceKit-Theme" / "js" / "themes" / "wk"
        legacy.mkdir(parents=True, exist_ok=True)
        (legacy / "custom-one.json").write_text(
            json.dumps(make_theme("legacy-one", "Legacy One")),
            encoding="utf-8",
        )
        (legacy / "invalid name.json").write_text(
            json.dumps(make_theme("ignored", "Ignored")),
            encoding="utf-8",
        )
        (legacy / "broken.json").write_text("not json", encoding="utf-8")

        storage = ThemeStorage(main_root)
        status = storage.legacy_status()
        self.assertTrue(status["available"])
        self.assertEqual(status["files"], ["custom-one"])

        result = storage.migrate_legacy()
        self.assertEqual(result["migrated"], ["custom-one"])
        self.assertEqual(result["errors"], [])
        self.assertTrue(result["sourcePreserved"])
        self.assertTrue((legacy / "custom-one.json").is_file())
        self.assertTrue((themes / "wk" / "custom-one.json").is_file())
        self.assertFalse(storage.legacy_status()["available"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
