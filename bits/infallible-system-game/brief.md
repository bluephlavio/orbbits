# Il sistema infallibile — brief

Engine-independent specification. A simplified European roulette for discovering why no betting
system beats the house. The third game of the Civic Education path, after `house-dice-game` (the
edge hidden in a payout) and `three-possibilities-game` (probability hidden in a protocol). Here the
illusion is a *strategy*: the martingale, which wins almost always and still loses on average.

## Intent

A student should play roulette for its own sake, meet the temptation of a system that "cannot
lose", try it, see it work again and again, and then discover from their own data and from many
simulated players that winning often and gaining on average are different things.

The progression is **free play → the system → watching it win → the rare collapse → own data →
many independent players → the invariant**. The central paradox — *one can win almost every
session and still lose on average* — is never announced: it has to emerge from the numbers.

## Essential relations

- European wheel: 37 equally likely pockets, 18 red, 18 black, the green zero.
- A bet on a colour pays 1:1. The zero loses for both colours. P(win) = 18/37, P(lose) = 19/37.
- Expected net gain per unit staked: 18/37 − 19/37 = −1/37 ≈ −2,70%.
- **Invariant.** For any strategy that eventually stops, expected net gain =
  −1/37 × expected total amount staked. Strategies change the *shape* of the distribution of
  results, never its centre relative to the money wagered.
- **Martingale.** Stake the base b; after each loss double the stake; after the first win the
  cycle closes with net +b, because b + 2b + … + 2ᵏ⁻¹b = (2ᵏ − 1)b < 2ᵏb.
- The money needed grows exponentially: k consecutive losses cost (2ᵏ − 1)b. A cycle can last at
  most k spins, where k is the largest level with (2ᵏ − 1)b ≤ capital and 2ᵏ⁻¹b ≤ table limit.
  When the next doubling is impossible the system stops.
- One cycle: P(collapse) = (19/37)ᵏ; E = b·(1 − (19/37)ᵏ) − b·(2ᵏ − 1)·(19/37)ᵏ.
- With capital 63 and base 1 (k = 6, stakes 1–2–4–8–16–32): +1 in 98,17% of sessions, −63 in
  1,83%, E ≈ −0,174 tokens per session.
- Repeating cycles does not help: every cycle carries the same risk, and over many cycles the
  collapse becomes likely, not rare.

## Required elements

### The game
- A roulette wheel that is the protagonist: physical, readable from the back of a classroom,
  a ball that settles convincingly; the result stated in words, number and colour.
- A virtual capital, always visible, with the house as a visible counterpart; the current stake;
  a history of recent spins and the capital's trend.
- Free betting: choose red or black, build the stake with chips. Stakes respect the capital and
  the table limit.
- Configurable starting capital, base stake and table limit, fixed for a session once it starts.
- A "system" mode: the martingale applied for the player, step by step or automatically. Its
  ladder shows the stakes 1–2–4–8–…, where the player is on it, what has been lost in the current
  cycle, and which steps are out of reach. It stops when doubling is no longer possible.
- Free mode comes first and the system is offered contextually, never imposed. Both stay
  reachable at any time.
- The game ends when the capital is gone, or when the player stops. Stopping is always possible.

### Analysis (closed at first, reachable without interrupting the game)
- This session: capital over spins; total staked against net gain, with the expected loss
  (1/37 of the staked total) as a reference; cycles of the system.
- Sessions on this device: how many ended ahead, the mean result.
- Simulation (a distinct world, it never touches the game): many independent players, each
  playing one session with given capital, base, limit, goal and spin cap; martingale and flat
  betting on the same spins of the wheel; distribution of results, share of winning sessions,
  mean gain, mean staked, convergence of the mean; reproducible seeds.

## Didactic rules

- **No spoilers:** the conclusion is not stated in the game. The theory is in a closed section of
  the analysis.
- **No manipulated results:** every number in the simulation comes from simulated spins under the
  stated stops and limits. Theory is shown beside data, never in place of it.
- **Bets, sessions, players are different units.** Every statistic says which one it counts.
- **No manipulative mechanics:** no streak rewards, no near-miss effects, no escalation, no
  urging. Win and loss feedback are symmetric. Autoplay exists only for the system, as an
  instrument to watch it run, and stops at once when asked.

## Misconceptions and pitfalls

- "After five reds, black is due": spins are independent; the wheel has no memory.
- "Doubling always recovers": only if the next doubling is affordable and allowed.
- "I won 30 sessions out of 30, so the system works": frequency of wins is not expected gain.
- "The loss was bad luck": the collapse is part of the system, rare but certain to come.
- "A bigger capital fixes it": it makes the collapse rarer and larger; the mean does not improve.
- "My choice of colour matters": illusion of control; both colours have the same odds.
- Chasing losses: the martingale is the mathematical form of it.

## Related ideas

`house-dice-game` (expected value, law of large numbers), `three-possibilities-game`.
The St Petersburg paradox; optional stopping; d'Alembert and other "progressions".
