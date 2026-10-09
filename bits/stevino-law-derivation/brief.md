# Stevino's law from the equilibrium of a fluid column — brief

## Intent

A one-page typeset handout for upper-secondary physics: the **complete derivation** of
Stevino's law $p = p_0 + d_f g h$ from the equilibrium of a vertical column of fluid, for
the lessons where the textbook omits the proof or gives it in a form that does not
convince. After reading it the student can reproduce the argument and say **where each
force acts** and **why the base area disappears** from the final formula. It is written to
be kept as proof notes, not followed live on the board.

## Essential relations

- Static fluid of uniform density $d_f$ (school convention $d = m/V$, not $\rho$), constant
  $g$; column of height $h$ and base area $S$, top pressure $p_0$ ($p_{\mathrm{atm}}$ for a
  free surface).
- Equilibrium of the column: $R = F_0 + F_P^{f}$ — the upward force of the fluid below on
  the **base face** balances the pressure force on the **top face** plus the **weight**
  (acting on the whole volume).
- $F_0 = p_0 S$; $F_P^{f} = m_f g = d_f V g = d_f\, S h\, g$.
- Pressure on the base: $p = R/S \Rightarrow p = p_0 + d_f g h$, with no skipped step
  between those two expressions.
- Reading of the law: at $h = 0$, $p = p_0$; linear growth with slope $d_f g$; it is the
  **increase** $p - p_0 = d_f g h$ that is tied to the column's weight.

## Required elements

- Free-body analysis of the column stating *where* each of the three forces is applied
  (top face / whole volume, drawn at the centre of gravity / bottom face), plus the note
  that the lateral pressure forces are horizontal and cancel.
- Force diagram next to the text: fluid with a wavy free surface, dashed column walls,
  $F_0$ and $F_P^{f}$ downward, $R$ upward, brace for $h$, label $S$ on the base.
- The derivation as an annotated chain: definition of pressure → equilibrium → split the
  two contributions → substitute force, mass, volume → cancel $S$; a short verbal reason on
  every line.
- The final formula boxed, and read as a line in the $(h, p)$ plane: intercept $p_0$,
  slope $d_f g$, with a small slope-triangle graph ($\Delta p / \Delta h = d_f g$).
- Hypotheses visible in the setup paragraph: fluid at rest, uniform $d_f$, constant $g$.

## Deliberately left out

- Communicating vessels, Pascal's principle, Archimedes' buoyancy: mentioned to the class,
  not derived here.
- Variable density / compressibility and the infinitesimal-column form $dp = d\, g\, dh$:
  the finite column is the school-level argument.
- Worked numeric exercises: this is the proof; exercises belong elsewhere.

## Didactic progression

Forces on the column (where does each act?) → equilibrium equation → divide by $S$ one
step at a time → read the law off the formula: intercept, slope, meaning of $p - p_0$.

## Misconceptions / pitfalls

- At depth, pressure is **not** just "the water's" $d_f g h$: $p_0$ is transmitted and adds;
  the law composes, it does not replace.
- Pressure depends on depth, not on the shape of the container or on the total volume of
  liquid: the derivation itself shows it, since $S$ cancels — worth saying out loud.
- $R$ is a force **of the fluid below, upward** on the column, not "the weight of what
  sits underneath".
- The weight acts on the whole volume but is drawn as one arrow at the centre of gravity:
  the drawing is a representation, not a new claim about where gravity acts.
- Uniform density and constant $g$ are hypotheses of the model, not trivia.

## Related ideas

- First OrbBits Bit on fluids; natural companions as future Bits (reuse the tags): a
  communicating-vessels diagram, a pressure-vs-depth interactive explorer, Archimedes'
  principle.
- The same "choose a body, list the forces, write equilibrium" method as the mechanics
  Bits to come.
