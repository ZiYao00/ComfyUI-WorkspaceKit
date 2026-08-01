import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from uuid import uuid4

from .safe_path import safe_join, safe_relative_path


_manifest_lock = RLock()


def _now_id():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{uuid4().hex[:8]}"


def _now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _manifest_path(workspace_data_root):
    return Path(workspace_data_root).resolve() / "trash_manifest.json"


def _manifest_backup_path(workspace_data_root):
    manifest_path = _manifest_path(workspace_data_root)
    return manifest_path.with_suffix(manifest_path.suffix + ".bak")


def _operation_path(workspace_data_root):
    return Path(workspace_data_root).resolve() / "trash_operation.json"


def _trash_root(workspace_data_root):
    return Path(workspace_data_root).resolve() / "trash"


def _validate_manifest(data):
    if not isinstance(data, list):
        raise ValueError("Trash manifest must contain a list")
    return data


def _read_manifest_file(path):
    with Path(path).open("r", encoding="utf-8") as file:
        return _validate_manifest(json.load(file))


def _atomic_write_bytes(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=path.parent,
            prefix=f".{path.stem}-",
            suffix=".tmp",
            delete=False,
        ) as file:
            temporary_path = Path(file.name)
            file.write(payload)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary_path, path)
    except Exception:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise


def _atomic_write_manifest(path, items):
    payload = json.dumps(items, ensure_ascii=False, indent=2).encode("utf-8")
    _validate_manifest(json.loads(payload.decode("utf-8")))
    _atomic_write_bytes(path, payload)


def _atomic_write_operation(path, operation):
    if not isinstance(operation, dict):
        raise ValueError("Trash operation must contain an object")
    payload = json.dumps(operation, ensure_ascii=False, indent=2).encode("utf-8")
    decoded = json.loads(payload.decode("utf-8"))
    if not isinstance(decoded, dict):
        raise ValueError("Trash operation must contain an object")
    _atomic_write_bytes(path, payload)


def _backup_current_manifest(workspace_data_root):
    manifest_path = _manifest_path(workspace_data_root)
    if not manifest_path.is_file():
        return
    try:
        payload = manifest_path.read_bytes()
        _validate_manifest(json.loads(payload.decode("utf-8")))
    except (OSError, UnicodeDecodeError, ValueError, json.JSONDecodeError):
        return
    _atomic_write_bytes(_manifest_backup_path(workspace_data_root), payload)


def load_manifest(workspace_data_root):
    with _manifest_lock:
        manifest_path = _manifest_path(workspace_data_root)
        if not manifest_path.exists():
            return []
        try:
            return _read_manifest_file(manifest_path)
        except (OSError, ValueError, json.JSONDecodeError) as primary_error:
            backup_path = _manifest_backup_path(workspace_data_root)
            if not backup_path.is_file():
                raise ValueError(f"Trash manifest is unreadable: {primary_error}") from primary_error
            try:
                recovered = _read_manifest_file(backup_path)
            except (OSError, ValueError, json.JSONDecodeError) as backup_error:
                raise ValueError(
                    f"Trash manifest and backup are unreadable: {primary_error}; {backup_error}"
                ) from backup_error
            print(f"[WorkspaceKit] Recovered trash manifest read from backup: {backup_path}")
            return recovered


def save_manifest(workspace_data_root, items):
    with _manifest_lock:
        workspace_data_root = Path(workspace_data_root).resolve()
        workspace_data_root.mkdir(parents=True, exist_ok=True)
        _validate_manifest(items)
        _backup_current_manifest(workspace_data_root)
        _atomic_write_manifest(_manifest_path(workspace_data_root), items)


def _read_operation(workspace_data_root):
    path = _operation_path(workspace_data_root)
    if not path.is_file():
        return None
    try:
        with path.open("r", encoding="utf-8") as file:
            operation = json.load(file)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise ValueError(f"Trash operation journal is unreadable: {exc}") from exc
    if not isinstance(operation, dict):
        raise ValueError("Trash operation journal must contain an object")
    if operation.get("schema_version") != 1:
        raise ValueError("Trash operation journal schema is unsupported")
    if operation.get("action") not in {"move", "restore", "system_delete"}:
        raise ValueError("Trash operation journal action is unsupported")
    if not isinstance(operation.get("item"), dict):
        raise ValueError("Trash operation journal item is invalid")
    return operation


