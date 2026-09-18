"""Engine registry: engine name (from bit.yml) -> Engine.

Web-family engines all share WebEngine; adding another web library is a template plus one
entry in WEB_ENGINES.
"""

from __future__ import annotations

from orbbits.engines.base import Engine, EngineError, Issue, NotSupported, ToolMissing
from orbbits.engines.manim import ManimEngine
from orbbits.engines.python import PythonEngine
from orbbits.engines.tex import TexEngine, TikzEngine
from orbbits.engines.web import WebEngine
from orbbits.repo import Repo

WEB_ENGINES = ("react", "jsxgraph", "p5", "mafs", "three")

ENGINES: dict[str, type[Engine]] = {
    "manim": ManimEngine,
    "tikz": TikzEngine,
    "latex": TexEngine,
    "python": PythonEngine,
    "matplotlib": PythonEngine,
}

# Engines that are valid in a manifest but have no build pipeline (provenance-only Bits).
PASSIVE_ENGINES = ("static", "external", "blender")

KNOWN_ENGINES = (*ENGINES, *WEB_ENGINES, *PASSIVE_ENGINES)


def is_web_engine(name: str) -> bool:
    return name in WEB_ENGINES


def get_engine(repo: Repo, name: str) -> Engine:
    if name in WEB_ENGINES:
        return WebEngine(repo, name)
    cls = ENGINES.get(name)
    if cls is None:
        if name in PASSIVE_ENGINES:
            raise NotSupported(
                f"engine '{name}' has no build pipeline; outputs are maintained by hand"
            )
        raise EngineError(f"unknown engine '{name}' (known: {', '.join(KNOWN_ENGINES)})")
    return cls(repo)


__all__ = [
    "ENGINES",
    "KNOWN_ENGINES",
    "PASSIVE_ENGINES",
    "WEB_ENGINES",
    "Engine",
    "EngineError",
    "Issue",
    "NotSupported",
    "ToolMissing",
    "get_engine",
    "is_web_engine",
]
