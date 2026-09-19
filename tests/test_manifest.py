import pytest
from pydantic import ValidationError

from orbbits.manifest import (
    DEFAULT_CONTENT_LICENSE,
    PUBLISHED_STATUSES,
    Manifest,
    bit_path,
    bit_url,
    normalize_locale,
    normalize_locale_list,
    parse_manifest,
)
from orbbits.slug import pascal_case, slugify

MINIMAL = """
id: angle-as-rotation
title: Angle as rotation
kind: video
role: animation
engine: manim
"""


def test_minimal_manifest_defaults():
    m = parse_manifest(MINIMAL)
    assert m.id == "angle-as-rotation"
    assert m.status == "draft"
    assert m.outputs == [] and m.subjects == [] and m.build == {}


def test_unknown_keys_are_preserved():
    m = parse_manifest(MINIMAL + "future_field: 42\n")
    assert m.model_extra == {"future_field": 42}


@pytest.mark.parametrize(
    ("field", "value", "fragment"),
    [
        ("id", "Angle As Rotation", "not a valid slug"),
        ("id", "001-angle", None),  # numeric prefixes are allowed by the slug rule, but...
        ("kind", "audio", "unknown kind"),
        ("status", "published", "unknown status"),
        ("title", "  ", "must not be empty"),
    ],
)
def test_invalid_fields(field, value, fragment):
    data = {"id": "x", "title": "X", "kind": "video", "role": "animation", "engine": "manim"}
    data[field] = value
    if fragment is None:
        Manifest.model_validate(data)  # valid slug; discouraged only by convention
        return
    with pytest.raises(ValidationError, match=fragment):
        Manifest.model_validate(data)


def test_outputs_and_provenance():
    m = parse_manifest(
        MINIMAL
        + """
outputs:
  - format: mp4
    file: dist/angle-as-rotation.mp4
provenance:
  - source: Some archive
    url: https://example.org
    license: CC BY 4.0
"""
    )
    assert m.outputs[0].format == "mp4"
    assert m.provenance[0].license == "CC BY 4.0"


def test_to_yaml_round_trip_drops_empty_collections():
    m = parse_manifest(MINIMAL)
    text = m.to_yaml()
    assert "outputs" not in text and "subjects" not in text
    assert parse_manifest(text) == m


@pytest.mark.parametrize(
    ("text", "slug"),
    [
        ("Angle as rotation", "angle-as-rotation"),
        ("  Rømer & Io: eclipses!  ", "rmer-io-eclipses"),
        ("Completing the square (al-Khwārizmī)", "completing-the-square-al-khwarizmi"),
    ],
)
def test_slugify(text, slug):
    assert slugify(text) == slug


def test_pascal_case():
    assert pascal_case("angle-as-rotation") == "AngleAsRotation"
    assert pascal_case("3d-orbit") == "Bit3dOrbit"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            "[Unit Circle, trigonometry, unit_circle, ' Sine ']",
            ["unit-circle", "trigonometry", "sine"],
        ),
        ("[]", []),
        ("unit-circle", ["unit-circle"]),  # a bare string is tolerated
    ],
)
def test_tags_are_normalized(raw, expected):
    m = parse_manifest(MINIMAL + f"tags: {raw}\n")
    assert m.tags == expected


def test_tags_must_be_slugs_after_normalization():
    with pytest.raises(ValidationError, match="not valid slugs"):
        parse_manifest(MINIMAL + "tags: ['unit/circle']\n")
    with pytest.raises(ValidationError, match="list of slugs"):
        parse_manifest(MINIMAL + "tags: {a: 1}\n")


def test_no_family_field_is_modelled():
    # Relationships are tags; a stray `family` key is merely preserved as an unknown extra.
    m = parse_manifest(MINIMAL + "family: unit-circle\n")
    assert "family" not in Manifest.model_fields
    assert m.model_extra == {"family": "unit-circle"}


@pytest.mark.parametrize(
    ("status", "published"), [("draft", False), ("usable", True), ("curated", True)]
)
def test_publication_derives_from_status(status, published):
    m = parse_manifest(MINIMAL + f"status: {status}\n")
    assert m.published is published
    assert PUBLISHED_STATUSES == ("usable", "curated")


