"""Create a new Bit from a template."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from orbbits.bit import Bit
from orbbits.manifest import (
    DEFAULT_LOCALE,
    SLUG_RE,
    is_locale,
    normalize_locale,
    normalize_locale_list,
    normalize_slug_list,
)
from orbbits.repo import Repo
from orbbits.slug import is_slug, slugify
from orbbits.templates import Context, Template, get_template, render_template, substitute


class ScaffoldError(Exception):
    pass


@dataclass(frozen=True)
class Scaffolded:
    bit: Bit
    template: Template
    files: list[Path]

    @property
    def next_steps(self) -> list[str]:
        m = self.bit.manifest
        ctx = Context(
            bit_id=m.id,
            title=m.title,
            role=m.role,
            tags=m.tags,
            default_locale=m.default_locale,
            locales=m.locales,
        )
        return [substitute(step, ctx) for step in self.template.next_steps]


def resolve_locales(default_locale: str | None, locales: list[str] | None) -> tuple[str, list[str]]:
    """Language metadata of a new Bit from the CLI options, Italian when nothing is said.

    `--locales en,it` alone makes the first one the default; `--locale` names it explicitly
    and must then be among the locales.
    """
    tags = normalize_locale_list(locales or [])
    default = (
        normalize_locale(default_locale)
        if default_locale
        else (tags[0] if tags else DEFAULT_LOCALE)
    )
    if not tags:
        tags = [default]
    bad = [t for t in (default, *tags) if not is_locale(t)]
    if bad:
        raise ScaffoldError(
            f"not valid language tags (expected BCP-47 like it, en, en-GB): {', '.join(bad)}"
        )
    if default not in tags:
        raise ScaffoldError(
            f"default locale '{default}' is not among the locales ({', '.join(tags)}); "
            "add it or pick another --locale"
        )
    return default, tags


def create_bit(
    repo: Repo,
    *,
    template: str,
    title: str,
    bit_id: str | None = None,
    role: str | None = None,
    tags: list[str] | None = None,
    default_locale: str | None = None,
    locales: list[str] | None = None,
) -> Scaffolded:
    tpl = get_template(repo.templates_dir, template)
    title = title.strip()
    if not title:
        raise ScaffoldError("title must not be empty")
    bit_id = (bit_id or slugify(title)).strip()
    if not is_slug(bit_id):
        raise ScaffoldError(f"'{bit_id}' is not a valid slug (lowercase words separated by dashes)")
    dest = repo.bit_dir(bit_id)
    if dest.exists():
        raise ScaffoldError(f"bits/{bit_id}/ already exists; pick another id")

    tags = normalize_slug_list(tags or [])
    bad = [t for t in tags if not SLUG_RE.match(t)]
    if bad:
        raise ScaffoldError(f"tags must be slugs (lowercase words and dashes): {', '.join(bad)}")

    default_locale, locales = resolve_locales(default_locale, locales)

    ctx = Context(
        bit_id=bit_id,
        title=title,
        role=(role or tpl.role).strip(),
        tags=tags,
        default_locale=default_locale,
        locales=locales,
    )
    files = render_template(tpl, dest, ctx)
    (dest / "dist").mkdir(exist_ok=True)
    return Scaffolded(bit=Bit.load(dest), template=tpl, files=files)
