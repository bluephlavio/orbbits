# Error propagation in the four operations — brief

## Intent

A typeset handout for students at the start of their upper-secondary physics course: the
**complete derivations** — every algebraic step, no jumps — of the error-propagation formulas
for the four operations on two directly measured quantities. After reading it the student
can reproduce each derivation and, crucially, say **which results are exact and which are
first-order approximations** in the small relative uncertainties.

## Essential relations

- Direct measurements as intervals: $a = \bar a \pm \Delta a$, $b = \bar b \pm \Delta b$;
  extremes $a_{\max,\min} = \bar a \pm \Delta a$, $b_{\max,\min} = \bar b \pm \Delta b$.
  Relative errors are written **explicitly** as $\Delta a / \bar a$, $\Delta b / \bar b$ —
  no auxiliary symbols ($e_a$, $\varepsilon_a$, …), so the derivations read like the
  blackboard version.
- Method of the **extremes of the interval** (not differentials): find $c_{\max}$ and
  $c_{\min}$ of the indirect quantity, then write $c = \bar c \pm \Delta c$.
- Sum and difference: $\Delta c = \Delta a + \Delta b$ — **exact** in the model.
- Product: substitute the extremes, expand, then factor $\bar a\,\bar b$ out of the
  error terms by dividing each by $\bar a\,\bar b$; the relative errors appear on their
  own, the second-order term $\frac{\Delta a}{\bar a}\frac{\Delta b}{\bar b}$ is dropped
  exactly at that point, giving
  $\frac{\Delta c}{\bar c} \simeq \frac{\Delta a}{\bar a} + \frac{\Delta b}{\bar b}$ and
  $\Delta c \simeq \bar b\,\Delta a + \bar a\,\Delta b$.
- Quotient: crossed extremes, factor $\bar a$ and $\bar b$ into relative errors, then
  **multiply numerator and denominator by the conjugate** $1 \pm \frac{\Delta b}{\bar b}$
  so the denominator becomes the difference of squares
  $1 - \left(\frac{\Delta b}{\bar b}\right)^2$ (no Taylor / $1/(1-x)$ shortcuts); the
  second-order terms are dropped and both max and min are worked out in full, giving
  the same first-order rule as the product; absolute form
  $\Delta c \simeq \Delta a/\bar b + (\bar a/\bar b^2)\,\Delta b$.
- The four derivations stay structurally parallel: nominal value → which extremes pair
  up → visible algebraic chain for the maximum, the minimum analogous → comparison with
  $c = \bar c \pm \Delta c$ → boxed relative and absolute forms.

## Required elements

- Explicit definitions of the extremes, of the relative errors, and of the goal (the
  interval of $c$).
- Monotonicity hypotheses stated up front for product and quotient:
  $\bar a > 0$, $\bar b > 0$, $\Delta a < \bar a$, $\Delta b < \bar b$ (so the interval of
  $b$ never contains $0$).
- The sign subtlety of the difference ($c_{\max} = a_{\max} - b_{\min}$) called out and
  explained in words, not just computed.
- The dropped terms ($\frac{\Delta a}{\bar a}\frac{\Delta b}{\bar b}$ in the product,
  that and $\left(\frac{\Delta b}{\bar b}\right)^2$ in the quotient) named *second
  order* with the size argued once (products of two small relative errors: 1% → 0.01%),
  then dropped; the approximation sign $\simeq$ appears **exactly** where they are
  dropped — never earlier in the chain.
- The quotient denominator eliminated by multiplying by the conjugate
  $1 \pm \frac{\Delta b}{\bar b}$ (difference of squares at the denominator), shown in
  full for both max and min so the symmetry is visible; no Taylor expansion, no
  $1/(1-x) \simeq 1+x$ shortcut.
- Typography that distinguishes exact results from first-order approximations (the
  approximation sign in the boxed formulas and the closing summary table).
- Closing summary table (operation → uncertainty of $c$ → exact or approximate).

## Didactic progression

Setup (intervals, extremes, worst-case model) → sum (exact, symmetric,
warms up the method) → difference (sign subtlety; errors still add) → product
(substitute extremes, expand, factor $\bar a\,\bar b$, relative errors appear,
second-order term dropped at the marked point, first-order formulas) → quotient
(crossed extremes, conjugate multiplication eliminating the denominator, same
rule as the product) → summary table.

## Misconceptions / pitfalls

- The minus sign in $a - b$ does **not** subtract the uncertainties; absolute errors add.
- The relative-error rule for product and quotient is **not an identity**: it drops
  second-order terms ($\frac{\Delta a}{\bar a}\frac{\Delta b}{\bar b}$ and, in the
  quotient, $\left(\frac{\Delta b}{\bar b}\right)^{2}$).
- Monotonicity hypotheses are load-bearing for product/quotient (they fix which extremes
  give max and min); they are not decorative.

## Related ideas

- Differential (linear-propagation) method and statistical (quadrature) propagation — out
  of scope; the handout works with maximum errors only.
- Natural companions not yet in OrbBits: a laboratory handout on significant figures, an
  interactive where relative-error sliders show the exact vs first-order interval
  (candidate future Bit, tags to reuse).
