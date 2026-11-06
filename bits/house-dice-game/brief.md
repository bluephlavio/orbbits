# Il dado del banco — brief

Engine-independent specification. A small game of chance that doubles as a mathematical
instrument: Civic Education for a third-year class of the Liceo delle Scienze Umane.

## Intent

A student should play spontaneously, enjoy it, believe at first that the house can be beaten,
and then discover from their own data why it cannot. The Bit works as a game *and* as an
instrument for exploring probability; neither may compromise the other.

The progression is **personal experience → personal data → many games → many simulated
games**: "I can win" → "I lost, was it bad luck?" → "everybody drifts the same way" → "this
is not luck, it is structure".

## Essential relations

- One roll costs 1 token. A fair six-sided die is rolled. On a 6 the player receives 5 tokens
  (net +4); otherwise the stake is lost (net −1).
- Expected net gain per roll: E = (1/6)·4 + (5/6)·(−1) = −1/6 of a token.
- The house edge is 1/6 of a token per roll, 16.67% of the stake.
- Standard deviation of one roll: σ = √(125/36) = 5√5/6 ≈ 1.86.
- After n rolls: expected total −n/6, typical spread ±2σ√n. The spread grows like √n and the
  drift like n, which is why luck dominates short games and the edge dominates long ones.
- The upper edge of the ±2σ band crosses zero at exactly n = 500: a neat classroom fact.
- Relative frequency of the 6 → 1/6, and mean gain per roll → −1/6 (law of large numbers),
  with spread shrinking like 1/√n.

The fair payout would be 6 tokens (E = 0): the gap between 5 and 6 *is* the house's profit.

## Required elements

### The game
- A well-drawn die with a convincing throw; clear, restrained win/loss feedback.
- Balance always visible; the house as a visible counterpart ("every token you lose goes
  somewhere"). You + table + house is constant.
- Roll count and balance trend at a glance.
- Configurable starting balance. Fictional tokens only: no real money, no purchases.
- The game has an end: running out of tokens, or choosing to stop. Stopping is always
  possible and never discouraged.

### Analysis (closed at first, reachable at any time)
- Rolls, wins, losses, empirical frequency of the 6, total gain, empirical and theoretical
  mean gain per roll.
- Three graphs: balance over rolls; balance against the expected trend; relative frequency
  of the 6 against 1/6.
- Comparison of this game against all games played on the device.
- It can sit beside the game or take the centre of the screen for class discussion.

### Simulation (a distinct world)
- Many independent simulated players, 100 to 10,000 rolls each.
- It never touches the player's balance or statistics.
- Simulated players have no balance: they record net gain, which may go negative. The balance
  constraint is reported honestly on the side (how many would have run out of tokens).

## Didactic rules

- **Never present the expected value as a forecast.** The theoretical line is always shown
  with its spread and described as "around which many games concentrate".
- **No outcome spoilers:** nothing may reveal the result before the die stops, charts included.
- **No manipulative mechanics:** no autoplay in the game, no streak rewards, no near-miss
  effects, no urging to play again, no celebratory escalation. Win and loss feedback are
  symmetric in weight.

## Misconceptions and pitfalls

- "A 6 is due": rolls are independent; a long run without a 6 changes nothing.
- "I won, so the game is good": one winning game is compatible with a losing game.
- "Paying 5 for a 1-in-6 chance sounds generous": the payout looks like a multiplier, but the
  fair value is 6.
- Confusing gross payout (5) and net win (+4).
- Reading the expected line as where one will end up.
- Thinking the law of large numbers says errors "balance out": the frequency converges, while
  the absolute gap between total and expected value keeps growing like √n.

## Related ideas

A later Bit on the Monty Hall problem: choice, information and switching. Fair-game extension:
what payout makes E = 0? Roulette's single zero as the same structure at a different scale.
