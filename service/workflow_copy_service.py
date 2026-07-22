"""Safe, collision-resistant workflow-file duplication."""

import re
import shutil

from .safe_path import safe_join, safe_relative_path


_COPY_SUFFIX_RE = re.compile(
    r"(?:\s*\(copy(?:\s+\d+)?\)|\s*\(副本\s*\d+\)|\s*（副本\s*\d+）)$",
    re.IGNORECASE,
)


def _copy_base_stem(stem):
    """Remove WorkspaceKit copy suffixes so copying a copy continues one series."""
    base = stem
    while True:
        normalized = _COPY_SUFFIX_RE.sub("", base).rstrip()
        if normalized == base:
            return base
        base = normalized


def _copy_name(stem, index, locale):
    base = _copy_base_stem(stem)
    if str(locale or "").lower().startswith("zh"):
        return f"{base}（副本 {index}）"
    return f"{base} (Copy {index})"


def copy_workflow_file(workflows_root, relative_path, locale="en-US"):
    """Copy one JSON workflow next to its source without overwriting a file.

    The exclusive destination create is intentional: two browser tabs may ask
    to copy the same workflow at the same time.  `exists()` alone would race
    and `shutil.copy2(source, target)` would overwrite the first copy.
    """
    source = safe_join(workflows_root, relative_path)
    if not source.is_file() or source.suffix.lower() != ".json":
        raise FileNotFoundError("Workflow file not found")

    stem = source.stem
    suffix = source.suffix
    index = 1
    while True:
        target = source.with_name(f"{_copy_name(stem, index, locale)}{suffix}")
        try:
            with source.open("rb") as input_file, target.open("xb") as output_file:
                shutil.copyfileobj(input_file, output_file)
            shutil.copystat(source, target)
            return safe_relative_path(workflows_root, target)
        except FileExistsError:
            index += 1
