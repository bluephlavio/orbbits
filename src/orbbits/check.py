"""Repository validation: useful, not bureaucratic."""

from __future__ import annotations

from orbbits.bit import Bit, ManifestError
from orbbits.engines import KNOWN_ENGINES, EngineError, Issue, NotSupported, get_engine
from orbbits.manifest import SUGGESTED_ROLES
from orbbits.repo import Repo


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
    if m.engine not in KNOWN_ENGINES:
        warn(f"engine '{m.engine}' is not known to the tooling (known: {', '.join(KNOWN_ENGINES)})")
    if m.role not in SUGGESTED_ROLES:
        warn(f"role '{m.role}' is outside the suggested vocabulary ({', '.join(SUGGESTED_ROLES)})")
    if not (bit.dir / "README.md").is_file():
        warn("no README.md")
    if not bit.src.is_dir() and m.engine not in ("static", "external"):
        err("no src/ directory (editable material)")

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
