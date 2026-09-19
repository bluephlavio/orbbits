# Licensing

The repository is public. Three kinds of material live in it, under three different terms:

```text
software and tooling          → MIT                 LICENSE
original educational content  → CC BY-SA 4.0        CONTENT-LICENSE.md
third-party material          → its own terms       provenance in bit.yml
```

## 1. Software — MIT

The CLI (`src/orbbits/`), the web runtime (`web/`), the templates (`templates/`), the tests,
the build and CI configuration, and the source code *inside* Bits (`bits/*/src/**`: Manim
scenes, TikZ/LaTeX sources, React components, helper and build scripts) are software,
licensed under the MIT License (`LICENSE`, also declared in `pyproject.toml` and
`package.json`). Anyone may reuse the tooling and adapt the sources.

## 2. Original educational content — CC BY-SA 4.0

The *works* produced from those sources and the prose around them — rendered videos,
generated figures and diagrams, handouts and documents under `bits/*/dist/`, the original
text of `brief.md` and `narrative.md`, titles and descriptions, future Orbits — are
educational content by Flavio Grandin, licensed under Creative Commons
Attribution-ShareAlike 4.0 International (`CONTENT-LICENSE.md`, which links the legal code;
the full text is not duplicated here). Reuse and adapt with attribution; share adaptations
under the same licence.

This is a separate licence from the MIT one: the *scene file* that produces a video is
MIT, the *video* is CC BY-SA. A figure that is a mechanical rendering of a formula may not be
copyrightable at all; the licence simply applies wherever there is something to license.

### Per-Bit inheritance and override

A Bit made only of original material needs no licence field: it inherits the repository
default. `Manifest.content_license` (Python) and `contentLicense()` (web) resolve to
`CC BY-SA 4.0` when `license` is absent, and the public page says so.

```yaml
# bit.yml — only when the Bit's original content is under different terms
license: CC BY 4.0
```

Use the override for exceptions (a co-authored work, content that must stay under a
different open licence). It covers the Bit's *original* content only; it never relicenses
third-party ingredients, which are always licensed per `provenance` entry.

## 3. Third-party and historical material — its own terms

Scans, photographs, datasets, archival texts, maps, quoted sources, adapted constructions and
any other external ingredient keep the terms of their source, recorded per Bit in
`provenance` (`docs/provenance.md`): `source`, `author`, `url`, `license`, `modifications`,
`retrieved`, `notes`. Storing or referencing something in OrbBits does not make it CC BY-SA.
Public-domain works (a 9th-century text, a 1929 paper) may be reproduced; what is original in
a Bit that uses them (a redrawing, a translation, the commentary) is covered by 1 or 2 above,
and `modifications` is where the line between theirs and ours is drawn.

`orbbits check` warns when a published Bit records provenance without a `license` note and
refuses `curated` without one. The public Bit page lists provenance entries with their
licence next to the content licence, so a visitor is never misled.

## Where it shows

- `LICENSE` (MIT) and `CONTENT-LICENSE.md` (CC BY-SA 4.0) at the repository root;
- `README.md`, "Licensing";
- the site footer on every page ("software MIT · contenuti originali CC BY-SA 4.0 salvo
  diversa indicazione · i materiali di terzi mantengono la propria licenza") and the
  "Licenza" / "Fonti" rows in the metadata box of each Bit page (`web/src/lib/site.ts`,
  `web/src/pages/bits/[id].astro`).

## Dependencies

Runtime libraries bundled into the site or exports keep their licences: React (MIT),
JSXGraph (LGPL-3.0 / MIT dual), Astro (MIT). Manim (MIT) and TeX distributions are build
tools and are not redistributed.