def _begin_operation(workflows_root, workspace_data_root, action, item):
    operation = {
        "schema_version": 1,
        "operation_id": uuid4().hex,
        "action": action,
        "started_at": _now_iso(),
        "workflows_root": "" if workflows_root is None else str(Path(workflows_root).resolve()),
        "item": dict(item),
    }
    _atomic_write_operation(_operation_path(workspace_data_root), operation)
    return operation


def _clear_operation(workspace_data_root):
    path = _operation_path(workspace_data_root)
    if path.exists():
        path.unlink()


def _journal_paths(operation, workspace_data_root, workflows_root=None):
    item = operation["item"]
    trash_root = _trash_root(workspace_data_root)
    if operation["action"] == "system_delete":
        return None, None, safe_join(trash_root, item.get("trashed_path", ""))
    recorded_root_text = operation.get("workflows_root", "")
    if not recorded_root_text:
        raise ValueError("Trash operation journal has no workflows root")
    recorded_root = Path(recorded_root_text).resolve()
    if workflows_root is not None and recorded_root != Path(workflows_root).resolve():
        raise ValueError("Trash operation journal belongs to a different workflows root")
    return (
        recorded_root,
        safe_join(recorded_root, item.get("original_path", "")),
        safe_join(trash_root, item.get("trashed_path", "")),
    )


def _find_manifest_item(items, trash_id):
    return next((entry for entry in items if entry.get("id") == trash_id), None)


def recover_pending_operation(workspace_data_root, workflows_root=None):
    """Repair one interrupted trash operation from its durable journal.

    Recovery deliberately derives its decision from the on-disk workflow and
    plugin-trash locations. Ambiguous states fail loudly instead of moving any
    user file by guesswork.
    """
    with _manifest_lock:
        operation = _read_operation(workspace_data_root)
        if operation is None:
            return None
        recorded_root, original_path, trashed_path = _journal_paths(operation, workspace_data_root, workflows_root)
        items = load_manifest(workspace_data_root)
        item = _find_manifest_item(items, operation["item"].get("id"))
        action = operation["action"]

        if action == "move":
            if original_path.exists() and not trashed_path.exists():
                _clear_operation(workspace_data_root)
                return {"action": action, "result": "not_started"}
            if not original_path.exists() and trashed_path.exists():
                if item is None:
                    items.append(operation["item"])
                    save_manifest(workspace_data_root, items)
                _clear_operation(workspace_data_root)
                return {"action": action, "result": "completed"}

        elif action == "restore":
            if not original_path.exists() and trashed_path.exists():
                _clear_operation(workspace_data_root)
                return {"action": action, "result": "not_started"}
            if original_path.exists() and not trashed_path.exists():
                if item is None:
                    raise ValueError("Trash restore journal has no matching manifest item")
                item["status"] = "restored"
                item["restored_at"] = operation["started_at"]
                item["restored_path"] = safe_relative_path(recorded_root, original_path)
                save_manifest(workspace_data_root, items)
                _clear_operation(workspace_data_root)
                return {"action": action, "result": "completed"}

        elif action == "system_delete":
            if trashed_path.exists():
                if item is None:
                    raise ValueError("System-trash journal has no matching manifest item")
                item["status"] = "trashed"
                item.pop("system_delete_started_at", None)
                save_manifest(workspace_data_root, items)
                _clear_operation(workspace_data_root)
                return {"action": action, "result": "not_started"}
            if item is None:
                raise ValueError("System-trash journal has no matching manifest item")
            item["status"] = "system_trashed"
            item.pop("system_delete_started_at", None)
            item["system_trashed_at"] = operation["started_at"]
            save_manifest(workspace_data_root, items)
            _clear_operation(workspace_data_root)
            return {"action": action, "result": "completed"}

        raise ValueError(
            f"Trash operation journal is ambiguous: action={action}, "
            f"original_exists={original_path.exists()}, trashed_exists={trashed_path.exists()}"
        )


