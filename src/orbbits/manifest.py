"""The bit.yml contract.

Deliberately small. Three orthogonal dimensions describe a Bit:

- kind:   how the runtime renders it (video | interactive | figure | document)
- role:   what it is pedagogically (animation, simulation, diagram, handout, ...) - open vocabulary
- engine: how it is produced (manim, react, jsxgraph, tikz, latex, ...)

Relationships between Bits are expressed with `tags` (many-to-many, non-hierarchical): there is
no `family`, `parent` or `concept` field, on purpose. Publication is derived from `status`.

Language is metadata, not identity: a Bit has one pedagogical identity, `default_locale` names
the language of its canonical realisation and `locales` every language it is realised in
(docs/localization.md). A translation never creates a new Bit; a new medium always does.

Unknown top-level keys are preserved so the manifest can evolve without code changes.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

KINDS = ("video", "interactive", "figure", "document")
STATUSES = ("draft", "usable", "curated")

# Language of newly scaffolded Bits and of a manifest that says nothing (Italian classroom).
DEFAULT_LOCALE = "it"

# Licence of original educational content when a Bit does not say otherwise (docs/licensing.md).
# Software is MIT regardless; third-party material keeps the licence recorded in `provenance`.
DEFAULT_CONTENT_LICENSE = "CC BY-SA 4.0"

# Statuses that make a Bit part of the public site. Maturity doubles as publication state for
# now; split them only if usable-but-private Bits become a real need.
PUBLISHED_STATUSES = ("usable", "curated")

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

# Language tags, BCP-47 in shape but deliberately partial: language[-Script][-REGION] covers
# it, en, ar, en-GB, ar-EG, zh-Hant, sr-Latn-RS. Extlang/variant/extension subtags can be
# admitted the day a Bit needs them; a full parser is not worth carrying until then.
LOCALE_RE = re.compile(r"^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$")

# Lists whose entries are slugs: normalised on load (case, whitespace, underscores, duplicates)
# and rejected when they still are not slugs.
SLUG_LISTS = ("subjects", "topics", "levels", "tags")


def normalize_slug_list(values: list[str]) -> list[str]:
    """Lower-case, trim, turn inner whitespace/underscores into dashes, drop duplicates."""
    out: list[str] = []
    for raw in values:
        v = re.sub(r"[\s_]+", "-", str(raw).strip().lower()).strip("-")
        if v and v not in out:
            out.append(v)
    return out


def normalize_locale(raw: str) -> str:
    """Canonical case and separators: 'IT' -> 'it', 'en_gb' -> 'en-GB', 'sr-latn-rs' ->
    'sr-Latn-RS'.

    Empty input gives ''; other garbage passes through for LOCALE_RE to reject with a message.
    """
    parts = [p for p in re.split(r"[-_\s]+", str(raw).strip()) if p]
    out: list[str] = []
    for i, part in enumerate(parts):
        if i == 0:
            out.append(part.lower())
        elif len(part) == 4 and part.isalpha():
            out.append(part.capitalize())
        elif len(part) == 2 and part.isalpha():
            out.append(part.upper())
        else:
            out.append(part)  # left alone; LOCALE_RE will reject it if it is not a region code
    return "-".join(out)


def normalize_locale_list(values: list[str]) -> list[str]:
    """Normalise every tag and drop duplicates (first occurrence wins)."""
    out: list[str] = []
    for raw in values:
        tag = normalize_locale(raw)
        if tag and tag not in out:
            out.append(tag)
    return out


def is_locale(tag: str) -> bool:
    return bool(LOCALE_RE.match(tag))


def _valid_locale(raw: str) -> str:
    tag = normalize_locale(raw)
    if not is_locale(tag):
        raise ValueError(
            f"'{raw}' is not a language tag (expected BCP-47 like it, en, ar, en-GB, ar-EG)"
        )
    return tag


def bit_path(bit_id: str) -> str:
    """Canonical site route of a Bit: depends on the id only, never on kind/engine/technology."""
    return f"/bits/{bit_id}/"


def bit_url(base: str, bit_id: str) -> str:
    """Absolute or root-relative URL of a Bit under a site base (host and/or path prefix)."""
    return base.rstrip("/") + bit_path(bit_id)


class Output(BaseModel):
    """A classroom-ready artifact under dist/.

    `locale` marks an output that exists in one language (dist/en/animation.mp4); omitted, the
    output is locale-independent (a poster, a formula sheet) and belongs to every locale.
    """

    model_config = ConfigDict(extra="allow")

    format: str
    file: str
    description: str | None = None
    locale: str | None = None

    @field_validator("locale")
    @classmethod
    def _locale_tag(cls, v: str | None) -> str | None:
        return None if v is None else _valid_locale(v)


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
    created: date | None = None

    # Language of the canonical realisation (title, description, the artifact at /bits/<id>/)
    # and every language the Bit is realised in; `locales` defaults to [default_locale].
    default_locale: str = DEFAULT_LOCALE
    locales: list[str] = Field(default_factory=list)
    # `language:` was the field before default_locale/locales (2026-09). Still read as the
    # default locale when the new field is absent, never written back; `check` asks to rename.
    language: str | None = Field(default=None, exclude=True)

    # Licence of the Bit's *original* content when it differs from DEFAULT_CONTENT_LICENSE.
    # Third-party material is licensed per `provenance` entry, never here.
    license: str | None = None

    outputs: list[Output] = Field(default_factory=list)
    provenance: list[Provenance] = Field(default_factory=list)

    # Optional, evolvable taxonomy. Discovery derives from these, never from directory depth.
    # subjects/topics/levels place the Bit in a curriculum; tags relate Bits to each other
    # (the same concept across media, shared ideas) and drive the catalog filter.
    subjects: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    levels: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

    # Engine-specific build options (e.g. manim scene, tex compiler). Interpreted by the engine.
    build: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _legacy_language(cls, data: Any) -> Any:
        if isinstance(data, dict) and data.get("language") and not data.get("default_locale"):
            data = {**data, "default_locale": data["language"]}
        return data

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

    @field_validator(*SLUG_LISTS, mode="before")
    @classmethod
    def _slug_list(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            v = [v]
        if not isinstance(v, list):
            raise ValueError("must be a list of slugs")
        values = normalize_slug_list([str(x) for x in v])
        bad = [x for x in values if not SLUG_RE.match(x)]
        if bad:
            raise ValueError(f"not valid slugs: {', '.join(repr(b) for b in bad)}")
        return values

    @field_validator("default_locale")
    @classmethod
    def _default_locale_tag(cls, v: str) -> str:
        return _valid_locale(v)

    @field_validator("locales", mode="before")
    @classmethod
    def _locale_list(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            v = [v]
        if not isinstance(v, list):
            raise ValueError("must be a list of language tags")
        values = normalize_locale_list([str(x) for x in v])
        bad = [x for x in values if not is_locale(x)]
        if bad:
            raise ValueError(f"not valid language tags: {', '.join(repr(b) for b in bad)}")
        return values

    @model_validator(mode="after")
    def _locales_consistent(self) -> Manifest:
        if not self.locales:
            self.locales = [self.default_locale]
        elif self.default_locale not in self.locales:
            raise ValueError(
                f"default_locale '{self.default_locale}' must be one of locales "
                f"[{', '.join(self.locales)}]"
            )
        for o in self.outputs:
            if o.locale is not None and o.locale not in self.locales:
                raise ValueError(
                    f"output '{o.file}' has locale '{o.locale}', which is not among locales "
                    f"[{', '.join(self.locales)}]"
                )
        return self

    @property
    def published(self) -> bool:
        """Whether the Bit belongs to the public site (derived from status, not a flag)."""
        return self.status in PUBLISHED_STATUSES

    @property
    def path(self) -> str:
        return bit_path(self.id)

    @property
    def content_license(self) -> str:
        """Licence of the Bit's original content: its own `license`, else the repository default."""
        return self.license or DEFAULT_CONTENT_LICENSE

    def to_yaml(self) -> str:
        data = self.model_dump(mode="json", exclude_none=True)
        # Drop empty optional collections so scaffolds stay short.
        for key in ("outputs", "provenance", *SLUG_LISTS, "build"):
            if not data.get(key):
                data.pop(key, None)
        return yaml.safe_dump(data, sort_keys=False, allow_unicode=True)


def parse_manifest(text: str) -> Manifest:
    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError("bit.yml must be a mapping")
    return Manifest.model_validate(data)
