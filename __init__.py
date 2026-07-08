import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

import folder_paths
import server
from aiohttp import web

from .service.folder_meta_service import read_folder_meta, write_folder_meta
from .service.n_sidebar_migration import (
    build_n_sidebar_preview,
    candidate_n_sidebar_settings_paths,
    read_n_sidebar_settings,
)
from .service.node_library_service import read_node_library, write_node_library
from .service.official_favorites_probe import probe_official_favorites
from .service.official_favorites_sync import write_workspace2_favorites_to_official
from .service.safe_path import safe_join, safe_relative_path
from .service.template_library_service import read_template_library, write_template_library
from .service.trash_service import (
    empty_trash_to_system_trash,
    list_trash,
    move_to_trash,
    move_trash_item_to_system_trash,
    restore_from_trash,
)


WEB_DIRECTORY = "entry"


class Workspace2Title:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ()
    OUTPUT_NODE = False
    FUNCTION = "execute"
    CATEGORY = "Workspace2"

    def execute(self):
        return ()


NODE_CLASS_MAPPINGS = {
    "Workspace2Title": Workspace2Title,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "Workspace2Title": "标题2",
}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

VERSION = "0.1.1b0"
PLUGIN_NAME = "comfyui-workspace2"

workspace_path = Path(__file__).resolve().parent
comfy_path = Path(folder_paths.__file__).resolve().parent

print(f"Loading: Workspace2 ({VERSION})")


def _json_response(data, status=200):
    return web.Response(
        text=json.dumps(data, ensure_ascii=False),
        status=status,
        content_type="application/json",
    )


def _legacy_settings_paths():
    return [
        workspace_path.parent / "comfyui-workspace-manager" / "db" / "settings.json",
    ]


def _settings_path():
    return workspace_path / "db" / "settings.json"


def _official_workflows_root():
    return comfy_path / "user" / "default" / "workflows"


def _read_workspace2_settings():
    path = _settings_path()
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else {}
    except Exception as exc:
        print(f"[Workspace2] Failed to read settings {path}: {exc}")
        return {}


def _write_workspace2_settings(settings):
    path = _settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(settings, file, ensure_ascii=False, indent=2)


def _read_workspace2_workflows_dir():
    settings = _read_workspace2_settings()
    mode = settings.get("workflowsRootMode")
    if mode == "official":
        return _official_workflows_root()
    if mode == "custom":
        value = settings.get("myWorkflowsDir")
        if isinstance(value, dict):
            value = value.get("path")
        if isinstance(value, str) and value.strip():
            candidate = Path(value).expanduser().resolve()
            if candidate.exists() and candidate.is_dir():
                return candidate
        return _official_workflows_root()
    return None


def _read_legacy_workflows_dir():
    for settings_path in _legacy_settings_paths():
        if not settings_path.exists():
            continue
        try:
            with settings_path.open("r", encoding="utf-8") as file:
                settings = json.load(file)
            value = settings.get("myWorkflowsDir")
            if isinstance(value, dict):
                value = value.get("path")
            if isinstance(value, str) and value.strip():
                candidate = Path(value).expanduser().resolve()
                if candidate.exists() and candidate.is_dir():
                    return candidate
        except Exception as exc:
            print(f"[Workspace2] Failed to read legacy settings {settings_path}: {exc}")
    return None


def get_workflows_root():
    workspace2_dir = _read_workspace2_workflows_dir()
    if workspace2_dir is not None:
        return workspace2_dir
    legacy_dir = _read_legacy_workflows_dir()
    if legacy_dir is not None:
        return legacy_dir
    return _official_workflows_root()


def get_workspace_data_root():
    return comfy_path / "user" / "default" / "workspace-manager"


def get_workspace2_data_root():
    return comfy_path / "user" / "default" / "comfyui-workspace2"


def _item_info(root, path):
    stat = path.stat()
    rel_path = safe_relative_path(root, path)
    if path.is_dir():
        return {
            "type": "folder",
            "name": path.name,
            "path": rel_path,
            "updated_at": int(stat.st_mtime * 1000),
        }
    return {
        "type": "file",
        "name": path.name,
        "path": rel_path,
        "size_bytes": stat.st_size,
        "updated_at": int(stat.st_mtime * 1000),
    }


