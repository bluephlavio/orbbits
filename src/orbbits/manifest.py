"""The bit.yml contract.

Deliberately small. Three orthogonal dimensions describe a Bit:

- kind:   how the runtime renders it (video | interactive | figure | document)
- role:   what it is pedagogically (animation, simulation, diagram, handout, ...) - open vocabulary
- engine: how it is produced (manim, react, jsxgraph, tikz, latex, ...)

Unknown top-level keys are preserved so the manifest can evolve without code changes.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator

KINDS = ("video", "interactive", "figure", "document")
STATUSES = ("draft", "usable", "curated")

# Suggested roles; not enforced. Kept here so tooling (and agents) share one list.
SUGGESTED_ROLES = (
    "animation",
    "simulation",
    "explorable",
    "dynamic-geometry",
    "diagram",
    "plot",
    "data-visualization",
    "map",
    "illustration",
    "model",
    "annotated-source",
    "handout",
)

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class Output(BaseModel):
    """A classroom-ready artifact under dist/."""

    model_config = ConfigDict(extra="allow")

    format: str
    file: str
    description: str | None = None


class Provenance(BaseModel):
    """Where third-party or historical material comes from. Free-form but structured."""

    model_config = ConfigDict(extra="allow")

    source: str
    author: str | None = None
    url: str | None = None
    license: str | None = None
    modifications: str | None = None
    retrieved: date | str | None = None
    notes: str | None = None


class Manifest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    title: str
    kind: str
    role: str
    engine: str
    status: str = "draft"

    description: str | None = None
    language: str | None = None
    created: date | None = None

    outputs: list[Output] = Field(default_factory=list)
    provenance: list[Provenance] = Field(default_factory=list)

    # Optional, evolvable taxonomy. Discovery derives from these, never from directory depth.
    subjects: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    levels: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

    # Engine-specific build options (e.g. manim scene, tex compiler). Interpreted by the engine.
    build: dict[str, Any] = Field(default_factory=dict)

    @field_validator("id")
    @classmethod
    def _id_is_slug(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError(
                f"'{v}' is not a valid slug (lowercase words separated by single dashes)"
            )
        return v

    @field_validator("kind")
    @classmethod
    def _known_kind(cls, v: str) -> str:
        if v not in KINDS:
            raise ValueError(f"unknown kind '{v}' (expected one of {', '.join(KINDS)})")
        return v

    @field_validator("status")
    @classmethod
    def _known_status(cls, v: str) -> str:
        if v not in STATUSES:
            raise ValueError(f"unknown status '{v}' (expected one of {', '.join(STATUSES)})")
        return v

    @field_validator("title", "role", "engine")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v.strip()

    def to_yaml(self) -> str:
        data = self.model_dump(mode="json", exclude_none=True)
        # Drop empty optional collections so scaffolds stay short.
        for key in ("outputs", "provenance", "subjects", "topics", "levels", "tags", "build"):
            if not data.get(key):
                data.pop(key, None)
        return yaml.safe_dump(data, sort_keys=False, allow_unicode=True)


def parse_manifest(text: str) -> Manifest:
    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError("bit.yml must be a mapping")
    return Manifest.model_validate(data)
