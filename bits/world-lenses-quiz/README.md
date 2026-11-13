# Cambiare le lenti

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react, no extra dependency · Public page: `/bits/world-lenses-quiz/`
- Language: Italian only, strings inline (the bank itself is Italian)
- Tests: `node --test bits/world-lenses-quiz/tests/*.test.ts`, also run by `just test` and CI
- Standalone export: `just export world-lenses-quiz` → `dist/web/` (rebuildable, not versioned)

## Editorial status: a published prototype

The quiz engine is complete and tested; the bank is **provisional**. It was produced with
AI-assisted generation and is being rebuilt by the author (see `brief.md`, "Editorial status").
Publishing the Bit is not approving any item. Three things keep that distinction visible:

- `src/data/review.json` (the Bit's own file; the bank is never edited): `status: provisional`,
  the criteria, the items **held back** with their reason, the **suppressed** source links;
- a discreet notice on the opening screen ("Prototipo: le domande sono materiale provvisorio,
  in revisione editoriale…"), shown while `status` is `provisional`;
- `bit.yml` (`description`, `provenance`): prototype, AI-assisted original text under
  CC BY-SA 4.0, facts attributed to the cited sources, nothing of theirs reproduced.

Held items (D45, D67: the decisive figure is documented only through a third-party
reproduction) stay in `bank.json` and in the archive view of the tests, but `loadBank(raw,
review)` keeps them out of `items`, `byId`, the presets (listed in `preset.held`, shown as
"in revisione") and the draw; a saved route that contained one names it as "in revisione
editoriale" when it is loaded. Suppressed sources (D22, D24) are unofficial copies of IOM
chapters whose official links the same items cite. To release an item: verify it, then remove
it from `held`. To approve the bank: rewrite it, then drop `status: provisional`.

## Data

`src/data/bank.json` is the bank as supplied (schema `world-lenses-bank-1.1`, 5th edition,
2026-11-08: 67 active items, 65 playable after the review, 8 presets, 56 archived), byte for
byte; edit it there and nowhere else. The JSON is bundled into the Bit's own chunk; no request at runtime. The 4th-edition
atlas (`atlante.md`) was removed with the 4th-edition bank: it described questions that are now
archived.

`quiz/bank.ts` maps it to typed items, keeping every value (ids, wording, options, the 0-based
`correct`, answer, feedback, discussion prompt, year, sources) and renaming fields to camelCase.
Only `items[]` with `status: "active"` are playable. `archived_items` and
`migration.archived_ids` feed `bank.retired` (id → teacher title + suggested equivalent from
`migration.suggested_equivalents`), used only to tell the teacher what a saved route lost.
Malformed entries are skipped and listed in `bank.problems`; a test requires it to be empty.

Fields and where they appear (`interface_guidance` in the bank):

| field | preparation | play, before the answer | play, after | summary |
|-------|-------------|-------------------------|-------------|---------|
| `question`, `options` | detail | yes | yes | yes |
| `title_teacher` | list, battery | **never** | **never** | list |
| `answer`, `feedback` | `answer` in detail | **never** | yes, in reading type | on demand |
| `discussion_prompt` | detail | **never** | "Una domanda che resta aperta", closed but visible, never scored | on demand + all together |
| `year`, `sources` | year in detail | **never** | secondary zone; sources as links | on demand |
| `lens_before`, `editorial_rationale`, `teacher_note`, `verification`, `evidence_note` | detail ("Per il docente") | never | closed "Approfondimento per il docente" | inside each answer |
| `lens_after` | only where it differs from `editorial_rationale` (teacher block) | | | |
| priority, kind, chapter, regions, topics | filters, detail | never | never | never |
| `visual`, `origin`, `family`, `selected`, `*_display` | not shown (`origin` as a note in detail) | | | |

The browser flows check the "never" cells by searching the whole DOM text (not only what is
visible) for each item's title, answer, feedback, prompt, teacher fields, year and source labels
before every confirmation.

## Structure

```text
src/index.tsx            the three phases (setup | play | summary), the game in progress and its saving
src/quiz/bank.ts         JSON → Item, Preset, chapters, counts, retired ids, random defaults
src/quiz/selection.ts    search (case/accent/apostrophe-insensitive), filters, places → large
                         areas, random draw, spread order, battery edits, seeded and crypto RNG
src/quiz/presets.ts      personal presets: create, file format, import/merge, storage, migration
src/quiz/play.ts         game reducer, display order of the alternatives, score, saved session
src/ui/data.ts           loads the bank once, through src/data/review.json
src/ui/useLibrary.ts     battery draft + personal presets in localStorage, migration, import/export
src/ui/Setup.tsx         hero, notices, tabs (Percorsi · Banca · A caso), battery, sticky dock, toasts
src/ui/MigrationNotice.tsx  what the change of edition removed from saved routes
src/ui/Sources.tsx       the three entry panels and the teacher detail of an item
src/ui/Filters.tsx       search + Argomento + Area geografica + Tipo (kind, priority)
src/ui/Battery.tsx       ordered list, reorder, shuffle, save, empty; removed ids and alternatives
src/ui/Play.tsx          question, alternatives, confirm/next, progress, keys
src/ui/Feedback.tsx      outcome, answer, explanation, open question, year, sources, teacher block
src/ui/Summary.tsx       score ring, answers re-openable, all open questions, replay
src/ui/useFullscreen.ts, icons.tsx
tests/quiz.test.ts       Node's own runner on the pure modules and on the real bank
```

## Selection rules (from `selection_contract` in the bank)

- Every entry produces an ordered battery of distinct active ids; every edit keeps it so. An
  empty battery never starts a game.
- Filters use the bank's metadata: chapter and `topics`, `regions` (grouped in large areas by
  `PLACE_AREAS`; a test fails if the bank names an unknown place), `kind`, `priority`. Years are
  free text, reachable through the search.
- Built-in presets are read-only; saving creates a personal preset (`mio-…` id). A personal
  preset that was loaded and edited can be overwritten ("Aggiorna").
- Random draw: pool = items matching the filters, intersected (switch on by default) with
  `random_defaults` (priority A: 57 of the 65 playable). Without replacement; if fewer items than requested
  are available, the panel says how many and the draw takes them all. A specific place fills at
  most max(2, ⌈n/5⌉) slots while other candidates remain; the order is spread so neighbours do
  not share a place when possible.
- Alternatives: shown in the bank's order, or shuffled per game ("Alternative in ordine
  casuale", remembered per browser). Answers are stored as option indices, so scoring never
  depends on the display; letters in the verdict and summary follow the display.

## Storage, files and the change of edition

- `orbbits.world-lenses-quiz.presets`: personal presets, in the export file format.
- `orbbits.world-lenses-quiz.battery`: the battery being composed, its origin, removed ids.
- `orbbits.world-lenses-quiz.game`: the game in progress (ids, display orders, answers, index,
  pending choice; never question objects), stamped with bank schema and edition.
- `orbbits.world-lenses-quiz.prefs`: the alternatives-order switch.

All are read as untrusted input. Migration (`quiz/presets.ts`, `readStored` / `readDraft`):

- a personal preset keeps id, title, description and the order of its still-active ids; ids no
  longer active move to `retired_ids`. A preset left empty is kept, shown as "vuoto · da
  ricomporre", editable and savable, not playable;
- the first visit after the change shows a notice listing, per route, the removed ids;
  loading a route lists them in the battery with the suggested equivalent and an "Aggiungi"
  button (never substituted automatically). "Chiudi l’elenco" or saving the route forgets them;
- a battery that was an unedited ready route is reloaded in the new edition (built-in presets
  replace those with the same id); an edited one keeps its valid ids and lists the others;
- a saved game resumes ("Riprendi") only with the same schema and edition and all ids active;
  otherwise it is discarded and the preparation says why.

Export file (`cambiare-le-lenti-percorsi.json` or `<preset-id>.json`), version 2:

```json
{ "format": "orbbits.world-lenses-quiz.presets", "version": 2, "bank": "world-lenses-bank-1.1",
  "edition": 5, "exported": "…", "presets": [{ "id": "mio-…", "title": "…", "description": "…",
  "item_ids": ["D31", "…"], "retired_ids": ["D41"], "order": "as_listed" }] }
```

Import accepts versions 1 and 2, a bare array, a single preset, or any object with `presets`
(the bank file imports as eight duplicates). Per entry: retired ids are dropped and named in the
message, repeated ids ignored, a preset identical to an existing one (same title ignoring case,
same playable ids in order) skipped as a duplicate, an entry that is not a preset counted as
invalid; none of these blocks the other entries.

## Interaction

- Keys during play: 1–3 or A–C choose by displayed position, Enter confirms, Enter again goes
  on (focus is on "Avanti"); Enter on a focused alternative chooses it first.
- From 60rem of Bit width the explanation docks beside the question; question and "Avanti" stay
  in view (sticky) while it is read, if the screen is at least 34rem tall. Below 60rem it stacks
  under the options and scrolls into view.
- Fullscreen on the Bit's root grows the base font with the screen (`vmin`).
- Motion: entrance rise, "focus" (blur → sharp) for the explanation, pop on choice and verdict,
  ripple on the correct answer, a nudge of the open-question mark, ring on the score. All off
  under `prefers-reduced-motion`.

## Limitations

- One device, one browser: no sync of presets except through the JSON files.
- The atlas's visual tables (`visual`) are not in the Bit (the bank marks them as to be adapted).
- The teacher block is reachable during play (closed, dashed): on a projected screen, open it
  only if the class may read it.