def scan_workflows():
    root = get_workflows_root().resolve()
    if not root.exists():
        return []
    items = []
    for current_root, dir_names, file_names in os.walk(root):
        dir_names[:] = [name for name in dir_names if not name.startswith(".")]
        dir_names.sort(key=str.casefold)
        file_names.sort(key=str.casefold)
        current_path = Path(current_root)
        for dir_name in dir_names:
            items.append(_item_info(root, current_path / dir_name))
        for file_name in file_names:
            if file_name.lower().endswith(".json"):
                items.append(_item_info(root, current_path / file_name))
    return items


def _json_error(message, status=400):
    return _json_response({"ok": False, "error": message}, status=status)


def _require_name(name):
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Name is required")
    cleaned = name.strip()
    if "/" in cleaned or "\\" in cleaned:
        raise ValueError("Name must not contain path separators")
    if cleaned in {".", ".."}:
        raise ValueError("Invalid name")
    return cleaned


def _require_relative_path(path):
    if not isinstance(path, str) or not path.strip():
        raise ValueError("Path is required")
    return path.strip()


@server.PromptServer.instance.routes.get("/workspace2/info")
async def workspace2_info(_request):
    root = get_workflows_root().resolve()
    official_root = _official_workflows_root().resolve()
    return _json_response(
        {
            "ok": True,
            "version": VERSION,
            "workflows_root": str(root),
            "official_workflows_root": str(official_root),
            "is_official_root": root == official_root,
            "workspace_data_root": str(get_workspace_data_root().resolve()),
            "os": sys.platform,
        }
    )


@server.PromptServer.instance.routes.post("/workspace2/root/set")
async def workspace2_set_root(request):
    try:
        data = await request.json()
        root_path = data.get("root_path", "")
        if not isinstance(root_path, str):
            return _json_error("Root path must be a string")

        root_path = root_path.strip()
        if not root_path:
            settings = _read_workspace2_settings()
            settings["workflowsRootMode"] = "official"
            settings.pop("myWorkflowsDir", None)
            _write_workspace2_settings(settings)
            root = get_workflows_root().resolve()
            return _json_response({"ok": True, "root": str(root), "is_official_root": True})

        candidate = Path(root_path).expanduser()
        if not candidate.is_absolute():
            return _json_error("Root path must be an absolute path")
        candidate = candidate.resolve()
        if not candidate.exists() or not candidate.is_dir():
            return _json_error("Root path must be an existing directory", status=404)

        settings = _read_workspace2_settings()
        settings["workflowsRootMode"] = "custom"
        settings["myWorkflowsDir"] = str(candidate)
        _write_workspace2_settings(settings)
        return _json_response(
            {
                "ok": True,
                "root": str(candidate),
                "is_official_root": candidate == _official_workflows_root().resolve(),
            }
        )
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.get("/workspace2/workflows")
async def workspace2_workflows(_request):
    try:
        root = get_workflows_root().resolve()
        official_root = _official_workflows_root().resolve()
        return _json_response(
            {
                "ok": True,
                "root": str(root),
                "official_root": str(official_root),
                "is_official_root": root == official_root,
                "items": await asyncio.to_thread(scan_workflows),
                "folder_meta": await asyncio.to_thread(read_folder_meta, comfy_path),
            }
        )
    except Exception as exc:
        return _json_error(str(exc), status=500)



@server.PromptServer.instance.routes.get("/workspace2/folder-meta")
async def workspace2_folder_meta(_request):
    try:
        meta = await asyncio.to_thread(read_folder_meta, comfy_path)
        return _json_response({"ok": True, "folder_meta": meta})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/folder-meta")
async def workspace2_folder_meta_save(request):
    try:
        data = await request.json()
        meta = data.get("folder_meta")
        if not isinstance(meta, dict):
            return _json_error("Folder metadata must be a JSON object")
        saved = await asyncio.to_thread(write_folder_meta, comfy_path, meta)
        return _json_response({"ok": True, "folder_meta": saved})
    except Exception as exc:
        return _json_error(str(exc), status=400)

