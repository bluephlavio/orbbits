"""A Bit is a directory under bits/<id>/ with a bit.yml manifest, src/, dist/ and its notes.

Documentation files, all optional but expected for substantial Bits:
- README.md     technical notes (implementation, build, decisions) for maintainers and agents;
- brief.md      pedagogical specification, engine-independent (intent, essential relations,
                required elements, progression, pitfalls) - what an agent reads to re-create
                the concept in another medium;
- narrative.md  reusable classroom prose (what to say, ask, caption) and notes after use.

Localised strings, when a Bit needs them, live in locales/<tag>.yml (docs/localization.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pydantic import ValidationError

from orbbits.manifest import Manifest, parse_manifest

MANIFEST_NAME = "bit.yml"
README_NAME = "README.md"
BRIEF_NAME = "brief.md"
NARRATIVE_NAME = "narrative.md"
LOCALES_DIRNAME = "locales"


class ManifestError(Exception):
    def __init__(self, bit_dir: Path, message: str):
        self.bit_dir = bit_dir
        self.bit_id = bit_dir.name
        super().__init__(message)


@dataclass(frozen=True)
class Bit:
    dir: Path
    manifest: Manifest

    @property
    def id(self) -> str:
        return self.manifest.id

    @property
    def manifest_path(self) -> Path:
        return self.dir / MANIFEST_NAME

    @property
    def src(self) -> Path:
        return self.dir / "src"

    @property
    def dist(self) -> Path:
        return self.dir / "dist"

    @property
    def build_dir(self) -> Path:
        """Scratch space for intermediate build products; never versioned."""
        return self.dir / ".build"

    @property
    def locales_dir(self) -> Path:
        """Per-language string files (locales/it.yml, locales/en.yml); optional."""
        return self.dir / LOCALES_DIRNAME

    def locale_files(self) -> dict[str, Path]:
        """Language tag -> file, for whatever is in locales/ (it.yml, en.tex, ...)."""
        if not self.locales_dir.is_dir():
            return {}
        return {p.stem: p for p in sorted(self.locales_dir.iterdir()) if p.is_file()}

    @property
    def readme(self) -> Path:
        return self.dir / README_NAME

    @property
    def brief(self) -> Path:
        return self.dir / BRIEF_NAME

    @property
    def narrative(self) -> Path:
        return self.dir / NARRATIVE_NAME

    @classmethod
    def load(cls, bit_dir: Path) -> Bit:
        path = bit_dir / MANIFEST_NAME
        if not path.is_file():
            raise ManifestError(bit_dir, f"missing {MANIFEST_NAME}")
        try:
            manifest = parse_manifest(path.read_text(encoding="utf-8"))
        except ValidationError as exc:
            lines = []
            for err in exc.errors():
                loc = ".".join(str(x) for x in err["loc"]) or "manifest"
                lines.append(f"{loc}: {err['msg']}")
            raise ManifestError(bit_dir, "invalid manifest: " + "; ".join(lines)) from exc
        except Exception as exc:  # yaml errors and the like
            raise ManifestError(bit_dir, f"cannot parse {MANIFEST_NAME}: {exc}") from exc
        return cls(dir=bit_dir, manifest=manifest)
