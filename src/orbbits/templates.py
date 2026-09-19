"""Templates live in templates/<name>/ and are plain files with a few __PLACEHOLDERS__.

Each template directory has a template.yml describing the Bit it produces (kind, engine,
default role). Adding a template needs no Python change.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field

from orbbits.manifest import DEFAULT_LOCALE
from orbbits.slug import pascal_case

TEMPLATE_META = "template.yml"

# Files copied verbatim (no placeholder substitution) based on suffix.
BINARY_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".pdf",
    ".mp4",
    ".webm",
    ".woff",
    ".woff2",
}


class Template(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str
    description: str
    kind: str
    engine: str
    role: str
    next_steps: list[str] = Field(default_factory=list)
    dir: Path


class TemplateNotFound(Exception):
    pass


def load_templates(templates_dir: Path) -> list[Template]:
    templates: list[Template] = []
    if not templates_dir.is_dir():
        return templates
    for d in sorted(templates_dir.iterdir()):
        meta = d / TEMPLATE_META
        if d.is_dir() and meta.is_file():
            data = yaml.safe_load(meta.read_text(encoding="utf-8")) or {}
            data.setdefault("name", d.name)
            templates.append(Template.model_validate({**data, "dir": d}))
    return templates


def get_template(templates_dir: Path, name: str) -> Template:
    for t in load_templates(templates_dir):
        if t.name == name:
            return t
    known = ", ".join(t.name for t in load_templates(templates_dir)) or "none"
    raise TemplateNotFound(f"unknown template '{name}' (available: {known})")


@dataclass
class Context:
    bit_id: str
    title: str
    role: str
    tags: list[str] = field(default_factory=list)
    default_locale: str = DEFAULT_LOCALE
    locales: list[str] = field(default_factory=lambda: [DEFAULT_LOCALE])
    today: date = field(default_factory=date.today)

    def placeholders(self) -> dict[str, str]:
        return {
            "__BIT_ID__": self.bit_id,
            "__BIT_TITLE__": self.title,
            "__BIT_ROLE__": self.role,
            "__BIT_CLASS__": pascal_case(self.bit_id),
            "__BIT_DATE__": self.today.isoformat(),
            # YAML flow list bodies: `tags: [__BIT_TAGS__]` -> `tags: []` or `tags: [a, b]`.
            "__BIT_TAGS__": ", ".join(self.tags),
            "__BIT_LOCALE__": self.default_locale,
            "__BIT_LOCALES__": ", ".join(self.locales),
        }


def substitute(text: str, ctx: Context) -> str:
    for key, value in ctx.placeholders().items():
        text = text.replace(key, value)
    return text


def render_template(template: Template, dest: Path, ctx: Context) -> list[Path]:
    """Copy the template tree into `dest`, substituting placeholders in text files."""
    written: list[Path] = []
    for src in sorted(template.dir.rglob("*")):
        rel = src.relative_to(template.dir)
        if rel.parts[0] == TEMPLATE_META:
            continue
        target = dest / substitute(str(rel), ctx)
        if src.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix.lower() in BINARY_SUFFIXES:
            shutil.copy2(src, target)
        else:
            target.write_text(substitute(src.read_text(encoding="utf-8"), ctx), encoding="utf-8")
        written.append(target)
    return written
