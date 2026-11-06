# Tre possibilità — brief

Engine-independent specification. The Monty Hall problem as a game, played alongside
`house-dice-game` in the Civic Education path of a third-year class of the Liceo delle Scienze
Umane. Same concept family, different lesson: there the structure was hidden in a payout, here it
is hidden in what a choice leaves behind.

## Intent

A student should form a conviction, probably "two options left, so it does not matter", test it
with their own hands, be surprised, and finally understand why with elementary reasoning.

The progression is **choice → conviction → own data → many paired games → reasoning**. The
surprise is the point: anything that announces the result early destroys what the Bit is for.

## Essential relations

- Three identical vessels hide a meteorite and two stones of the Earth. The meteorite is placed
  uniformly at random, before the player chooses.
- The game knows where it is, never opens the player's choice, never opens the meteorite, and
  always reveals a stone. With two stones available the choice between them is a fair coin.
- The player may always keep the first choice or take the only other closed vessel.
- Winning by keeping means the first choice was right: probability 1/3.
- Winning by switching means the first choice was wrong: probability 2/3.
- On any one configuration exactly one of the two strategies wins. They are complementary.
- These values hold for every first choice and every stone revealed, not only on average.

## Required elements

### The game
- Three identical vessels, solid and readable from the back of a classroom, with a simple,
  convincing way of opening. The vessel itself is the control, on mouse, touch and LIM alike. It
  creates the wait and shows off what it reveals; it does not dominate the scene.
- A meteorite that is the protagonist of the reveal, unmistakable beside two ordinary pebbles:
  rare and remarkable, not magical.
- Rules that state what the game knows. The result depends on this protocol, so it is part of the
  text on screen, not a footnote.
- Two moments of decision, of equal visual weight. Nothing may lean towards "keep" or "switch".
- Everything is opened at the end: the player sees where the meteorite was.
- An outcome that cannot be misread from a distance: said in words, marked with a shape and shown
  on the objects, never by colour or animation alone.
- A plain register of the rounds. No tokens, no score to protect.

### Analysis (closed at first)
- Games, wins, losses, overall frequency; how often each strategy was used and how it fared.
- Frequency of each strategy over its own games; observed values with their uncertainty against
  1/3 and 2/3; variability across sessions.
- The theoretical values are behind a deliberate switch, off at every page load.
- A session is a run of games by one player. Sessions stay on the device.

### Simulation (a distinct world)
- Both strategies applied to the same random configurations, so complementarity is observed
  rather than asserted: "both win" and "both lose" are counted, and stay at zero.
- It never touches the games really played.

### Reasoning (on request, apart from the statistics)
- Three cases, one for each place the meteorite can be, built up step by step.
- Then why "two options, 50% each" fails. No Bayes, no conditional probability notation.

## Didactic rules

- **No outcome spoilers:** nothing in the interface says that switching is better until the
  learner asks: no theory before the switch, no reasoning before the button, no asymmetry between
  the two actions.
- **No information leaks:** nothing visible may depend on the meteorite's position before the
  reveal. Which pebble appears depends only on the vessel it is in: if it depended on the deal, an
  attentive player could deduce the position from the pebble.
- **Few data are few data:** with little play on one strategy the interface says so and draws no
  conclusion. Uncertainty is always shown with the frequency.
- **No manipulative mechanics:** no autoplay, no streaks, no collection, no celebration escalating
  with wins. A win is clear and pleasant, a loss just as clear and without penalty: the meteorite
  is shown either way, and neither outcome pushes towards another game.

## Misconceptions and pitfalls

- "Two options left, 50% each": the two closed vessels did not get there in the same way.
- "The stone tells me something about my choice": a stone among the other two is always there to
  be opened, so seeing one says nothing new about the first choice.
- "Switching always wins": it wins two times in three, and a student who switches and loses has
  not refuted anything.
- "I changed once and won": one game is compatible with either answer.
- "If I change I can regret it more": regret is a real effect, and worth naming in class, but it
  does not move a probability.
- If the game did not know and only happened to reveal a stone, the two options really would
  be 50–50. The knowledge is what makes the result: it is not a detail of the setting.

## Related ideas

`house-dice-game` for the law of large numbers. Bertrand's box paradox has the same structure.