def _count_files(path):
    if path.is_file():
        return 1
    return sum(1 for child in path.rglob("*") if child.is_file())


def _size_bytes(path):
    if path.is_file():
        return path.stat().st_size
    return sum(child.stat().st_size for child in path.rglob("*") if child.is_file())


def _move_back_after_manifest_failure(current_path, original_path, action, error):
    current_path = Path(current_path)
    original_path = Path(original_path)
    try:
        if current_path.exists() and not original_path.exists():
            original_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(current_path), str(original_path))
    except Exception as rollback_error:
        raise RuntimeError(
            f"{action} manifest save failed and file rollback also failed: {rollback_error}"
        ) from rollback_error
    raise error


def move_to_trash(workflows_root, workspace_data_root, relative_path):
    with _manifest_lock:
        workflows_root = Path(workflows_root).resolve()
        workspace_data_root = Path(workspace_data_root).resolve()
        recover_pending_operation(workspace_data_root, workflows_root)
        source = safe_join(workflows_root, relative_path)

        if not source.exists():
            raise ValueError("Source not found")
        if source.resolve() == workflows_root:
            raise ValueError("Cannot move workflows root to trash")

        trash_id = _now_id()
        trash_root = _trash_root(workspace_data_root)
        trash_item_dir = trash_root / trash_id
        trash_item_dir.mkdir(parents=True, exist_ok=False)
        trashed_target = trash_item_dir / source.name

        item = {
            "id": trash_id,
            "type": "folder" if source.is_dir() else "file",
            "name": source.name,
            "original_path": safe_relative_path(workflows_root, source),
            "trashed_path": safe_relative_path(trash_root, trashed_target),
            "deleted_at": _now_iso(),
            "size_bytes": _size_bytes(source),
            "file_count": _count_files(source),
            "status": "trashed",
        }

        _begin_operation(workflows_root, workspace_data_root, "move", item)
        shutil.move(str(source), str(trashed_target))
        items = load_manifest(workspace_data_root)
        items.append(item)
        try:
            save_manifest(workspace_data_root, items)
        except Exception as exc:
            try:
                _move_back_after_manifest_failure(trashed_target, source, "Move to trash", exc)
            finally:
                _clear_operation(workspace_data_root)
            raise
        _clear_operation(workspace_data_root)
        return item


def list_trash(workspace_data_root, workflows_root=None):
    if workflows_root is not None:
        recover_pending_operation(workspace_data_root, workflows_root)
    return [item for item in load_manifest(workspace_data_root) if item.get("status") == "trashed"]


def restore_from_trash(workflows_root, workspace_data_root, trash_id, restore_mode="original"):
    with _manifest_lock:
        workflows_root = Path(workflows_root).resolve()
        workspace_data_root = Path(workspace_data_root).resolve()
        recover_pending_operation(workspace_data_root, workflows_root)
        trash_root = _trash_root(workspace_data_root)
        items = load_manifest(workspace_data_root)
        item = next((entry for entry in items if entry.get("id") == trash_id), None)
        if not item:
            raise ValueError("Trash item not found")
        if item.get("status") != "trashed":
            raise ValueError("Trash item is not restorable")

        trashed_source = safe_join(trash_root, item.get("trashed_path", ""))
        if not trashed_source.exists():
            raise ValueError("Trashed file is missing")

        target = safe_join(workflows_root, item.get("original_path", ""))
        if target.exists():
            if restore_mode != "copy_name":
                raise FileExistsError("Restore target already exists")
            stem = target.stem
            suffix = target.suffix
            parent = target.parent
            target = parent / f"{stem}_restored_{datetime.now().strftime('%Y%m%d_%H%M%S')}{suffix}"
            target = safe_join(workflows_root, safe_relative_path(workflows_root, target))

        target.parent.mkdir(parents=True, exist_ok=True)
        _begin_operation(workflows_root, workspace_data_root, "restore", item)
        shutil.move(str(trashed_source), str(target))
        item["status"] = "restored"
        item["restored_at"] = _now_iso()
        item["restored_path"] = safe_relative_path(workflows_root, target)
        try:
            save_manifest(workspace_data_root, items)
        except Exception as exc:
            try:
                _move_back_after_manifest_failure(target, trashed_source, "Restore from trash", exc)
            finally:
                _clear_operation(workspace_data_root)
            raise
        _clear_operation(workspace_data_root)
        return item


