# Provenance

Bits and, later, Orbits combine original material with historical images, archival sources,
screenshots, maps, public-domain works and third-party media. Provenance is a first-class
concern from day one, without a rights-management system.

## Record it in `bit.yml`

```yaml
provenance:
  - source: "Hubble, E. (1929). A relation between distance and radial velocity among extra-galactic nebulae. PNAS 15(3)."
    author: Edwin Hubble
    url: https://doi.org/10.1073/pnas.15.3.168
    license: public domain (US, pre-1930)
    modifications: data re-plotted from Table 1; axis labels translated
    retrieved: 2026-09-18
    notes: values transcribed by hand, check against the original before publication
```

One entry per external ingredient. All fields except `source` are optional; extra keys are
preserved. Use it for:

- historical documents, figures and photographs (also when redrawn: say so in `modifications`);
- datasets and tables;
- screenshots and maps;
- AI-generated visuals (`source: "generated with <model>"`, prompt and seed in `src/`);
- code or constructions adapted from someone else's work.

Original work needs no entry; a short `notes` line saying a figure is an original rendering
"after" a classic diagram is still useful (see `bits/alkhwarizmi-completing-square`).

## Keep the material

Put reference files (scans, original images, data) under `src/assets/` or `src/references/`
so the Bit can be rebuilt or re-checked; never only in `dist/`.

## Checks

`orbbits check` warns when a Bit with engine `external` or `static` has no provenance. The
future publication pipeline is expected to refuse `curated` Bits whose third-party material
lacks a license note.
