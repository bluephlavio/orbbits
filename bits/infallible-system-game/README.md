# Il sistema infallibile

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react, no extra dependency · Public page: `/bits/infallible-system-game/`
- Language: Italian only, strings inline (not planned in several languages)
- Tests: `node --test bits/infallible-system-game/tests/*.test.ts`, also run by `just test` and CI
- Standalone export: `just export infallible-system-game` → `dist/web/` (rebuildable, not versioned)

## Structure

The dependency runs one way: `ui/` reads `game/`, and `game/` knows nothing about React.

```text
src/index.tsx          composition; owns only which panel is open and the rules sheet
src/game/rules.ts      the wheel, the bet on a colour, theory counted from the wheel, fair draws
src/game/strategy.ts   table limits, the doubling and the flat stake, exact one-cycle theory
src/game/session.ts    pure reducer: free and system modes, halting, sessions, storage format
src/game/stats.ts      summaries, series, the system's cycles, pure functions of the log
src/game/lab.ts        the Monte Carlo simulator; shares rules.ts and strategy.ts and nothing else
src/ui/wheelMotion.ts  wheel geometry and ball motion, pure and tested
src/ui/Wheel.tsx       the wheel in plain SVG, turned frame by frame
src/ui/Betting.tsx     colour zones, chips, chip stacks, the ladder of doublings
src/ui/Stage.tsx       the table: capital, house, wheel, words, bets, controls, trail; autoplay
src/ui/Settings.tsx    the rules sheet (capital, base, limit), editable before the first spin
src/ui/Analytics.tsx   the panel and its Sessione and Sessioni tabs
src/ui/LabTab.tsx      the Simulazione tab
src/ui/Histogram.tsx   final results per session, with the mean marked
src/ui/Chart.tsx       line/band/rule chart in plain SVG, copied from three-possibilities-game
src/ui/useSession.ts   reducer + wheel + localStorage
src/ui/useLab.ts       runs simulations a slice per frame
src/ui/useFullscreen.ts, scale.ts, format.ts, colors.ts, Stats.tsx, ClearButton.tsx
tests/*.test.ts        Node's own test runner on the pure modules
```

## Units

The Bit counts in three units and never mixes them: a **spin** (one bet), a **session** (one
player's spins from the starting capital until they stop, run out, or the system halts and they
leave), a **player** (independent of every other). In the game a session is what the player plays;
in the simulation every player plays exactly one session. "Per session" and "per spin" are
written next to every statistic that could be read either way.

## A spin

As in `house-dice-game`, a spin has two steps and every guard is in the reducer. `spin {pocket,
bet, stake}` puts the stake on the table; the pocket is drawn by `useSession` from
`crypto.getRandomValues` (bytes ≥ 222 rejected: no modulo bias) so the reducer stays pure.
`settle {id}` appends the event; only the pending id is accepted, so a late animation callback or
the wheel's safety timer cannot count a spin twice. Only settled spins exist for statistics.

`ledgerOf` splits the tokens into `you + table + house`, always equal to the starting capital.

## The system

In system mode the reducer decides the stake: `base · 2^level`, level 0 after a win, +1 after a
loss (`strategy.ts`). A spin with any other stake is refused. After each settle the reducer checks
whether the next stake fits the capital and the table limit; if not, the system **halts**: it does
not shrink its stake or carry on. The player can restart from the base (`restart`), go back to
free play, or stop. Entering the system always starts a new cycle; leaving it mid-cycle abandons
the cycle with its losses (`cyclesOf` reports it as such).

Autoplay lives in `Stage.tsx`: a timer dispatches the next system spin 450 ms after the previous
one settles, with a 1,25 s wheel. It turns itself off when the system halts, the session ends, or
the mode changes, and the button is a pause at all times. Free play has no autoplay. Holding a key
on "Gira" does not repeat.

The contextual hint ("C'è chi giura di avere un sistema infallibile…") appears in free play after
at least three spins and two free losses in a row, once per page load, and can be dismissed.

## Simulation

`playSession` plays one session for one strategy, with the same `isStakeAllowed` and `stakeOf` as
the game. A test replays the same pockets through the reducer and compares the result. Stops, in
order: goal reached (net ≥ goal), spin cap, next stake impossible.

Every player has their own seeded stream (`seededWheel(seed, i)`, sfc32 seeded through a 32-bit
mixer, 32-bit draws with rejection): results do not depend on the slice size or on how many players
are simulated, and both strategies read the same pockets for the same player (common random
numbers, so the comparison is paired). The same seed and configuration reproduce an experiment
exactly; "Ripeti" does that. After every run the seed field draws a new one, so pressing "Avvia"
twice gives two independent experiments.

The seeded generator was checked beyond the unit tests: χ² over 370 000 draws, and the frequency
of six losses in a row from the start of 2 million streams per seed (|z| < 2.1 on every check).

Theory is shown only where it is exact: one martingale cycle (goal ≤ base, cap ≥ levels), via
`cycleTheory`, and the invariant −1/37 of the staked total. It is behind the switch "Mostra i
valori teorici", off at every load and not persisted. The band on "Guadagno medio per sessione" is
±2σ/√n with σ the exact standard deviation of one cycle (≈ 8.6 tokens for 63/1/100).

Runs are kept in memory (12 at most) and are lost on reload. Trajectories are kept for the first
20 players only. 10 000 players with goal +1 take about 6 s in headless Chrome, drawn as they run.

## Rendering

The wheel is SVG in a 400 × 400 viewBox: rim, ball track, 37 coloured bands with numbers, wells,
frets, a hub with a turret. The rotor group and the ball are moved by `setAttribute` each frame,
outside React. The ball is described by its angle *relative to the wheel*: it is planned to end on
the drawn pocket (`planSpin`) after at least four turns, drops from the track with two bounces and
a small skip on the frets, and then turns with the wheel. A test checks that it rests in the drawn
pocket for every pocket, start and jitter. The result disc in the centre appears only after settle.

Palette: a cool porcelain ground, a sand wheel, coral and ink for the colours, sage for the zero,
amber for the capital, blue for theory in the panel; dark mode follows the system. Chips are CSS
(radial + conic gradients). The stage is a size container (`.stage`) with the grid on
`.stage-grid`: one column on narrow stages, wheel left and bet right from 42 rem, wheel beside
everything on short wide stages (a phone on its side, or fullscreen), and a compact column when the
laboratory takes the centre.

## Persistence

`orbbits.infallible-system-game.session`, this device only. A session is stored as its setup and
its moves (`17r5` = pocket 17, red, stake 5; `S`/`F` mode changes, `R` restart, `X` stop) and
replayed through the reducer on load; a move the rules refuse discards the store. A spin in
progress is stored as played. The archive keeps the last 40 sessions.

## Reuse

Copied, as for the second game: `Chart.tsx`, `ClearButton.tsx`, `useFullscreen.ts`, `scale.ts`,
`Stats.tsx` from `three-possibilities-game` unchanged; `format.ts` and the panel CSS adapted. Three
games now carry the same five files. If a shared place for game code is ever decided, these are the
candidates, in this order.

## Limitations

- Only colour bets; no numbers, dozens or columns, and the zero has no "partage" or "en prison".
- The ball has no physics: its motion is an eased path to the drawn pocket.
- On iPhone Safari there is no element fullscreen, so the control is hidden.
- No data export; experiment and session tables are not sortable.
- The system always bets on the colour the player chose; it has no rule for changing colour.
