"""Manim animations: render the main Scene to dist/<id>.mp4 plus a poster frame.

Localised Bits render once per locale that declares outputs (ORBBITS_LOCALE in the scene's
environment; docs/localization.md), e.g. dist/it/<id>.mp4 and dist/en/<id>.mp4.
"""

from __future__ import annotations

import importlib.util
import re
import shutil
import sys
from pathlib import Path

from orbbits.bit import Bit
from orbbits.engines.base import LOCALE_ENV, Engine, EngineError, Issue

SCENE_RE = re.compile(r"^class\s+(\w+)\s*\(\s*[\w.]*Scene\w*\s*\)", re.MULTILINE)


class ManimEngine(Engine):
    name = "manim"
    template = "manim"

    def _scene_file(self, bit: Bit) -> Path:
        return self.main_source(bit, ".py", ("scene.py",))

    def _scene_name(self, bit: Bit, scene_file: Path) -> str:
        configured = bit.manifest.build.get("scene")
        if configured:
            return str(configured)
        found = SCENE_RE.findall(scene_file.read_text(encoding="utf-8"))
        if not found:
            raise EngineError(f"no Scene subclass found in {scene_file.relative_to(bit.dir)}")
        return found[0]

    def check(self, bit: Bit) -> list[Issue]:
        issues: list[Issue] = []
        try:
            scene_file = self._scene_file(bit)
            self._scene_name(bit, scene_file)
        except EngineError as exc:
            issues.append(Issue("error", str(exc), bit.id))
        if not self.declared_outputs(bit, "mp4", "webm"):
            issues.append(Issue("warning", "no mp4/webm output declared in bit.yml", bit.id))
        return issues

    def build(self, bit: Bit, *, quick: bool = False) -> list[Path]:
        if importlib.util.find_spec("manim") is None:
            raise EngineError("manim is not installed in this environment (uv sync --group manim)")
        scene_file = self._scene_file(bit)
        scene = self._scene_name(bit, scene_file)

        if quick:
            # Preview in the default language only; a quick render is for pacing and layout.
            video = self._render(bit, scene_file, scene, "l", bit.manifest.default_locale)
            preview = bit.build_dir / "preview" / f"{bit.id}.mp4"
            preview.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(video, preview)
            return [preview]

        quality = str(bit.manifest.build.get("quality", "h"))
        poster_at = bit.manifest.build.get("poster", "last")
        written: list[Path] = []
        for locale, outputs in self.locale_runs(bit):
            video = self._render(bit, scene_file, scene, quality, locale)
            videos = [bit.dir / o.file for o in outputs if o.format == "mp4"]
            if not bit.manifest.outputs:
                videos = [bit.dist / f"{bit.id}.mp4"]
            for dest in videos:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(video, dest)
                written.append(dest)
            for o in outputs:
                if o.format in ("webp", "png", "jpg"):
                    self._poster(video, bit.dir / o.file, poster_at)
                    written.append(bit.dir / o.file)
        return written

    def _render(self, bit: Bit, scene_file: Path, scene: str, quality: str, locale: str) -> Path:
        """Render one scene in one language; returns the mp4 inside the media directory."""
        media = bit.build_dir / "manim" / locale
        media.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            "-m",
            "manim",
            "render",
            f"-q{quality}",
            "--media_dir",
            str(media),
            "--format",
            "mp4",
            "-o",
            f"{bit.id}.mp4",
            str(scene_file),
            scene,
        ]
        self.run(cmd, cwd=bit.dir, env={LOCALE_ENV: locale})
        rendered = sorted(media.glob(f"videos/**/{bit.id}.mp4"), key=lambda p: p.stat().st_mtime)
        if not rendered:
            raise EngineError("manim finished but no mp4 was produced")
        return rendered[-1]

    def _poster(self, video: Path, dest: Path, which: str | float) -> None:
        ffmpeg = self.require("ffmpeg", "needed to extract the poster frame")
        dest.parent.mkdir(parents=True, exist_ok=True)
        if which == "first":
            seek = ["-ss", "0"]
        elif which == "last":
            seek = ["-sseof", "-0.2"]  # a frame within the last 0.2 s
        else:
            seek = ["-ss", str(float(which))]
        # Single still frame; force the non-animated encoder for webp (the muxer would animate).
        codec = ["-c:v", "libwebp", "-quality", "85"] if dest.suffix.lower() == ".webp" else []
        self.run(
            [
                ffmpeg,
                "-y",
                "-loglevel",
                "error",
                *seek,
                "-i",
                str(video),
                "-frames:v",
                "1",
                "-update",
                "1",
                *codec,
                str(dest),
            ],
            cwd=video.parent,
        )

    def dev(self, bit: Bit) -> None:
        out = self.build(bit, quick=True)
        print(f"quick render: {out[0]}")