@server.PromptServer.instance.routes.get("/workspace2/workflow/read")
async def workspace2_read_workflow(request):
    try:
        rel_path = _require_relative_path(request.query.get("path", ""))
        root = get_workflows_root()
        target = safe_join(root, rel_path)
        if not target.is_file() or target.suffix.lower() != ".json":
            return _json_error("Workflow file not found", status=404)
        with target.open("r", encoding="utf-8") as file:
            workflow = json.load(file)
        return _json_response({"ok": True, "path": safe_relative_path(root, target), "workflow": workflow})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/workflow/save")
async def workspace2_save_workflow(request):
    try:
        data = await request.json()
        rel_path = _require_relative_path(data.get("path", ""))
        workflow = data.get("workflow")
        if not isinstance(workflow, dict):
            return _json_error("Workflow must be a JSON object")
        root = get_workflows_root()
        target = safe_join(root, rel_path)
        if target.suffix.lower() != ".json":
            target = target.with_suffix(".json")
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8") as file:
            json.dump(workflow, file, ensure_ascii=False, indent=2)
        return _json_response({"ok": True, "path": safe_relative_path(root, target)})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/folder/create")
async def workspace2_create_folder(request):
    try:
        data = await request.json()
        parent_path = data.get("parent_path", "")
        name = _require_name(data.get("name", ""))
        root = get_workflows_root()
        parent = safe_join(root, parent_path)
        target = safe_join(root, Path(parent_path) / name if parent_path else name)
        if not parent.exists() or not parent.is_dir():
            return _json_error("Parent folder not found", status=404)
        if target.exists():
            return _json_error("Target already exists", status=409)
        target.mkdir()
        return _json_response({"ok": True, "path": safe_relative_path(root, target)})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/rename")
async def workspace2_rename(request):
    try:
        data = await request.json()
        rel_path = _require_relative_path(data.get("path", ""))
        new_name = _require_name(data.get("new_name", ""))
        root = get_workflows_root()
        source = safe_join(root, rel_path)
        if not source.exists():
            return _json_error("Source not found", status=404)
        if source.is_file() and source.suffix.lower() == ".json" and not new_name.lower().endswith(".json"):
            new_name = f"{new_name}.json"
        target = safe_join(root, Path(safe_relative_path(root, source.parent)) / new_name)
        if target.exists():
            return _json_error("Target already exists", status=409)
        source.rename(target)
        return _json_response({"ok": True, "path": safe_relative_path(root, target)})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/move")
async def workspace2_move(request):
    try:
        data = await request.json()
        source_path = _require_relative_path(data.get("source_path", ""))
        target_folder = data.get("target_folder", "")
        root = get_workflows_root()
        source = safe_join(root, source_path)
        folder = safe_join(root, target_folder)
        if not source.exists():
            return _json_error("Source not found", status=404)
        if not folder.exists() or not folder.is_dir():
            return _json_error("Target folder not found", status=404)
        if source.is_dir() and folder.resolve().is_relative_to(source.resolve()):
            return _json_error("Cannot move a folder into itself")
        target = safe_join(root, Path(target_folder) / source.name if target_folder else source.name)
        if target.exists():
            return _json_error("Target already exists", status=409)
        source.rename(target)
        return _json_response({"ok": True, "path": safe_relative_path(root, target)})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/open_workflows_dir")
async def workspace2_open_workflows_dir(_request):
    try:
        root = get_workflows_root().resolve()
        root.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32":
            subprocess.Popen(["explorer", str(root)])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(root)])
        else:
            subprocess.Popen(["xdg-open", str(root)])
        return _json_response({"ok": True, "path": str(root)})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/open_item_location")
async def workspace2_open_item_location(request):
    try:
        data = await request.json()
        rel_path = _require_relative_path(data.get("path", ""))
        root = get_workflows_root()
        target = safe_join(root, rel_path).resolve()
        if not target.exists():
            return _json_error("Item not found", status=404)

        if sys.platform == "win32":
            if target.is_file():
                subprocess.Popen(["explorer", "/select,", str(target)])
            else:
                subprocess.Popen(["explorer", str(target)])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", "-R", str(target)])
        else:
            opener_target = target.parent if target.is_file() else target
            subprocess.Popen(["xdg-open", str(opener_target)])
        return _json_response({"ok": True, "path": str(target)})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/trash/move")
