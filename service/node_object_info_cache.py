"""Persistent cache for the official ComfyUI ``/object_info`` response.

Workspace2 intentionally stores the response as opaque JSON.  ComfyUI builds
``/object_info`` inside a private route-local helper, so recreating it here
would couple this plugin to frontend/server internals.  Keeping the official
payload unchanged lets a valid snapshot be reused across browser profiles and
ComfyUI restarts while the lightweight node signature guards against staleness.
"""

import gzip
import json
import os
import tempfile
import time
import uuid
from threading import Lock
from pathlib import Path


NODE_OBJECT_INFO_CACHE_SCHEMA_VERSION = 1
MAX_NODE_OBJECT_INFO_CACHE_BYTES = 256 * 1024 * 1024
MAX_NODE_OBJECT_INFO_CACHE_CHUNK_BYTES = 512 * 1024

_upload_lock = Lock()
_uploads = {}


def node_object_info_cache_path(comfy_path):
    return (
        Path(comfy_path)
        / "user"
        / "default"
        / "comfyui-workspace2"
        / "node_object_info_cache.json"
    )


def _normalize_cache(data):
    if not isinstance(data, dict):
        return None
    if data.get("schema_version") != NODE_OBJECT_INFO_CACHE_SCHEMA_VERSION:
        return None
    signature = str(data.get("signature") or "").strip()
    object_info = data.get("object_info")
    if not signature or not isinstance(object_info, dict):
        return None
    node_count = data.get("node_count")
    if not isinstance(node_count, int) or node_count != len(object_info):
        return None
    updated_at = data.get("updated_at")
    if not isinstance(updated_at, int) or updated_at <= 0:
        return None
    return {
        "schema_version": NODE_OBJECT_INFO_CACHE_SCHEMA_VERSION,
        "signature": signature,
        "node_count": node_count,
        "updated_at": updated_at,
        "object_info": object_info,
    }


def read_node_object_info_cache(comfy_path, signature="", expected_node_count=None):
    """Return a validated cache entry, optionally requiring live metadata to match."""
    path = node_object_info_cache_path(comfy_path)
    try:
        if not path.is_file() or path.stat().st_size > MAX_NODE_OBJECT_INFO_CACHE_BYTES:
            return None
        with path.open("r", encoding="utf-8") as file:
            cache = _normalize_cache(json.load(file))
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    if cache is None or (signature and cache["signature"] != signature):
        return None
    if expected_node_count is not None and cache["node_count"] != int(expected_node_count):
        return None
    return cache


def write_node_object_info_cache(comfy_path, signature, object_info, expected_node_count=None):
    """Atomically replace the cache after validating the official response shape."""
    clean_signature = str(signature or "").strip()
    if not clean_signature:
        raise ValueError("A node index signature is required.")
    if not isinstance(object_info, dict):
        raise ValueError("object_info must be an object.")
    if expected_node_count is not None and len(object_info) != int(expected_node_count):
        raise ValueError("object_info does not match the registered node count.")

    cache = {
        "schema_version": NODE_OBJECT_INFO_CACHE_SCHEMA_VERSION,
        "signature": clean_signature,
        "node_count": len(object_info),
        "updated_at": int(time.time() * 1000),
        "object_info": object_info,
    }
    path = node_object_info_cache_path(comfy_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.stem}-",
            suffix=".tmp",
            delete=False,
        ) as file:
            temp_path = Path(file.name)
            json.dump(cache, file, ensure_ascii=False, separators=(",", ":"))
            file.flush()
            os.fsync(file.fileno())
        if temp_path.stat().st_size > MAX_NODE_OBJECT_INFO_CACHE_BYTES:
            raise ValueError("The node cache exceeds the maximum supported size.")
        os.replace(temp_path, path)
    except Exception:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise
    return {
        "schema_version": cache["schema_version"],
        "signature": cache["signature"],
        "node_count": cache["node_count"],
        "updated_at": cache["updated_at"],
    }


def begin_node_object_info_cache_upload(comfy_path, signature, expected_node_count):
    """Create an in-process upload session for a gzip-compressed JSON snapshot."""
    clean_signature = str(signature or "").strip()
    if not clean_signature:
        raise ValueError("A node index signature is required.")
    if not isinstance(expected_node_count, int) or expected_node_count <= 0:
        raise ValueError("A registered node count is required.")
    cache_path = node_object_info_cache_path(comfy_path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    upload_id = uuid.uuid4().hex
    upload_path = cache_path.parent / f".{cache_path.stem}-{upload_id}.upload"
    upload_path.touch(exist_ok=False)
    with _upload_lock:
        _uploads[upload_id] = {
            "path": upload_path,
            "signature": clean_signature,
            "expected_node_count": expected_node_count,
            "next_chunk": 0,
            "compressed_bytes": 0,
        }
    return {"upload_id": upload_id, "chunk_bytes": MAX_NODE_OBJECT_INFO_CACHE_CHUNK_BYTES}


def append_node_object_info_cache_upload(upload_id, chunk_index, chunk):
    """Append one bounded chunk, preserving strict chunk order."""
    if not isinstance(chunk, bytes) or not chunk:
        raise ValueError("The cache upload chunk is empty.")
    if len(chunk) > MAX_NODE_OBJECT_INFO_CACHE_CHUNK_BYTES:
        raise ValueError("The cache upload chunk exceeds the supported size.")
    with _upload_lock:
        upload = _uploads.get(str(upload_id or ""))
        if upload is None:
            raise ValueError("The cache upload session is unavailable.")
        if int(chunk_index) != upload["next_chunk"]:
            raise ValueError("The cache upload chunk order is invalid.")
        next_size = upload["compressed_bytes"] + len(chunk)
        if next_size > MAX_NODE_OBJECT_INFO_CACHE_BYTES:
            raise ValueError("The compressed node cache exceeds the maximum supported size.")
        with upload["path"].open("ab") as file:
            file.write(chunk)
        upload["compressed_bytes"] = next_size
        upload["next_chunk"] += 1
        return {"next_chunk": upload["next_chunk"], "compressed_bytes": next_size}


def finish_node_object_info_cache_upload(comfy_path, upload_id):
    """Validate the complete upload and atomically promote it to the cache."""
    with _upload_lock:
        upload = _uploads.pop(str(upload_id or ""), None)
    if upload is None:
        raise ValueError("The cache upload session is unavailable.")
    upload_path = upload["path"]
    try:
        with gzip.open(upload_path, "rb") as file:
            raw = file.read(MAX_NODE_OBJECT_INFO_CACHE_BYTES + 1)
        if len(raw) > MAX_NODE_OBJECT_INFO_CACHE_BYTES:
            raise ValueError("The uncompressed node cache exceeds the maximum supported size.")
        object_info = json.loads(raw.decode("utf-8"))
        return write_node_object_info_cache(
            comfy_path,
            upload["signature"],
            object_info,
            upload["expected_node_count"],
        )
    finally:
        try:
            upload_path.unlink(missing_ok=True)
        except OSError:
            pass


def abort_node_object_info_cache_upload(upload_id):
    """Discard one explicit incomplete upload session."""
    with _upload_lock:
        upload = _uploads.pop(str(upload_id or ""), None)
    if upload is None:
        return False
    try:
        upload["path"].unlink(missing_ok=True)
    except OSError:
        pass
    return True
