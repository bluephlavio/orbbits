# Localization

> A Bit has **one pedagogical identity**, may have **several language realisations**, and
> may have **several localised build outputs**. Different media or pedagogical affordances
> are different Bits; different languages normally are not.

OrbBits is authored for Italian classrooms, so Italian is the default everywhere. Nothing
makes it mandatory: an English-only Bit (CLIL, a source in its original language) and a
multilingual Bit are both ordinary Bits.

## Language is metadata, not identity

```yaml
# bit.yml
default_locale: it        # language of title/description and of the artifact at /bits/<id>/
locales: [it, en]         # every language the Bit is realised in; must include default_locale
```

- `default_locale` — a BCP-47 language tag (`it`, `en`, `ar`, `en-GB`, `ar-EG`, `zh-Hant`).
  Default `it`. It is the language of the canonical page `/bits/<id>/`, of `title` and
  `description`, and of any output that carries no `locale`.
- `locales` — the languages the Bit exists in. Default `[default_locale]`. Tags are
  normalised on load (`IT` → `it`, `en_gb` → `en-GB`, duplicates dropped); anything that is
  not `language[-Script][-REGION]` is rejected, and so is a `default_locale` missing from
  `locales`. Validation is deliberately partial (no extlang/variant subtags) until a Bit
  needs more.
- `language:` is the old name of `default_locale`; it is still read, `check` asks to rename it.

The id, the directory and the URL never encode a language. `unit-circle-explorer` with
`locales: [it, en]` is one Bit; `unit-circle-explorer-it` / `-en` must not exist. A new Bit
is warranted only by a different pedagogical or media identity (`unit-circle-animation`,
`unit-circle-diagram`), and that Bit has its own `locales` in turn:

```text
unit-circle-explorer     interactive   locales: [it, en]
unit-circle-animation    video         locales: [it]
unit-circle-diagram      figure        locales: [it]
```

## Locale files: `locales/<tag>.yml`

Bits whose artifact contains language — labels, buttons, legends, captions, axis titles,
prompts, short explanations, accessibility labels — keep those strings in one file per
language. A single-language Bit that never needs translating keeps its strings inline and
has no `locales/` directory at all.

```text
bits/<id>/
├── bit.yml
├── locales/
│   ├── it.yml            # same keys in every file
│   └── en.yml
├── src/
└── dist/
```

```yaml
# locales/it.yml
angle_slider: Angolo θ in gradi
reset: Reset
cos: cos θ
```

Flat keys, plain strings. Locale files hold what the learner reads; they are not
configuration and not manifest overrides (no `title`, no `outputs`). Translate meaning, not
words: adapt an example or a name when the culture calls for it. `check` warns when a
declared locale has no file while `locales/` exists, and when a file names an undeclared
locale. TeX Bits may use `locales/<tag>.tex` instead (see below).

## Interactive Bits

The runtime passes the language to render as a prop; the component resolves its own
strings. No i18n framework: two imports and a lookup.

```tsx
import en from '../locales/en.yml';
import it from '../locales/it.yml';

interface Messages { angle_slider: string; reset: string; cos: string; sin: string }
const MESSAGES: Record<string, Messages> = { it: it as Messages, en: en as Messages };

export default function UnitCircleExplorer({ locale = 'it' }: { locale?: string }) {
  const t = MESSAGES[locale] ?? MESSAGES.it;
  // … <button>{t.reset}</button>
}
```

`locale` is optional (a Bit still works with no props) and is always one of the Bit's own
`locales`. `BitHost` passes the page's locale — today the Bit's `default_locale`, tomorrow
whatever a localised route asks for; the component never reads the URL. Reference:
`bits/unit-circle-explorer`. The `.yml` import is typed as `unknown` (`web/src/env.d.ts`),
hence the cast to the Bit's own `Messages` type.

## Generated Bits: Manim, TikZ/LaTeX, Python