async def workspace2_trash_move(request):
    try:
        data = await request.json()
        rel_path = _require_relative_path(data.get("path", ""))
        item = await asyncio.to_thread(
            move_to_trash,
            get_workflows_root(),
            get_workspace_data_root(),
            rel_path,
        )
        return _json_response({"ok": True, "item": item})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.get("/workspace2/trash/list")
async def workspace2_trash_list(_request):
    try:
        items = await asyncio.to_thread(list_trash, get_workspace_data_root())
        return _json_response({"ok": True, "items": items})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.get("/workspace2/nodes/library")
async def workspace2_nodes_library(_request):
    try:
        library = await asyncio.to_thread(read_node_library, comfy_path)
        return _json_response({"ok": True, "library": library})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.get("/workspace2/nodes/n-sidebar/preview")
async def workspace2_nodes_n_sidebar_preview(_request):
    try:
        paths = candidate_n_sidebar_settings_paths(comfy_path, workspace_path)
        source_path, settings = await asyncio.to_thread(read_n_sidebar_settings, paths)
        preview = build_n_sidebar_preview(settings, source_path or "")
        preview["checkedPaths"] = [str(path) for path in paths]
        return _json_response({"ok": True, "preview": preview})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.get("/workspace2/nodes/official-favorites/probe")
async def workspace2_nodes_official_favorites_probe(_request):
    try:
        probe = await asyncio.to_thread(probe_official_favorites, comfy_path)
        return _json_response({"ok": True, "probe": probe})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/nodes/official-favorites/import_from_workspace2")
async def workspace2_nodes_official_favorites_import_from_workspace2(_request):
    try:
        result = await asyncio.to_thread(write_workspace2_favorites_to_official, comfy_path)
        return _json_response({"ok": True, **result})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/nodes/library")
async def workspace2_nodes_library_save(request):
    try:
        data = await request.json()
        library = data.get("library")
        if not isinstance(library, dict):
            return _json_error("Node library must be a JSON object")
        saved = await asyncio.to_thread(write_node_library, comfy_path, library)
        return _json_response({"ok": True, "library": saved})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.get("/workspace2/templates/library")
async def workspace2_templates_library(_request):
    try:
        library = await asyncio.to_thread(read_template_library, comfy_path)
        return _json_response({"ok": True, "library": library})
    except Exception as exc:
        return _json_error(str(exc), status=500)


@server.PromptServer.instance.routes.post("/workspace2/templates/library")
async def workspace2_templates_library_save(request):
    try:
        data = await request.json()
        library = data.get("library")
        if not isinstance(library, dict):
            return _json_error("Template library must be a JSON object")
        saved = await asyncio.to_thread(write_template_library, comfy_path, library)
        return _json_response({"ok": True, "library": saved})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/trash/restore")
async def workspace2_trash_restore(request):
    try:
        data = await request.json()
        trash_id = _require_relative_path(data.get("trash_id", ""))
        restore_mode = data.get("restore_mode", "original")
        if restore_mode not in {"original", "copy_name"}:
            return _json_error("Unsupported restore mode")
        item = await asyncio.to_thread(
            restore_from_trash,
            get_workflows_root(),
            get_workspace_data_root(),
            trash_id,
            restore_mode,
        )
        return _json_response({"ok": True, "item": item})
    except FileExistsError as exc:
        return _json_error(str(exc), status=409)
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/trash/system_delete")
async def workspace2_trash_system_delete(request):
    try:
        data = await request.json()
        trash_id = _require_relative_path(data.get("trash_id", ""))
        item = await asyncio.to_thread(
            move_trash_item_to_system_trash,
            get_workspace_data_root(),
            trash_id,
        )
        return _json_response({"ok": True, "item": item})
    except Exception as exc:
        return _json_error(str(exc), status=400)


@server.PromptServer.instance.routes.post("/workspace2/trash/empty")
async def workspace2_trash_empty(_request):
    try:
        result = await asyncio.to_thread(
            empty_trash_to_system_trash,
            get_workspace_data_root(),
        )
        return _json_response({"ok": True, **result})
    except Exception as exc:
        return _json_error(str(exc), status=400)