def test_canonical_path_depends_on_id_only():
    a = parse_manifest(MINIMAL)
    b = parse_manifest(MINIMAL.replace("kind: video", "kind: figure").replace("manim", "tikz"))
    assert a.path == b.path == "/bits/angle-as-rotation/"
    assert bit_path("x") == "/bits/x/"
    assert (
        bit_url("https://user.github.io/orbbits/", "x") == "https://user.github.io/orbbits/bits/x/"
    )
    assert bit_url("https://orbbits.example", "x") == "https://orbbits.example/bits/x/"
    assert bit_url("/orbbits", "x") == "/orbbits/bits/x/"
    assert bit_url("/", "x") == "/bits/x/"


# --- locales (docs/localization.md) -------------------------------------------------------


def test_locale_defaults_to_italian():
    m = parse_manifest(MINIMAL)
    assert m.default_locale == "it"
    assert m.locales == ["it"]
    assert m.language is None


@pytest.mark.parametrize(
    ("default", "raw", "expected"),
    [
        ("it", "[IT, en_gb, it, ' EN-gb ']", ["it", "en-GB"]),
        (
            "ar-EG",
            "[ar-eg, zh-hant, sr_latn_rs, es-419]",
            ["ar-EG", "zh-Hant", "sr-Latn-RS", "es-419"],
        ),
        ("it", "it", ["it"]),  # a bare string is tolerated
    ],
)
def test_locales_are_normalized(default, raw, expected):
    m = parse_manifest(MINIMAL + f"default_locale: {default}\nlocales: {raw}\n")
    assert m.locales == expected


def test_default_locale_is_normalized():
    m = parse_manifest(MINIMAL + "default_locale: EN_us\nlocales: [en-US, it]\n")
    assert m.default_locale == "en-US"
    assert m.locales == ["en-US", "it"]


@pytest.mark.parametrize("bad", ["italian", "e", "en-GBX", "x_", "en-gb-extra", "en-Latin"])
def test_invalid_locale_tags_are_rejected(bad):
    with pytest.raises(ValidationError, match="not (a|valid) language tag"):
        parse_manifest(MINIMAL + f"default_locale: '{bad}'\n")
    with pytest.raises(ValidationError, match="not (a|valid) language tag"):
        parse_manifest(MINIMAL + f"locales: ['{bad}']\n")


def test_default_locale_must_be_among_locales():
    with pytest.raises(ValidationError, match="default_locale 'it' must be one of locales"):
        parse_manifest(MINIMAL + "locales: [en]\n")
    m = parse_manifest(MINIMAL + "locales: [en, it]\n")
    assert m.default_locale == "it" and m.locales == ["en", "it"]


def test_localized_outputs_reference_declared_locales():
    base = MINIMAL + "locales: [it, en]\noutputs:\n  - format: mp4\n    file: dist/en/x.mp4\n"
    m = parse_manifest(base + "    locale: EN\n")
    assert m.outputs[0].locale == "en"
    with pytest.raises(ValidationError, match="locale 'fr', which is not among locales"):
        parse_manifest(base + "    locale: fr\n")
    with pytest.raises(ValidationError, match="not a language tag"):
        parse_manifest(base + "    locale: english\n")


def test_legacy_language_field_is_read_as_default_locale():
    m = parse_manifest(MINIMAL + "language: en\n")
    assert m.default_locale == "en" and m.locales == ["en"]
    assert m.language == "en"  # kept so that `check` can ask for the rename
    assert "language" not in m.to_yaml() and "default_locale: en" in m.to_yaml()
    # An explicit default_locale wins over the legacy field.
    m = parse_manifest(MINIMAL + "language: en\ndefault_locale: it\n")
    assert m.default_locale == "it"


def test_content_license_inherits_the_repository_default():
    assert parse_manifest(MINIMAL).content_license == DEFAULT_CONTENT_LICENSE == "CC BY-SA 4.0"
    m = parse_manifest(MINIMAL + "license: CC BY 4.0\n")
    assert m.license == "CC BY 4.0" and m.content_license == "CC BY 4.0"
    assert "license: CC BY 4.0" in m.to_yaml()


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("it", "it"), ("IT", "it"), ("en_gb", "en-GB"), ("  sr-latn-RS ", "sr-Latn-RS"), ("", "")],
)
def test_normalize_locale(raw, expected):
    assert normalize_locale(raw) == expected
    assert normalize_locale_list(["it", "IT", "en"]) == ["it", "en"]
