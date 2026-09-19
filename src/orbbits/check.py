"""Repository validation: useful, not bureaucratic."""

from __future__ import annotations

from orbbits.bit import Bit, ManifestError
from orbbits.engines import KNOWN_ENGINES, EngineError, Issue, NotSupported, get_engine
from orbbits.manifest import KINDS, SLUG_LISTS, SUGGESTED_ROLES
from orbbits.repo import Repo

# Engine names that should not appear in a Bit id: the id names the pedagogical artifact
# ("unit-circle-animation"), the engine lives in bit.yml. `three` and `python` are left out
# because they are ordinary words ("three-body-problem").
TECHNOLOGY_WORDS = (
    "manim",
    "jsxgraph",
    "tikz",
    "latex",
    "react",
    "p5",
    "mafs",
    "matplotlib",
    "blender",
    "pgfplots",
    "geogebra",
    "desmos",
)


def check_bit(repo: Repo, bit: Bit) -> list[Issue]:
    m = bit.manifest
    issues: list[Issue] = []
    where = bit.dir.name  # the physical locator, even when the manifest id disagrees

    def err(msg: str) -> None:
        issues.append(Issue("error", msg, where))

    def warn(msg: str) -> None:
        issues.append(Issue("warning", msg, where))

    if m.id != bit.dir.name:
        err(f"manifest id '{m.id}' does not match directory name '{bit.dir.name}'")
    tech = [w for w in m.id.split("-") if w in TECHNOLOGY_WORDS]
    if tech:
        warn(
            f"id names the technology ('{tech[0]}'); name the pedagogical artifact instead "
            "(e.g. -animation, -explorer, -diagram) and keep the engine in bit.yml"
        )
    if m.engine not in KNOWN_ENGINES:
        warn(f"engine '{m.engine}' is not known to the tooling (known: {', '.join(KNOWN_ENGINES)})")
    if m.role not in SUGGESTED_ROLES:
        warn(f"role '{m.role}' is outside the suggested vocabulary ({', '.join(SUGGESTED_ROLES)})")
    for field in SLUG_LISTS:
        for value in getattr(m, field):
            if value in KNOWN_ENGINES or value in KINDS:
                warn(
                    f"{field} entry '{value}' repeats a kind/engine name; "
                    "tags describe the concept, kind/engine describe the implementation"
                )
    if not bit.readme.is_file():
        warn("no README.md")
    if not bit.src.is_dir() and m.engine not in ("static", "external"):
        err("no src/ directory (editable material)")

    # Locales: the manifest guarantees the tags are valid and default_locale is among them;
    # here we cross-check what is on disk (docs/localization.md).
    if m.language is not None:
        warn("`language:` is the old name of `default_locale:`; rename it (and declare `locales`)")
    files = bit.locale_files()
    if files:
        for tag in m.locales:
            if tag not in files:
                warn(f"locale '{tag}' is declared but locales/ has no file for it")
        for extra in sorted(set(files) - set(m.locales)):
            warn(f"locales/{files[extra].name} exists but '{extra}' is not declared in locales")
    localized = {o.locale for o in m.outputs if o.locale}
    if localized:
        for tag in m.locales:
            if tag not in localized:
                warn(
                    f"outputs are localised but none is declared for locale '{tag}' "
                    "(mark the existing output with `locale:` or add one)"
                )

    for o in m.outputs:
        if not o.file.startswith("dist/"):
            err(f"output '{o.file}' must live under dist/")
        elif not (bit.dir / o.file).is_file():
            if m.status == "draft":
                warn(f"declared output missing: {o.file} (draft; run `orbbits build {m.id}`)")
            else:
                err(f"declared output missing: {o.file} (status '{m.status}' needs built outputs)")

    if m.kind in ("video", "figure", "document") and not m.outputs and m.status != "draft":
        err(f"{m.kind} Bit with status '{m.status}' declares no outputs")

    if m.engine in ("external", "static") and not m.provenance:
        warn("engine is external/static but no provenance is recorded")

    # Publication readiness: usable/curated Bits go to the public site, so a reader should
    # find something human-readable about them: a description in the manifest or a note
    # (brief.md / narrative.md). No particular file is required (docs/bit-spec.md).
    if m.published:
        if not m.description and not (bit.brief.is_file() or bit.narrative.is_file()):
            warn(
                f"status '{m.status}' publishes the Bit but it has neither a description "
                "nor a brief.md / narrative.md"
            )
        for p in m.provenance:
            if not p.license:
                msg = f"published Bit has provenance without a license note: {p.source!r}"
                (err if m.status == "curated" else warn)(msg)

    try:
        issues.extend(get_engine(repo, m.engine).check(bit))
    except NotSupported:
        pass
    except EngineError as exc:
        warn(str(exc))
    return issues


def check_repo(repo: Repo, ids: list[str] | None = None) -> list[Issue]:
    issues: list[Issue] = []
    wanted = set(ids) if ids else None
    for bit_id in repo.bit_ids():
        if wanted is not None and bit_id not in wanted:
            continue
        try:
            bit = repo.load_bit(bit_id)
        except ManifestError as exc:
            issues.append(Issue("error", str(exc), exc.bit_id))
            continue
        issues.extend(check_bit(repo, bit))
    if wanted:
        for missing in sorted(wanted - set(repo.bit_ids())):
            issues.append(Issue("error", "no such Bit", missing))
    return issues