def _send_to_system_trash(path):
    path = Path(path).resolve()
    if not path.exists():
        raise ValueError("Trashed file is missing")
    if os.name == "nt":
        _send_to_windows_recycle_bin(path)
        return
    try:
        from send2trash import send2trash
    except ImportError as exc:
        raise RuntimeError("send2trash is required to move items to the system trash") from exc

    send2trash(str(path))


def _send_to_windows_recycle_bin(path):
    import ctypes
    from ctypes import wintypes

    FO_DELETE = 0x0003
    FOF_SILENT = 0x0004
    FOF_NOCONFIRMATION = 0x0010
    FOF_ALLOWUNDO = 0x0040

    class SHFILEOPSTRUCTW(ctypes.Structure):
        _fields_ = [
            ("hwnd", wintypes.HWND),
            ("wFunc", wintypes.UINT),
            ("pFrom", wintypes.LPCWSTR),
            ("pTo", wintypes.LPCWSTR),
            ("fFlags", wintypes.USHORT),
            ("fAnyOperationsAborted", wintypes.BOOL),
            ("hNameMappings", wintypes.LPVOID),
            ("lpszProgressTitle", wintypes.LPCWSTR),
        ]

    operation = SHFILEOPSTRUCTW()
    operation.hwnd = None
    operation.wFunc = FO_DELETE
    operation.pFrom = f"{Path(path)}\0\0"
    operation.pTo = None
    operation.fFlags = FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT
    operation.fAnyOperationsAborted = False
    result = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(operation))
    if result != 0:
        raise ctypes.WinError(result)
    if operation.fAnyOperationsAborted:
        raise RuntimeError("Move to system trash was cancelled")


def move_trash_item_to_system_trash(workspace_data_root, trash_id, workflows_root=None):
    with _manifest_lock:
        workspace_data_root = Path(workspace_data_root).resolve()
        recover_pending_operation(workspace_data_root, workflows_root)
        trash_root = _trash_root(workspace_data_root)
        items = load_manifest(workspace_data_root)
        item = next((entry for entry in items if entry.get("id") == trash_id), None)
        if not item:
            raise ValueError("Trash item not found")
        if item.get("status") != "trashed":
            raise ValueError("Trash item is not removable")

        trashed_source = safe_join(trash_root, item.get("trashed_path", ""))
        _begin_operation(workflows_root, workspace_data_root, "system_delete", item)
        item["status"] = "system_deleting"
        item["system_delete_started_at"] = _now_iso()
        # The system recycle bin is irreversible from this API. Persist an explicit
        # intermediate state before calling it so a later recovery pass never
        # reports a missing file as still restorable.
        try:
            save_manifest(workspace_data_root, items)
        except Exception:
            _clear_operation(workspace_data_root)
            raise
        try:
            _send_to_system_trash(trashed_source)
        except Exception:
            item["status"] = "trashed"
            item.pop("system_delete_started_at", None)
            try:
                save_manifest(workspace_data_root, items)
            finally:
                _clear_operation(workspace_data_root)
            raise
        item["status"] = "system_trashed"
        item.pop("system_delete_started_at", None)
        item["system_trashed_at"] = _now_iso()
        save_manifest(workspace_data_root, items)
        _clear_operation(workspace_data_root)
        return item


def empty_trash_to_system_trash(workspace_data_root, workflows_root=None):
    with _manifest_lock:
        workspace_data_root = Path(workspace_data_root).resolve()
        items = list_trash(workspace_data_root, workflows_root)
        removed = []
        errors = []
        for item in items:
            try:
                removed.append(move_trash_item_to_system_trash(workspace_data_root, item.get("id"), workflows_root))
            except Exception as exc:
                errors.append({"id": item.get("id"), "name": item.get("name"), "error": str(exc)})
        return {"removed": removed, "errors": errors}
