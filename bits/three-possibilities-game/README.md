# Tre possibilità

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react, no extra dependency · Public page: `/bits/three-possibilities-game/`
- Language: Italian only, strings inline (not planned in several languages)
- Tests: `node --test bits/three-possibilities-game/tests/*.test.ts`, also run by `just test` and CI
- Standalone export: `just export three-possibilities-game` → `dist/web/` (rebuildable, not versioned)

## Structure

The dependency runs one way: `ui/` reads `game/`, and `game/` knows nothing about React.

```text
src/index.tsx          composition; owns only which panel is open and whether theory is shown
src/game/rules.ts      the protocol, the theory enumerated from it, fair draws
src/game/session.ts    pure reducer over five phases, finished-game log, sessions, storage format
src/game/view.ts       what each option shows at each moment: the contract with the picture
src/game/stats.ts      summaries, series, Wilson intervals, what the data allow one to say
src/game/lab.ts        the paired simulator; shares the rules with the game and nothing else
src/ui/Stage.tsx       the stage: words, vessels, rule, register
src/ui/Vessel.tsx      one ceramic vessel, SVG and CSS 3D; the whole column is one button
src/ui/specimens.ts    the images of the objects
src/assets/            meteorite and pebbles (*.webp) and the script that renders them
src/ui/copy.ts         what the stage says, pure and tested
src/ui/Analytics.tsx   the panel and its Sessione and Storico tabs
src/ui/LabTab.tsx      the Simulazione tab
src/ui/Reasoning.tsx   the three cases, computed from the rules, built up step by step
src/ui/Panel.tsx       panel frame shared by Analytics and Reasoning
src/ui/Chart.tsx       line/band/rule chart in plain SVG, adapted from house-dice-game
src/ui/RatePlot.tsx    frequencies with uncertainty and marks on a 0–100% scale, plain HTML
src/ui/useSession.ts   reducer + draws + timed transitions + localStorage
src/ui/useLab.ts       runs simulations a slice per frame
src/ui/useFullscreen.ts, scale.ts, format.ts, colors.ts, Stats.tsx, ClearButton.tsx
tests/*.test.ts        Node's own test runner on the pure modules
```

## A game

```text
choose ─pick→ opening ─opened→ decide ─decide→ revealing ─settle→ done ─deal→ choose
```

`opening` and `revealing` are animations, driven by timers in `useSession` rather than by
animation callbacks, so they survive a hidden tab. `opened` and `settle` carry the game id: a late
or repeated callback is refused, and ids never restart. Every guard is in the reducer. Only
settled games reach the log, so an open chart cannot spoil a reveal.

Random draws arrive with the action (`deal {prize}`, `pick {coin}`), which keeps the reducer pure.
The meteorite is placed before the player chooses, as the problem requires, and a reload does not
redraw it.

## Rules are one function

The opening is `hostOpens` in `rules.ts`, called by the session and by the simulator. `THEORY` is
not typed in: it is enumerated over the 18 equally likely triples (prize, pick, coin), and the
Reasoning builds its cases from the same functions. The tests use the enumeration to check exact
values, including 2/3 for every first choice and every stone revealed, not only on average.

## No information leaks

- `view.ts` gives a closed option `content: null`: the meteorite is not in the DOM until a lid
  lifts. A browser check confirms that two deals the player cannot tell apart produce a
  byte-identical page.
