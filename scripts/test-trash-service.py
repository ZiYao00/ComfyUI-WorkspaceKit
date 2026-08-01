import json
import sys
import tempfile
import threading
from pathlib import Path
from unittest.mock import Mock, patch


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from service import trash_service


def write_workflow(root, relative_path, payload=None):
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload or {"nodes": []}), encoding="utf-8")
    return path


with tempfile.TemporaryDirectory() as temporary_directory:
    root = Path(temporary_directory)
    workflows = root / "workflows"
    workspace_data = root / "workspace_data"

    # The second save preserves the first valid generation as the recovery copy.
    first_manifest = [{"id": "first", "status": "trashed"}]
    second_manifest = [{"id": "second", "status": "trashed"}]
    trash_service.save_manifest(workspace_data, first_manifest)
    trash_service.save_manifest(workspace_data, second_manifest)
    manifest_path = workspace_data / "trash_manifest.json"
    backup_path = workspace_data / "trash_manifest.json.bak"
    assert json.loads(manifest_path.read_text(encoding="utf-8")) == second_manifest
    assert json.loads(backup_path.read_text(encoding="utf-8")) == first_manifest

    # A corrupt primary manifest falls back to the most recent valid backup.
    manifest_path.write_text("{not valid json", encoding="utf-8")
    assert trash_service.load_manifest(workspace_data) == first_manifest

    # A failed promotion never replaces the last valid primary manifest.
    trash_service.save_manifest(workspace_data, second_manifest)
    with patch.object(trash_service, "_atomic_write_manifest", side_effect=OSError("injected write failure")):
        try:
            trash_service.save_manifest(workspace_data, [{"id": "third", "status": "trashed"}])
            raise AssertionError("Expected injected write failure")
        except OSError as exc:
            assert "injected write failure" in str(exc)
    assert trash_service.load_manifest(workspace_data) == second_manifest

    # Concurrent browser requests run through one process-wide transaction lock.
    write_workflow(workflows, "a.json")
    write_workflow(workflows, "b.json")
    errors = []

    def move(relative_path):
        try:
            trash_service.move_to_trash(workflows, workspace_data, relative_path)
        except Exception as exc:  # pragma: no cover - exercised by the assertion below
            errors.append(exc)

    first_thread = threading.Thread(target=move, args=("a.json",))
    second_thread = threading.Thread(target=move, args=("b.json",))
    first_thread.start()
    second_thread.start()
    first_thread.join()
    second_thread.join()
    assert not errors
    concurrent_items = [
        item for item in trash_service.list_trash(workspace_data) if item.get("name") in {"a.json", "b.json"}
    ]
    assert sorted(item["name"] for item in concurrent_items) == ["a.json", "b.json"]

    # If manifest persistence fails after a normal move, the workflow is moved back.
    compensation_data = root / "compensation_data"
    original = write_workflow(workflows, "compensate.json")
    with patch.object(trash_service, "save_manifest", side_effect=OSError("injected manifest failure")):
        try:
            trash_service.move_to_trash(workflows, compensation_data, "compensate.json")
            raise AssertionError("Expected move-to-trash manifest failure")
        except OSError as exc:
            assert "injected manifest failure" in str(exc)
    assert original.exists()
    assert not list((compensation_data / "trash").rglob("compensate.json"))

    # If persistence fails after restore, the item is returned to the plugin trash.
    original_a = write_workflow(workflows, "restore-compensate.json")
    item = trash_service.move_to_trash(workflows, compensation_data, "restore-compensate.json")
    trashed_a = compensation_data / "trash" / item["id"] / "restore-compensate.json"
    with patch.object(trash_service, "save_manifest", side_effect=OSError("injected restore manifest failure")):
        try:
            trash_service.restore_from_trash(workflows, compensation_data, item["id"])
            raise AssertionError("Expected restore manifest failure")
        except OSError as exc:
            assert "injected restore manifest failure" in str(exc)
    assert not original_a.exists()
    assert trashed_a.exists()
    restored_manifest_item = next(entry for entry in trash_service.load_manifest(compensation_data) if entry["id"] == item["id"])
    assert restored_manifest_item["status"] == "trashed"

    # The irreversible system-trash action must not start unless its intermediate
    # manifest state was persisted successfully.
    send_to_system_trash = Mock()
    with patch.object(trash_service, "save_manifest", side_effect=OSError("injected pre-delete manifest failure")):
        with patch.object(trash_service, "_send_to_system_trash", send_to_system_trash):
            try:
                trash_service.move_trash_item_to_system_trash(compensation_data, item["id"])
                raise AssertionError("Expected pre-delete manifest failure")
            except OSError as exc:
                assert "injected pre-delete manifest failure" in str(exc)
    send_to_system_trash.assert_not_called()
    assert trashed_a.exists()

    # A crash after the file move but before the manifest save is completed on
    # the next access using the durable move journal.
    journal_data = root / "journal_data"
    journal_source = write_workflow(workflows, "journal-move.json")
    journal_target = journal_data / "trash" / "pending-move" / "journal-move.json"
    journal_target.parent.mkdir(parents=True, exist_ok=True)
    journal_item = {
        "id": "pending-move",
        "type": "file",
        "name": "journal-move.json",
        "original_path": "journal-move.json",
        "trashed_path": "pending-move/journal-move.json",
        "deleted_at": "2026-08-01T00:00:00+00:00",
        "size_bytes": journal_source.stat().st_size,
        "file_count": 1,
        "status": "trashed",
    }
    trash_service._begin_operation(workflows, journal_data, "move", journal_item)
    journal_source.replace(journal_target)
    assert trash_service.recover_pending_operation(journal_data, workflows) == {"action": "move", "result": "completed"}
    assert not journal_source.exists()
    assert journal_target.exists()
    assert any(entry["id"] == "pending-move" for entry in trash_service.list_trash(journal_data, workflows))
    assert not (journal_data / "trash_operation.json").exists()

    # A crash after restore's move is finalized as restored on the next access.
    restore_source = write_workflow(workflows, "journal-restore.json")
    restore_item = trash_service.move_to_trash(workflows, journal_data, "journal-restore.json")
    restore_target = workflows / "journal-restore.json"
    restore_trash_path = journal_data / "trash" / restore_item["id"] / "journal-restore.json"
    trash_service._begin_operation(workflows, journal_data, "restore", restore_item)
    restore_trash_path.replace(restore_target)
    assert trash_service.recover_pending_operation(journal_data, workflows) == {"action": "restore", "result": "completed"}
    restored_item = next(entry for entry in trash_service.load_manifest(journal_data) if entry["id"] == restore_item["id"])
    assert restored_item["status"] == "restored"
    assert restore_target.exists()
    assert not restore_trash_path.exists()

    # Once the system recycle-bin action has removed the file, recovery records
    # the irreversible result rather than leaving a false restorable entry.
    system_source = write_workflow(workflows, "journal-system.json")
    system_item = trash_service.move_to_trash(workflows, journal_data, "journal-system.json")
    system_trash_path = journal_data / "trash" / system_item["id"] / "journal-system.json"
    manifest_items = trash_service.load_manifest(journal_data)
    persisted_system_item = next(entry for entry in manifest_items if entry["id"] == system_item["id"])
    persisted_system_item["status"] = "system_deleting"
    persisted_system_item["system_delete_started_at"] = "2026-08-01T00:00:00+00:00"
    trash_service.save_manifest(journal_data, manifest_items)
    trash_service._begin_operation(workflows, journal_data, "system_delete", persisted_system_item)
    system_trash_path.unlink()
    assert trash_service.recover_pending_operation(journal_data, workflows) == {"action": "system_delete", "result": "completed"}
    final_system_item = next(entry for entry in trash_service.load_manifest(journal_data) if entry["id"] == system_item["id"])
    assert final_system_item["status"] == "system_trashed"
    assert not (journal_data / "trash_operation.json").exists()

    # A corrupt journal is not acted on speculatively.
    (journal_data / "trash_operation.json").write_text("not valid json", encoding="utf-8")
    try:
        trash_service.recover_pending_operation(journal_data, workflows)
        raise AssertionError("Expected corrupt journal rejection")
    except ValueError as exc:
        assert "journal is unreadable" in str(exc)

print("trash service atomic-manifest contract passed")
