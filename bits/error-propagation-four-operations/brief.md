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
- Method of the **extremes of the interval** (not differentials): find $c_{\max}$ and
  $c_{\min}$ of the indirect quantity, then write $c = \bar c \pm \Delta c$.
- Sum and difference: $\Delta c = \Delta a + \Delta b$ — **exact** in the model.
- Product: exact relative deviations $\varepsilon_a + \varepsilon_b \pm \varepsilon_a\varepsilon_b$
  (asymmetric); first order $\varepsilon_c \simeq \varepsilon_a + \varepsilon_b$,
  $\Delta c \simeq \bar b\,\Delta a + \bar a\,\Delta b$.
- Quotient: exact relative deviations $(\varepsilon_a+\varepsilon_b)/(1 \mp \varepsilon_b)$;
  same first-order formulas as the product; absolute form
  $\Delta c \simeq \Delta a/\bar b + (\bar a/\bar b^2)\,\Delta b$.
- Maximum errors / uncertainty limits, **not** statistical independent errors: no
  root-sum-square anywhere.

## Required elements

- Explicit definitions of the extremes and of the goal (the interval of $c$).
- Monotonicity hypotheses stated up front for product and quotient:
  $\bar a > 0$, $\bar b > 0$, $\Delta a < \bar a$, $\Delta b < \bar b$ (so the interval of
  $b$ never contains $0$).
- The sign subtlety of the difference ($c_{\max} = a_{\max} - b_{\min}$) called out and
  explained in words, not just computed.
- The second-order term $\Delta a\,\Delta b$ named, both exact deviations shown, and its
  smallness argued (products of small relative errors).
- The approximation $1/(1-\varepsilon_b) \simeq 1 + \varepsilon_b$ made explicit.
- Typography that distinguishes: exact results, first-order approximations, and the formulas
  normally used in school problems (labels next to the boxed formulas).
- Closing summary table (operation → absolute/relative uncertainty → exact or approximate)
  and a final note that does not hide the approximation step.

## Didactic progression

Setup (intervals, extremes, worst-case model) → sum (exact, symmetric, warms up the
method) → difference (sign subtlety; errors still add) → product (asymmetry, relative
errors, second-order term, first-order formulas) → quotient (which extremes give max/min,
exact asymmetric deviations, approximation) → summary table.

## Misconceptions / pitfalls

- The minus sign in $a - b$ does **not** subtract the uncertainties; absolute errors add.
- The relative-error rule for product and quotient is **not an identity**: it drops
  $\varepsilon_a\varepsilon_b$ and replaces $1/(1-\varepsilon_b)$ with $1+\varepsilon_b$.
- No quadrature: that belongs to independent random errors, a different framework.
- Monotonicity hypotheses are load-bearing for product/quotient (they fix which extremes
  give max and min); they are not decorative.

## Related ideas

- Differential (linear-propagation) method and statistical propagation — out of scope,
  worth one mention so students know they exist.
- Natural companions not yet in OrbBits: a laboratory handout on significant figures, an
  interactive where $\varepsilon_a, \varepsilon_b$ sliders show the exact vs first-order
  interval (candidate future Bit, tags to reuse).
