import pytest

from orbbits.bit import Bit
from orbbits.scaffold import ScaffoldError, create_bit
from orbbits.templates import Context, load_templates, substitute

EXPECTED_TEMPLATES = {"manim", "web", "jsxgraph", "tikz", "latex"}


def test_all_templates_are_discovered(repo):
    assert {t.name for t in load_templates(repo.templates_dir)} == EXPECTED_TEMPLATES


@pytest.mark.parametrize("template", sorted(EXPECTED_TEMPLATES))
def test_every_template_scaffolds_a_valid_bit(repo, template):
    result = create_bit(repo, template=template, title="Rømer and the Io eclipses")
    bit = result.bit
    assert bit.id == "rmer-and-the-io-eclipses"
    assert bit.dir == repo.bit_dir(bit.id)
    assert bit.manifest.kind == result.template.kind
    assert bit.manifest.engine == result.template.engine
    assert bit.manifest.role == result.template.role
    assert bit.manifest.status == "draft"
    assert (bit.dir / "README.md").is_file()
    assert bit.src.is_dir() and any(bit.src.iterdir())
    assert bit.dist.is_dir()
    # No placeholder survives anywhere in the scaffold.
    for path in bit.dir.rglob("*"):
        if path.is_file():
            assert "__BIT_" not in path.read_text(), path
    # Loading from disk agrees with what scaffolding returned.
    assert Bit.load(bit.dir).manifest == bit.manifest
    assert result.next_steps and all("__BIT_" not in s for s in result.next_steps)


def test_explicit_id_and_role(repo):
    result = create_bit(
        repo, template="tikz", title="Whatever", bit_id="mercator-rhumb-lines", role="map"
    )
    assert result.bit.id == "mercator-rhumb-lines"
    assert result.bit.manifest.role == "map"
    assert result.bit.manifest.title == "Whatever"


def test_refuses_to_overwrite(repo):
    create_bit(repo, template="web", title="Projectile motion")
    with pytest.raises(ScaffoldError, match="already exists"):
        create_bit(repo, template="web", title="Projectile motion")


def test_rejects_bad_slug(repo):
    with pytest.raises(ScaffoldError, match="not a valid slug"):
        create_bit(repo, template="web", title="X", bit_id="Not A Slug")


def test_class_placeholder_uses_pascal_case(repo):
    result = create_bit(repo, template="manim", title="angle as rotation")
    assert "class AngleAsRotation(Scene)" in (result.bit.src / "scene.py").read_text()


def test_substitute_covers_all_placeholders():
    ctx = Context(bit_id="a-b", title="A B", role="diagram")
    out = substitute("__BIT_ID__ __BIT_TITLE__ __BIT_ROLE__ __BIT_CLASS__ __BIT_DATE__", ctx)
    assert out.startswith("a-b A B diagram AB ")
    assert "__BIT_" not in out


@pytest.mark.parametrize("template", sorted(EXPECTED_TEMPLATES))
def test_scaffold_includes_documentation_files(repo, template):
    bit = create_bit(repo, template=template, title="Docs check").bit
    assert bit.readme.is_file() and bit.brief.is_file() and bit.narrative.is_file()
    brief = bit.brief.read_text()
    for heading in (
        "# Intent",
        "# Essential relations",
        "# Required elements",
        "# Didactic progression",
        "# Misconceptions",
    ):
        assert heading in brief
    assert bit.readme.read_text().startswith("# Docs check")
    assert "tags: []" in (bit.dir / "bit.yml").read_text()
    assert bit.manifest.tags == []


def test_scaffold_with_tags(repo):
    bit = create_bit(
        repo,
        template="manim",
        title="Unit circle animation",
        tags=["Unit Circle", "trigonometry", "unit_circle"],
    ).bit
    assert bit.manifest.tags == ["unit-circle", "trigonometry"]
    assert "tags: [unit-circle, trigonometry]" in (bit.dir / "bit.yml").read_text()


def test_scaffold_rejects_bad_tags(repo):
    with pytest.raises(ScaffoldError, match="tags must be slugs"):
        create_bit(repo, template="manim", title="X", tags=["unit/circle"])


# --- locales (docs/localization.md) -------------------------------------------------------


@pytest.mark.parametrize("template", sorted(EXPECTED_TEMPLATES))
def test_scaffold_defaults_to_italian(repo, template):
    bit = create_bit(repo, template=template, title="Lingua").bit
    text = (bit.dir / "bit.yml").read_text()
    assert "default_locale: it" in text and "locales: [it]" in text
    assert "language:" not in text
    assert bit.manifest.default_locale == "it" and bit.manifest.locales == ["it"]
    assert not bit.locales_dir.exists()  # single-language Bits stay simple


def test_scaffold_in_another_language(repo):
    bit = create_bit(repo, template="web", title="Projectile", default_locale="EN").bit
    assert bit.manifest.default_locale == "en" and bit.manifest.locales == ["en"]
    assert "default_locale: en" in (bit.dir / "bit.yml").read_text()


def test_scaffold_multilingual(repo):
    # --locales alone: the first one is the default.
    bit = create_bit(repo, template="manim", title="A", locales=["en", "it", "EN"]).bit
    assert bit.manifest.default_locale == "en" and bit.manifest.locales == ["en", "it"]
    assert "locales: [en, it]" in (bit.dir / "bit.yml").read_text()
    # --locale picks the default among them.
    bit = create_bit(
        repo, template="manim", title="B", default_locale="it", locales=["en", "it"]
    ).bit
    assert bit.manifest.default_locale == "it" and bit.manifest.locales == ["en", "it"]


def test_scaffold_rejects_bad_locales(repo):
    with pytest.raises(ScaffoldError, match="not valid language tags"):
        create_bit(repo, template="web", title="X", default_locale="italian")
    with pytest.raises(ScaffoldError, match="not valid language tags"):
        create_bit(repo, template="web", title="X", locales=["it", "english"])
    with pytest.raises(ScaffoldError, match="default locale 'it' is not among the locales"):
        create_bit(repo, template="web", title="X", default_locale="it", locales=["en"])
    assert not repo.bit_dir("x").exists()
