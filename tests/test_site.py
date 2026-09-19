"""End-to-end check of the public site build, as CI runs it (docs/publishing.md).

Builds the real repository's site into a temporary directory with a non-root base path and
verifies the publication rule and URL generation against the Python model:
- every published Bit (usable/curated) gets /bits/<id>/index.html, drafts get nothing and
  none of their code ships;
- every generated link and asset URL carries the base path;
- the page speaks the Bit's default locale, the interactive mount receives it, and the
  licence split is stated (docs/localization.md, docs/licensing.md);
- the repository link comes from the build environment and is omitted, never guessed,
  when nothing is known (docs/publishing.md).

Skipped when the web runtime is not installed (`pnpm install`).
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from orbbits.repo import Repo

REAL_ROOT = Path(__file__).resolve().parents[1]
ASTRO = REAL_ROOT / "node_modules" / ".bin" / "astro"
BASE = "/orbbits/"
REPO_URL = "https://example.test/someone/orbbits"
DRAFT_ID = "test-draft-site-exclusion"
# What GitHub Actions exports about the repository it is building (astro.config falls back
# to it); the tests decide themselves whether the build knows a repository.
CI_REPO_VARS = ("GITHUB_SERVER_URL", "GITHUB_REPOSITORY")

pytestmark = pytest.mark.skipif(
    not ASTRO.exists() or not shutil.which("pnpm"), reason="web runtime not installed"
)


def build_site(out: Path, **env: str) -> None:
    clean = {k: v for k, v in os.environ.items() if k not in (*CI_REPO_VARS, "ORBBITS_REPO")}
    subprocess.run(
        ["pnpm", "exec", "astro", "build", "--root", str(REAL_ROOT / "web")],
        cwd=REAL_ROOT,
        check=True,
        capture_output=True,
        env={
            **clean,
            "ORBBITS_BASE": BASE,
            "ORBBITS_SITE": "https://example.test",
            "ORBBITS_OUT_DIR": str(out),
            **env,
        },
    )


@pytest.fixture(scope="module")
def site(tmp_path_factory) -> tuple[Path, Repo]:
    repo = Repo(REAL_ROOT)
    out = tmp_path_factory.mktemp("site")
    draft = repo.bit_dir(DRAFT_ID)
    if draft.exists():
        pytest.skip(f"stray {draft} from an earlier run; remove it")
    # A throwaway draft interactive Bit in the real bits/ directory, removed afterwards.
    (draft / "src").mkdir(parents=True)
    (draft / "bit.yml").write_text(
        f"id: {DRAFT_ID}\ntitle: Draft\nkind: interactive\nrole: explorable\nengine: react\n"
        "status: draft\ntags: [zz-draft-only]\n"
    )
    (draft / "src" / "index.tsx").write_text(
        "export default function Draft() { return <p className='zz-draft-marker'>draft</p>; }\n"
    )
    try:
        build_site(out, ORBBITS_REPO=REPO_URL)
    finally:
        shutil.rmtree(draft, ignore_errors=True)
    return out, repo


def test_published_bits_get_canonical_pages_and_drafts_do_not(site):
    out, repo = site
    bits, _ = repo.scan()
    published = [b for b in bits if b.manifest.published and b.id != DRAFT_ID]
    assert published, "the repository should have at least one usable Bit"
    for bit in published:
        page = out / "bits" / bit.id / "index.html"
        assert page.is_file(), f"missing canonical page for {bit.id}"
        assert f'href="https://example.test{BASE}bits/{bit.id}/"' in page.read_text()
    assert not (out / "bits" / DRAFT_ID).exists()
    home = (out / "index.html").read_text()
    for bit in published:
        assert f'href="{BASE}bits/{bit.id}/"' in home
    assert DRAFT_ID not in home and "zz-draft-only" not in home


def test_draft_code_does_not_ship(site):
    out, _ = site
    for path in out.rglob("*"):
        if path.suffix in (".js", ".css", ".html"):
            assert "zz-draft-marker" not in path.read_text(errors="ignore"), path


def test_every_url_carries_the_base_path(site):
    out, _ = site
    for page in out.rglob("*.html"):
        html = page.read_text()
        for url in re.findall(r'(?:href|src|component-url|renderer-url)="([^"]+)"', html):
            if url.startswith(("data:", "http", "#")):
                continue
            assert url.startswith(BASE), f"{page.relative_to(out)}: {url}"
    assert (out / ".nojekyll").exists()


def test_pages_carry_locale_and_licensing(site):
    out, repo = site
    home = (out / "index.html").read_text()
    assert 'lang="it"' in home
    assert 'href="https://creativecommons.org/licenses/by-sa/4.0/deed.it"' in home
    assert "CC BY-SA 4.0" in home and "MIT" in home
    for bit in (b for b in repo.scan()[0] if b.manifest.published and b.id != DRAFT_ID):
        page = (out / "bits" / bit.id / "index.html").read_text()
        assert f'lang="{bit.manifest.default_locale}"' in page
        assert "Licenza" in page and bit.manifest.content_license in page
        for tag in bit.manifest.locales:
            assert f"<code>{tag}</code>" in page
        if bit.manifest.kind == "interactive":
            # The island props are serialised into the page; the Bit is mounted in its locale.
            assert f"&quot;locale&quot;:[0,&quot;{bit.manifest.default_locale}&quot;]" in page
        for p in bit.manifest.provenance:
            assert p.source.split(",")[0] in page and (p.license or "") in page


def test_repository_link_comes_from_the_build_environment(site, tmp_path):
    out, _ = site
    home = (out / "index.html").read_text()
    assert f'href="{REPO_URL}"' in home
    assert f'href="{REPO_URL}/blob/HEAD/LICENSE"' in home

    # GitHub Actions: the repository being built, with no configuration in the workflow.
    gh = tmp_path / "gh"
    build_site(gh, GITHUB_SERVER_URL="https://github.com", GITHUB_REPOSITORY="someone/orbbits")
    assert 'href="https://github.com/someone/orbbits"' in (gh / "index.html").read_text()

    # Nothing known: no repository link, no guessed one, the licence still named and linked.
    bare = tmp_path / "bare"
    build_site(bare)
    home = (bare / "index.html").read_text()
    assert "github" not in home and REPO_URL not in home
    assert "MIT" in home and "CC BY-SA 4.0" in home