- Which pebble appears depends only on the option. If it depended on the deal ("the first stone
  is the grey one"), the pebble shown would reveal where the meteorite is.
- The images are preloaded all together at mount, so the network reveals nothing either.
- Prompts and timings do not depend on the position. The tests check the prompts.
- The stored state does contain the position, in clear, because a reload must not redraw it. A
  student reading `localStorage` can cheat. Hiding it would be theatre in a static page, and there
  is nothing to win.

## Disclosure

The theory is behind a switch that is off at every page load, the reasoning behind its own
button, and neither is persisted: at the LIM, the next class starts from the same place. The
simulation is a deliberate act, and it does show the result, so its theory lines still follow the
switch, while its data do not.

## Thin data

- Fewer than 10 games with a strategy (`MIN_GAMES`): counts ("2 su 3"), not a percentage, a hollow
  marker on the plot, and no comparison. This is a reading convention, not a statistical threshold.
- Every frequency comes with a Wilson 95% interval. It was chosen over p ± 2σ because a student's
  data live where that fails: 3 out of 3 would be "100% ± 0".
- `readingOf` compares by a test that can be explained by pointing at the plot: do the two
  intervals touch? It is conservative, and it says nothing about significance in a formal sense.
- Frequency curves count each strategy's own games. On a common axis of all games, an unused
  strategy would draw a flat line that means nothing.
- The session plot needs 5 games with a strategy, and states how many cases it left out.

## Simulation

Each configuration is resolved with both strategies, so "both win" and "both lose" are counted,
not assumed. The simulator goes through `hostOpens` and never uses the shortcut "switching wins
when the first choice was wrong", which is the conclusion. A test replays the same draws through
the reducer and compares outcomes. Runs stay in memory (12 at most) and are lost on reload.

## Persistence

`orbbits.three-possibilities-game.session`, this device only. A game is four digits (prize, pick,
opened, final) and everything else is recomputed. A game the rules would not allow discards the
store. A reload at a decision resumes it, and a reload during a reveal counts the decision as
taken. The archive keeps the last 60 sessions.

## Rendering

A vessel is seen from 20° above with no perspective, so a flat disc is an ellipse of ratio
sin 20° ≈ 0.34, and the SVG shapes and the CSS 3D lid agree exactly at every size. The layers,
back to front, are the inside, the lid, the object and the front wall: the object is hidden behind
the wall until it rises. The lid is a stack of discs turning on a hinge at the back of the rim, and
once open it stands behind the object as its backdrop. Only the meteorite is lit from behind.

The meteorite and the pebbles are images rendered by `src/assets/render_specimens.py`, a small
deterministic renderer (signed distance fields, three lights, a soft environment) that needs numpy
and scipy on the author's machine and nothing in the browser. Change the objects there and commit
the images; the command is at the top of the script. `?url` imports keep them plain files:
Astro would otherwise turn them into image metadata.

The outcome is carried by words, by a mark (a star or a ring), and by the tag and the position of
the objects, so it reads without colour and without watching the animation. In a win the meteorite
rises a little more, its backdrop is brighter, and one sweep of light crosses the metal.

The stage is always night, in both colour schemes, and the panels follow through the tokens.
A container cannot restyle itself, so `.stage` is the container and the grid is on `.stage-grid`.
On wide stages the words sit left and the vessels right. Text areas have fixed heights where they
share a column with the vessels: the length of a sentence must never move them.

## Reuse from `house-dice-game`

Bits may import only from their own `src/` (`docs/style/interactive.md`), so reuse here is a copy.

| part | how it came across |
|------|--------------------|
| `useFullscreen.ts`, `scale.ts`, `Stats.tsx` | unchanged |
| `format.ts` | the generic half unchanged, the domain half rewritten |
| `Chart.tsx` | three changes: `heading` prop, several `extraLegend`, no reading past the end of a short series |
| Panel layout and tabs, most of the panel CSS | same pattern and same rules, with its own tokens |
| `useLab.ts` | same pattern |
| Reducer shape, storage by replayable digits | same idea; a game here has five phases |

## Multiplayer

Not in scope. `house-dice-game/README.md` lists what it would require, and nothing here changes
that. `summarize` already pools rounds from several sessions.

## Limitations

- The meteorite is a rendered image, not a photograph of a specimen.
- On iPhone Safari there is no element fullscreen, so the control is hidden.
- There is no data export, and the session and simulation tables are not sortable.
- The theory is fixed for three options. A version with more would need a new `rules.ts`, not a
  parameter, and the brief forbids variants that change the probabilities.