A generated artifact in two languages is two files. Declare them with `locale` and let the
engine build once per language:

```yaml
locales: [it, en]
outputs:
  - {format: mp4,  file: dist/it/animation.mp4, locale: it}
  - {format: mp4,  file: dist/en/animation.mp4, locale: en}
  - {format: webp, file: dist/poster.webp}              # locale-independent
```

`dist/<tag>/…` is the recommended layout, not a rule. An output without `locale` is
locale-independent (a poster, a formula sheet) and is produced by the default locale's run.
`orbbits build` groups the outputs by locale and runs the engine once per group, telling
the source which language it is rendering:

| engine | how the source learns the language | typical pattern |
|--------|-----------------------------------|-----------------|
| manim, python | environment `ORBBITS_LOCALE` | `T = yaml.safe_load(open(f"locales/{os.environ.get('ORBBITS_LOCALE', 'it')}.yml"))` (cwd is the Bit directory) |
| tikz, latex | macro `\orbLocale`, defined before the file is read (`latexmk -pretex`) | `\providecommand{\orbLocale}{it}` at the top, then `\ifthenelse{\equal{\orbLocale}{en}}{…}{…}` or `\input{../locales/\orbLocale.tex}` |

Work directories are per language (`.build/manim/<tag>/`, `.build/tex/<tag>/`); `--quick`
previews the default language only. A single-language Bit builds exactly as before: one run,
`ORBBITS_LOCALE` / `\orbLocale` set to its `default_locale` and ignored. `check` warns when
outputs are localised but some declared locale has none, and errors when an output names a
locale that is not declared.

## Manifest text, brief, narrative

- `title` and `description` are plain strings in the `default_locale`. They do not become
  per-language maps until the site needs them; the manifest keeps unknown keys, so that
  migration stays possible.
- `brief.md` and `narrative.md` are internal notes, not localised public resources: one
  file each, in whichever language best supports the authoring task, never required in every
  locale. An Italian brief is enough to produce an English artifact and vice versa. The
  reference briefs happen to be in English and the narratives in Italian; any sensible
  combination is fine. If narratives ever become publishable they may split into
  `narrative.it.md` / `narrative.en.md`; not now.

## Translating an existing Bit

1. Do not copy the directory. Add the tag to `locales` in `bit.yml`.
2. Interactive: add `locales/<tag>.yml` with the same keys, make sure the component resolves
   it. Generated: add the localised outputs to `outputs`, make the source read
   `ORBBITS_LOCALE` / `\orbLocale`, `just build <id>`, commit `dist/`.
3. Keep `brief.md` as it is; note the translation in `README.md` if anything is non-obvious.
4. `just check <id>`; the canonical page still shows the `default_locale`.

## Scaffolding

```bash
just new --title "Moto del proiettile" --template web              # default_locale: it, locales: [it]
just new --title "Projectile motion" --template web --locale en    # English-only Bit
just new --title "…" --template manim --locales it,en              # default it, both declared
just new --title "…" --template manim --locales en,it --locale it  # explicit default
```

No questionnaire: without options a Bit is Italian. `--locales` alone makes its first entry
the default.

## Public site

The canonical route is `/bits/<id>/` and renders the Bit in its `default_locale`
(`<html lang>`, the interactive mount, the embedded output); every output is downloadable
from that page, localised ones labelled with their tag. The site chrome is Italian.

A multilingual site is prepared for, not built: the future shape is a locale-prefixed route
(`/en/bits/<id>/`) that renders the same Bit with another `locale`, plus per-language chrome
strings in `web/src/lib/site.ts`. Nothing in a Bit — id, directory, component, outputs —
would change; the runtime already passes `locale` and selects outputs by it.

## Deferred on purpose

Per-language `title`/`description` maps, localised `brief.md`/`narrative.md`, localised
routes and chrome, and any generic variant/fork/version system (docs/architecture.md,
"Deferred on purpose"). Each is reconsidered when a real Bit needs it.
