"""Collision-free naming for items promoted out of a folder.

A dissolved folder's children move into the parent, where a name may already be
taken. Appending a sequence number keeps the operation whole instead of
refusing it, which matters most for deep hierarchies: one collision six levels
down would otherwise block the whole dissolve.

The suffix is a bare number, not the `（副本 N）` used by
`workflow_copy_service`. Nothing is duplicated here - the item is the original,
moved - so calling it a copy would misreport what happened.
"""

import re


# Matches a trailing sequence suffix in either width so renaming an
# already-renamed item continues one series instead of nesting suffixes.
_SEQUENCE_SUFFIX_RE = re.compile(r"(?:\s*\(\s*\d+\s*\)|\s*（\s*\d+\s*）)$")


def _base_stem(stem):
    base = stem
    while True:
        normalized = _SEQUENCE_SUFFIX_RE.sub("", base).rstrip()
        if normalized == base:
            return base
        base = normalized


def _sequenced(stem, index, locale):
    base = _base_stem(stem) or stem
    if str(locale or "").lower().startswith("zh"):
        return f"{base}（{index}）"
    return f"{base} ({index})"


def split_name(name, is_dir):
    """Split a child name into the part to number and the part to preserve.

    Folder names have no extension to protect, so the whole name is numbered.
    A file keeps its extension: `flow.json` must become `flow (2).json`, never
    `flow.json (2)`, or ComfyUI stops recognizing it as a workflow.
    """
    text = str(name)
    if is_dir:
        return text, ""
    index = text.rfind(".")
    if index <= 0:
        return text, ""
    return text[:index], text[index:]


def unique_name(name, is_dir, taken, locale="en-US", limit=1000):
    """Return `name`, or the first free `base (N)` variant.

    `taken` holds casefolded names that are unavailable. Case folding is
    required rather than defensive: Windows treats `Flow.json` and `flow.json`
    as one file, so a case-sensitive check would hand back a name that then
    fails to move.
    """
    stem, suffix = split_name(name, is_dir)
    reserved = {str(item).casefold() for item in (taken or ())}
    if str(name).casefold() not in reserved:
        return str(name)
    for index in range(2, limit + 2):
        candidate = f"{_sequenced(stem, index, locale)}{suffix}"
        if candidate.casefold() not in reserved:
            return candidate
    raise FileExistsError(f"No available name for: {name}")


def resolve_names(children, taken, locale="en-US"):
    """Assign every child a final name up front, before anything is moved.

    Returned as a list of `(child, final_name, renamed)` in input order.

    Each accepted name joins the reserved set immediately. Two children can
    otherwise be handed the same replacement - a source holding both `flow` and
    `flow (2)`, promoted into a parent that already holds both, would send each
    of them to `flow (3)` and lose one.
    """
    reserved = {str(item).casefold() for item in (taken or ())}
    resolved = []
    for child, is_dir in children:
        original = str(child)
        final = unique_name(original, is_dir, reserved, locale)
        reserved.add(final.casefold())
        resolved.append((child, final, final != original))
    return resolved
