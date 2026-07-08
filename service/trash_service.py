import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .safe_path import safe_join, safe_relative_path


def _now_id():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{uuid4().hex[:8]}"


def _now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _manifest_path(workspace_data_root):
    return Path(workspace_data_root).resolve() / "trash_manifest.json"


def _trash_root(workspace_data_root):
    return Path(workspace_data_root).resolve() / "trash"


def load_manifest(workspace_data_root):
    manifest_path = _manifest_path(workspace_data_root)
    if not manifest_path.exists():
        return []
    with manifest_path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        return []
    return data


def save_manifest(workspace_data_root, items):
    workspace_data_root = Path(workspace_data_root).resolve()
    workspace_data_root.mkdir(parents=True, exist_ok=True)
    manifest_path = _manifest_path(workspace_data_root)
    with manifest_path.open("w", encoding="utf-8") as file:
        json.dump(items, file, ensure_ascii=False, indent=2)


def _count_files(path):
    if path.is_file():
        return 1
    return sum(1 for child in path.rglob("*") if child.is_file())


def _size_bytes(path):
    if path.is_file():
        return path.stat().st_size
    return sum(child.stat().st_size for child in path.rglob("*") if child.is_file())


def move_to_trash(workflows_root, workspace_data_root, relative_path):
    workflows_root = Path(workflows_root).resolve()
    workspace_data_root = Path(workspace_data_root).resolve()
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

    shutil.move(str(source), str(trashed_target))
    items = load_manifest(workspace_data_root)
    items.append(item)
    save_manifest(workspace_data_root, items)
    return item


def list_trash(workspace_data_root):
    return [item for item in load_manifest(workspace_data_root) if item.get("status") == "trashed"]


def restore_from_trash(workflows_root, workspace_data_root, trash_id, restore_mode="original"):
    workflows_root = Path(workflows_root).resolve()
    workspace_data_root = Path(workspace_data_root).resolve()
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
    shutil.move(str(trashed_source), str(target))
    item["status"] = "restored"
    item["restored_at"] = _now_iso()
    item["restored_path"] = safe_relative_path(workflows_root, target)
    save_manifest(workspace_data_root, items)
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


def move_trash_item_to_system_trash(workspace_data_root, trash_id):
    workspace_data_root = Path(workspace_data_root).resolve()
    trash_root = _trash_root(workspace_data_root)
    items = load_manifest(workspace_data_root)
    item = next((entry for entry in items if entry.get("id") == trash_id), None)
    if not item:
        raise ValueError("Trash item not found")
    if item.get("status") != "trashed":
        raise ValueError("Trash item is not removable")

    trashed_source = safe_join(trash_root, item.get("trashed_path", ""))
    _send_to_system_trash(trashed_source)
    item["status"] = "system_trashed"
    item["system_trashed_at"] = _now_iso()
    save_manifest(workspace_data_root, items)
    return item


def empty_trash_to_system_trash(workspace_data_root):
    workspace_data_root = Path(workspace_data_root).resolve()
    items = list_trash(workspace_data_root)
    removed = []
    errors = []
    for item in items:
        try:
            removed.append(move_trash_item_to_system_trash(workspace_data_root, item.get("id")))
        except Exception as exc:
            errors.append({"id": item.get("id"), "name": item.get("name"), "error": str(exc)})
    return {"removed": removed, "errors": errors}
