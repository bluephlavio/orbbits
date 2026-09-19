# Provenance

Bits and, later, Orbits combine original material with historical images, archival sources,
screenshots, maps, public-domain works and third-party media. Provenance is a first-class
concern from day one, without a rights-management system — and it matters more now that the
repository and the site are public: whatever is under `bits/` is redistributed.

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
"after" a classic diagram is still useful (see `bits/alkhwarizmi-completing-square`, whose
entry names the 9th-century source and states that the drawing itself is original).

What the fields are for, once public: `source`/`author`/`url` let a reader find the original;
`license` states under which terms the material is redistributed here (the content licence
CC BY-SA 4.0 in `docs/licensing.md` applies only to original work, and a Bit's own
`license:` field only to *its* original content — never to what is listed here);
`modifications` separates what is theirs from what is ours; `retrieved`/`notes` record
context that is easy to lose.

## Keep the material

Put reference files (scans, original images, data) under `src/assets/` or `src/references/`
so the Bit can be rebuilt or re-checked; never only in `dist/`.

## Checks

`orbbits check` warns when a Bit with engine `external` or `static` has no provenance, and
when a *published* Bit (status `usable` or `curated`) has a provenance entry without
`license`; for `curated` Bits the missing license is an error. The public Bit page lists
every entry ("Fonti": source linked to `url`, author, licence) under the content licence, so
what is third-party is visible next to what is CC BY-SA.
