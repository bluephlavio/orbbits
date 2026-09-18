import pytest
from pydantic import ValidationError

from orbbits.manifest import Manifest, parse_manifest
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
