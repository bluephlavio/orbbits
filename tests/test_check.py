from orbbits.check import check_repo
from orbbits.scaffold import create_bit
from tests.conftest import write_bit


def levels(issues, level):
    return [i for i in issues if i.level == level]


def test_fresh_scaffolds_have_no_errors(repo):
    for t in ("manim", "web", "jsxgraph", "tikz", "latex"):
        create_bit(repo, template=t, title=f"Demo {t}")
    issues = check_repo(repo)
    assert levels(issues, "error") == []
    # Drafts with missing outputs only warn.
    assert any("declared output missing" in i.message for i in levels(issues, "warning"))


def test_missing_manifest_and_id_mismatch(repo):
    (repo.bits_dir / "orphan").mkdir()
    write_bit(
        repo,
        "wrong-dir",
        "id: right-id\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n",
        {"src/figure.tex": ""},
    )
    issues = check_repo(repo)
    msgs = {(i.bit_id, i.level): i.message for i in issues}
    assert "missing bit.yml" in msgs[("orphan", "error")]
    assert "does not match directory name" in msgs[("wrong-dir", "error")]


def test_usable_requires_built_outputs(repo):
    write_bit(
        repo,
        "fig",
        "id: fig\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\nstatus: usable\n"
        "outputs:\n  - format: svg\n    file: dist/figure.svg\n",
        {"src/figure.tex": "", "README.md": ""},
    )
    errors = levels(check_repo(repo), "error")
    assert len(errors) == 1 and "needs built outputs" in errors[0].message

    (repo.bit_dir("fig") / "dist").mkdir()
    (repo.bit_dir("fig") / "dist" / "figure.svg").write_text("<svg/>")
    assert levels(check_repo(repo), "error") == []


def test_outputs_must_live_under_dist(repo):
    write_bit(
        repo,
        "x",
        "id: x\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n"
        "outputs:\n  - format: svg\n    file: src/figure.svg\n",
        {"src/figure.tex": ""},
    )
    assert any("must live under dist/" in i.message for i in levels(check_repo(repo), "error"))


def test_interactive_bit_needs_entry_component(repo):
    write_bit(
        repo,
        "widget",
        "id: widget\ntitle: W\nkind: interactive\nrole: explorable\nengine: react\n",
        {"src/notes.md": ""},
    )
    assert any("src/index.tsx" in i.message for i in levels(check_repo(repo), "error"))


def test_unknown_engine_and_role_only_warn(repo):
    write_bit(
        repo,
        "y",
        "id: y\ntitle: Y\nkind: figure\nrole: mosaic\nengine: inkscape\n",
        {"src/a.svg": ""},
    )
    issues = check_repo(repo)
    assert levels(issues, "error") == []
    assert {i.message.split("'")[0].strip() for i in levels(issues, "warning")} >= {
        "engine",
        "role",
    }


def test_check_selected_ids_and_unknown_id(repo):
    create_bit(repo, template="tikz", title="Known")
    issues = check_repo(repo, ["known", "nope"])
    assert any(i.bit_id == "nope" and i.level == "error" for i in issues)


def test_broken_yaml_is_reported_not_raised(repo):
    write_bit(repo, "bad", "id: [unclosed\n")
    issues = check_repo(repo)
    assert any(i.bit_id == "bad" and i.level == "error" for i in issues)


def test_engine_named_ids_and_tags_warn(repo):
    write_bit(
        repo,
        "unit-circle-manim",
        "id: unit-circle-manim\ntitle: T\nkind: video\nrole: animation\nengine: manim\n"
        "tags: [unit-circle, manim, video]\n",
        {"src/scene.py": "from manim import *\nclass S(Scene): pass\n", "README.md": ""},
    )
    warnings = [i.message for i in levels(check_repo(repo), "warning")]
    assert any("names the technology ('manim')" in w for w in warnings)
    assert any("'manim' repeats a kind/engine name" in w for w in warnings)
    assert any("'video' repeats a kind/engine name" in w for w in warnings)
    # "three-body-problem" is a fine id: `three` is a word before it is an engine.
    write_bit(
        repo,
        "three-body-problem",
        "id: three-body-problem\ntitle: T\nkind: interactive\nrole: simulation\nengine: three\n",
        {"src/index.tsx": "", "README.md": ""},
    )
    assert not any(
        i.bit_id == "three-body-problem" and "technology" in i.message for i in check_repo(repo)
    )


