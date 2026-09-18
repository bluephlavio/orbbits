"""Stable semantic slugs for Bit identifiers."""

from __future__ import annotations

import re
import unicodedata

from orbbits.manifest import SLUG_RE


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-")


def is_slug(text: str) -> bool:
    return bool(SLUG_RE.match(text))


def pascal_case(slug: str) -> str:
    """angle-as-rotation -> AngleAsRotation (for class/component names in templates)."""
    parts = [p for p in re.split(r"[^a-zA-Z0-9]+", slug) if p]
    name = "".join(p[:1].upper() + p[1:] for p in parts)
    if not name or name[0].isdigit():
        name = "Bit" + name
    return name
