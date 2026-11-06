# Il dado del banco

Technical notes. Pedagogical intent: `brief.md`; classroom prose: `narrative.md`.

- Kind: interactive · Engine: react, no extra dependency · Public page: `/bits/house-dice-game/`
- Language: Italian only, strings inline (not planned in several languages)
- Tests: `node --test bits/house-dice-game/tests/*.test.ts`, also run by `just test` and CI
- Standalone export: `just export house-dice-game` → `dist/web/` (rebuildable, not versioned)

## Structure

The dependency runs one way: `ui/` reads `game/`, and `game/` knows nothing about React.

```text
src/index.tsx          composition; owns only the panel layout (closed | docked | focus)
src/game/rules.ts      rules, theory derived from them, the fair die
src/game/session.ts    pure reducer over an append-only event log, storage format
src/game/stats.ts      summaries and chart series, pure functions of the log
src/game/lab.ts        the simulator; shares the rules with the game and nothing else
src/ui/dieMotion.ts    die geometry and lighting, pure and tested
src/ui/Die.tsx         CSS 3D cube, animated frame by frame
src/ui/Stage.tsx       the table: purses, die, verdict, controls, trail
src/ui/Analytics.tsx   the panel and its tabs (Partita, Storico, Simulazione)
src/ui/Chart.tsx       line/band/rule chart in plain SVG, sized in real pixels
src/ui/useSession.ts   reducer + die + localStorage
src/ui/useLab.ts       runs simulations a slice per frame
src/ui/useFullscreen.ts, scale.ts, format.ts, colors.ts, Stats.tsx
tests/*.test.ts        Node's own test runner on the pure modules
```

## Accounting

A throw has two steps, and every guard is in the reducer rather than in the UI:

1. `roll {face}` needs `canRoll`. It takes the stake and fixes the face, drawn once by the
   caller so that the reducer stays pure. A second `roll` while one is pending is a no-op.
2. `settle {id}` appends the event and pays. It is accepted only for the pending roll's id,
   which makes it idempotent and rejects stale callbacks. Ids never restart, not even after
   `clearAll`.

Only settled events exist for statistics, so an open chart cannot spoil a throw. The die
reports `settle` from its animation and from a safety timer, because `requestAnimationFrame`
stops in a hidden tab; the second call is ignored.

`ledgerOf` splits the tokens into `you + table + house`, always equal to the initial balance.

Storage (`orbbits.house-dice-game.session`, this device only) keeps faces, not balances: loading
replays them through the reducer, and a log the rules would refuse discards the store. A pending
roll is saved as played, so a reload cannot refund a stake. The archive keeps the last 60 games.

## Randomness

`crypto.getRandomValues` bytes with rejection above 251, avoiding modulo bias. The source is
injectable for tests. The simulator owns a separate die, so it does not consume the game's.

## Simulation

Simulated players have no balance; they record net gain, which may go negative. `ruinedAt` is
the first roll at which the net reaches `−referenceBalance`, which a test checks against the
roll on which the real reducer ends the same sequence. `referenceBalance` is the current game's
initial balance when the run starts. Runs are kept in memory (12 at most) and are lost on
reload, unlike games. Chart axes come from the theory, not from the data, so they hold still
while trajectories grow; samples are exact values, thinned to about 200 per trajectory.

## Theory on the charts

The band is ±2σ√n, a normal approximation: about 95% of games once n is not too small, loose
for the first rolls. On "Il saldo e l'andamento atteso" the expected line ignores the absorbing
barrier at zero, as its caption says, and both line and band are clipped at the axis.

## Multiplayer: not implemented

OrbBits has no primitive for it: the public site is static files on GitHub Pages, with no server
or identity, and `docs/style/interactive.md` forbids network requests at runtime. The Storico tab
gives a real collective view on one device (turns at the LIM); the simulator gives a simulated
class. A real multiplayer would need:

1. a shared service: a hosted realtime database or a small WebSocket server. This is the first
   thing in OrbBits that is not static, and the rule above would need a deliberate exception;
2. a room: the teacher creates a short code, students join anonymously;
3. a decision on trust: clients reporting results is enough for a class, a server rolling the die
   is only needed if students would tamper;
4. minors' data: nicknames or nothing, no accounts, retention measured in hours (GDPR);
5. a teacher view: mostly the Storico tab fed by a stream of games.

The events are ready for it (`{n, face, net, balance}`), and `summarize` already pools them.

## The next game

Not a framework. For a Monty Hall Bit, these parts should transfer, in order of confidence:

| part | transfers as | what changes |
|------|--------------|--------------|
| `useFullscreen.ts`, `format.ts`, `scale.ts` | as they are | nothing |
| `Chart.tsx`, `Stats.tsx` | as they are | the `Lancio n` tooltip heading |
| Panel layout and tabs (`index.tsx`, `Analytics`, the CSS) | the pattern | tab contents |
| Reducer shape: pending step + settled log + archive + replay | the pattern | a round has several steps |
| `useLab.ts` + `lab.ts` | the pattern | outcomes are categorical, not cumulative |

Bits may import only from their own `src/` (`docs/style/interactive.md`), so reuse means copying,
or deciding at that point where shared code lives. That decision belongs with the second game:
`docs/architecture.md` defers a shared plotting primitive until a second use exists, and this is
it. Two real games will show what is actually common.

## Limitations

- The die has no physics: the rotation is an eased interpolation to the drawn face.
- On iPhone Safari there is no element fullscreen, so the control is hidden.
- Storico and Simulazione tables are not sortable; there is no data export.
- Stake and payout are constants. A "what payout is fair?" control would be a small change:
  the theory is already derived from `RULES`.
