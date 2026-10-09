# Archimedes' buoyant force from the pressure difference — brief

## Intent

A one-page typeset handout for upper-secondary physics: the **derivation of Archimedes'
principle** $F_A = d_f g V$ from the difference of pressure between the two bases of a
fully immersed parallelepiped — the natural continuation of `stevino-law-derivation`,
whose law is the only ingredient. After reading it the student can explain **why the
push points upward** (deeper face, larger pressure), reproduce the algebra to
$F_A = d_f g V$ with no skipped step, and decide **from the densities alone** whether a
released body sinks, stays suspended or rises. Written to be kept as proof notes.

## Essential relations

- Parallelepiped fully immersed in a static fluid of uniform density $d_f$ (school
  convention $d = m/V$), constant $g$; horizontal bases of area $S$ at depths
  $h_{\mathrm{sup}}$, $h_{\mathrm{inf}}$ from the free surface; $\Delta h = h_{\mathrm{inf}}-h_{\mathrm{sup}}$,
  $V = S\,\Delta h$.
- Pressure forces of the fluid on the faces: $F_{\mathrm{sup}} = p_{\mathrm{sup}}S$ down,
  $F_{\mathrm{inf}} = p_{\mathrm{inf}}S$ up; the lateral ones are horizontal and cancel
  pairwise (same depth, same pressure).
- Stevino's law on both bases, $p = p_0 + d_f g h$: since $h_{\mathrm{inf}} > h_{\mathrm{sup}}$,
  $p_{\mathrm{inf}} > p_{\mathrm{sup}}$, so the resultant of the pressure forces — the
  **spinta di Archimede** — points up. $p_0$ cancels in the difference: atmospheric
  pressure contributes nothing to the buoyancy.
- $F_A = d_f g S \Delta h = d_f g V = m_f g = F_P^{f}$ (boxed): equal in magnitude to the
  **weight of the displaced fluid**. $V$ is always the immersed volume; the principle is
  stated to hold for bodies of any shape (not re-proved for them).
- Fate of a released fully immersed body of density $d_c$: compare $F_P^{c} = d_c V g$
  with $F_A = d_f V g$ → $d_c > d_f$ sinks, $d_c = d_f$ suspended, $d_c < d_f$ rises;
  floating equilibrium $d_f g V_{\mathrm{imm}} = d_c g V_{\mathrm{corpo}}$.

## Required elements

- Figure beside the force analysis: fluid with wavy free surface labelled
  $p_0 = p_{\mathrm{atm}}$, white immersed body, the two resultant arrows on the bases
  (down on top, longer up below), dashed depth guides and $h_{\mathrm{sup}}$ /
  $h_{\mathrm{inf}}$ arrows from the free surface, brace for $\Delta h$, $S$ on both bases.
- The statement that each arrow is the **resultant** of a pressure distributed over the
  whole face, not a single force at a point.
- The derivation as an annotated `align` chain: difference of the two forces → factor $S$
  → substitute Stevino on both bases → $p_0$ cancels (a step of its own) → factor $d_f g$
  → recognise $\Delta h$ and $V$; a short verbal reason on every line.
- The boxed $F_A = d_f g V = m_f g = F_P^{f}$ read as *weight of the displaced fluid*,
  with "any shape" and "immersed volume" made explicit.
- The three-row sink/suspend/rise table in terms of $d_c$ vs $d_f$ (and $F_P^c$ vs $F_A$),
  plus the partial-immersion equilibrium of floating.

## Deliberately left out

- The proof for bodies of arbitrary shape (surface integrals / Gauss): asserted, not
  derived — the parallelepiped is the school-level argument.
- Apparent weight and dynamometry experiments, hydrometers, boats and stability.
- Surface tension, viscosity, compressibility, variable $g$.
- Worked numeric exercises: this is the proof; exercises belong elsewhere.

## Didactic progression

Forces of the fluid on each face of the immersed body (where does each act, why the
lateral ones cancel) → why the resultant must point up → algebra from Stevino's law to
$F_A = d_f g V$ → physical reading: weight of the displaced fluid → prediction of the
body's fate from the density comparison → floating as the self-adjusting partial immersion.

## Misconceptions / pitfalls

- The push is not "water lifting from below": it is the **difference** between two
  pressure forces; at equal depth the horizontal pushes cancel, the vertical ones do not.
- $p_0$ disappears in the difference — buoyancy does not depend on atmospheric pressure,
  only on $d_f$, $g$ and the immersed $V$.
- $V$ is the **immersed** volume: for a floating body it is smaller than the body's
  volume, and the equilibrium adjusts it until the push balances the weight.
- Buoyancy acts on sinking bodies too (it reduces the apparent weight); "it sinks" means
  $F_P^c > F_A$, not "no push".
- The verdict comes from comparing **densities** (intensive), not masses or weights:
  a huge ship of steel floats, a small steel ball sinks.

## Related ideas

- Direct companion of `stevino-law-derivation` (same method: pick a body, list the
  forces, write the equation; same tags): that handout supplies the law this one consumes.
- Same "choose a body, list the forces" method as the mechanics Bits to come.
- Natural future Bits reusing the tags: a floating-equilibrium explorer (partial
  immersion and $V_{\mathrm{imm}}$), a density-comparison animation, communicating vessels.
