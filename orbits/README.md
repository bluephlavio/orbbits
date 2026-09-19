# Orbits

An **Orbit** is a rich lesson or narrative learning path that composes Bits with simpler
editorial Blocks (paragraphs, equations, quotations, external images, callouts, references,
embedded video, external providers such as TexBits).

This directory is intentionally empty: the foundation ships no Orbits and no Orbit authoring
system. It exists so the repository already reflects the final model
(`bits/` = reusable authoring layer, `orbits/` = editorial/runtime layer).

When Orbits arrive, the same `<BitHost id="..."/>` mount used by the Bit pages in `web/`
will embed interactive Bits; video/figure/document Bits will be embedded through their
declared `dist/` outputs. Orbits will get their own canonical routes, `/orbits/<id>/`,
next to `/bits/<id>/` on the same site (docs/publishing.md); MDX is the likely authoring
format. See `docs/architecture.md`.