def test_published_bits_need_some_documentation_and_licensed_provenance(repo):
    write_bit(
        repo,
        "fig",
        "id: fig\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\nstatus: usable\n"
        "outputs:\n  - format: svg\n    file: dist/figure.svg\n"
        "provenance:\n  - source: Some archive\n",
        {"src/figure.tex": "", "README.md": "", "dist/figure.svg": "<svg/>"},
    )
    issues = check_repo(repo)
    warnings = [i.message for i in levels(issues, "warning")]
    assert levels(issues, "error") == []
    assert any("neither a description nor a brief.md" in w for w in warnings)
    assert any("provenance without a license" in w for w in warnings)

    # curated: a missing license becomes an error; a note in any language and shape
    # (here a narrative, no brief and no description) is documentation enough.
    d = repo.bit_dir("fig")
    (d / "narrative.md").write_text("Da usare dopo la discussione sulle equazioni.\n")
    manifest = d / "bit.yml"
    manifest.write_text(manifest.read_text().replace("status: usable", "status: curated"))
    issues = check_repo(repo)
    assert not any("neither a description" in i.message for i in issues)
    errors = [i.message for i in levels(issues, "error")]
    assert errors and "provenance without a license" in errors[0]

    (d / "bit.yml").write_text((d / "bit.yml").read_text() + "    license: public domain\n")
    assert check_repo(repo) == []


def test_a_description_alone_documents_a_published_bit(repo):
    write_bit(
        repo,
        "fig",
        "id: fig\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\nstatus: usable\n"
        "description: Il completamento del quadrato di al-Khwarizmi.\n"
        "outputs:\n  - format: svg\n    file: dist/figure.svg\n",
        {"src/figure.tex": "", "README.md": "", "dist/figure.svg": "<svg/>"},
    )
    assert check_repo(repo) == []


def test_drafts_are_not_held_to_publication_checks(repo):
    write_bit(
        repo,
        "sketch",
        "id: sketch\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n"
        "provenance:\n  - source: Some archive\n",
        {"src/figure.tex": "", "README.md": ""},
    )
    assert not any("publishes" in i.message or "license" in i.message for i in check_repo(repo))


# --- locales (docs/localization.md) -------------------------------------------------------

FIG = "id: fig\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n"


def test_legacy_language_field_warns(repo):
    write_bit(repo, "fig", FIG + "language: it\n", {"src/figure.tex": "", "README.md": ""})
    issues = check_repo(repo)
    assert levels(issues, "error") == []
    assert any("old name of `default_locale:`" in i.message for i in levels(issues, "warning"))


def test_invalid_locales_are_errors(repo):
    write_bit(repo, "fig", FIG + "locales: [en]\n", {"src/figure.tex": ""})
    errors = levels(check_repo(repo), "error")
    assert errors and "default_locale 'it' must be one of locales" in errors[0].message


def test_locale_files_must_match_declared_locales(repo):
    write_bit(
        repo,
        "fig",
        FIG + "locales: [it, en]\n",
        {"src/figure.tex": "", "README.md": "", "locales/it.yml": "a: b\n", "locales/fr.yml": ""},
    )
    warnings = [i.message for i in levels(check_repo(repo), "warning")]
    assert any("locale 'en' is declared but locales/ has no file" in w for w in warnings)
    assert any("locales/fr.yml exists but 'fr' is not declared" in w for w in warnings)
    # A Bit without locales/ at all is fine: not every Bit has translatable strings.
    write_bit(
        repo, "plain", FIG.replace("fig", "plain") + "locales: [it, en]\n", {"src/figure.tex": ""}
    )
    assert not any(i.bit_id == "plain" and "locales/" in i.message for i in check_repo(repo))


def test_localized_outputs_cover_every_locale(repo):
    write_bit(
        repo,
        "fig",
        FIG
        + "locales: [it, en]\n"
        + "outputs:\n  - {format: svg, file: dist/it/figure.svg, locale: it}\n"
        + "  - {format: pdf, file: dist/figure.pdf}\n",
        {"src/figure.tex": "", "README.md": ""},
    )
    warnings = [i.message for i in levels(check_repo(repo), "warning")]
    assert any("none is declared for locale 'en'" in w for w in warnings)
    # Locale-independent outputs alone never trigger the warning.
    write_bit(
        repo,
        "plain",
        FIG.replace("fig", "plain")
        + "locales: [it, en]\noutputs:\n  - {format: pdf, file: dist/figure.pdf}\n",
        {"src/figure.tex": ""},
    )
    assert not any(i.bit_id == "plain" and "localised" in i.message for i in check_repo(repo))
