"""Create a new Bit from a template."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from orbbits.bit import Bit
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
        ctx = Context(
            bit_id=self.bit.id, title=self.bit.manifest.title, role=self.bit.manifest.role
        )
        return [substitute(step, ctx) for step in self.template.next_steps]


def create_bit(
    repo: Repo,
    *,
    template: str,
    title: str,
    bit_id: str | None = None,
    role: str | None = None,
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

    ctx = Context(bit_id=bit_id, title=title, role=(role or tpl.role).strip())
    files = render_template(tpl, dest, ctx)
    (dest / "dist").mkdir(exist_ok=True)
    return Scaffolded(bit=Bit.load(dest), template=tpl, files=files)
