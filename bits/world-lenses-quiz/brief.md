# Cambiare le lenti — brief

## Intent

A quiz on the present world whose real product is the explanation, not the score. Each question
puts to the test a broad image of societies and regions — who is educated, where wealth lives,
which societies are centres of migration, how religions, capacities and power are distributed —
with a dated, sourced fact. History explains the present but is not the object of the
questions; economic data matter when they reveal power relations or change the image of a
society, not as industrial curiosities.

The bank (`src/data/bank.json`, *Atlante delle idee sbagliate sul mondo*, 5th edition, Civic
Education, liceo delle scienze umane) is shown whole, never shortened or rephrased into trivia
by the Bit. This Bit is the instrument that lets a teacher compose a short route through it
and play it in class.

## Editorial status (2026-11-13)

The engine is finished; the content is not. The current bank was produced with AI-assisted
generation and does not meet the project's standard for the choice of facts, the wording of
the questions, the presentation of data and the quality of the explanations. It is published
as a **provisional prototype**, distinguishable from approved content: a discreet notice on
the opening screen, `status: provisional` in `src/data/review.json`, and items whose decisive
figure is not documented by a primary source held back from play (kept in the bank file).
Publishing the Bit is not approving any item.

The bank will be rebuilt by the author, progressively: the selection of meaningful
observations about the world comes first (facts, comparisons, insights, with sources checked
with AI assistance), and only a consciously selected observation becomes a playable item. No
authoring tool is planned for that: the bank stays a JSON file and the review file records
the editorial state.

## Essential relations

- question → choice → explicit confirmation → answer + explanation: the explanation is reached
  only through a commitment, which is what makes it land;
- explanation → *una domanda che resta aperta*: every item ends on an interpretive question with
  no single answer, never scored. Political questions can stay open (D64: the comparison of
  policies and priorities, with the 2026 update; hypotheses on interests stay hypotheses);
- every fact keeps its year and its sources, after the answer: a number without a date and a
  denominator is not evidence; the perimeter of a fact is kept (D45: "scienze di base", not
  STEM as a whole);
- the maps do not coincide: population, education, money, mobility and force each have a
  different geography. Routes (presets) are built to make that visible.

## Required elements

- Preparation with three converging entries — a ready route (preset), manual choice from the
  bank, random draw — all producing one ordered, editable battery: add, remove, reorder,
  shuffle, save as a personal route (stored in the browser, exportable/importable as JSON).
- Bank search plus two essential filters (topic, geographic area); counts of available and
  selected questions always visible.
- One question at a time, three large alternatives, explicit confirmation, outcome, the
  answer, the explanation in reading type, the open question, year and sources in a secondary
  zone, user-driven advance, a progress indicator, a way back to preparation and a restart.
- An end screen with the result and every answer, each explanation and open question
  re-openable, and the open questions together for a closing discussion.
- Saved routes survive a new edition of the bank: what is no longer active is removed and
  named, alternatives are proposed, never imposed.

Deliberately left out: timers, points per speed, leaderboards, accounts, any server. The
teacher-only fields (`lens_before`, `editorial_rationale`, `teacher_note`, `verification`) stay
in the preparation view and in a closed, separate block after the answer, never mixed with the
students' text.

## Didactic progression

1. The teacher (or student) composes a route of 8–12 questions: a lesson's worth.
2. Before each answer, ask the class how sure they are (the atlas suggests it).
3. After the confirmation, read the answer and the explanation, then open the question that
   remains open and discuss it; locate the relation on a map when it helps.
4. At the end, review the answers: the wrong ones are the most interesting, not failures.

## Misconceptions / pitfalls

- The teacher titles (`title_teacher`) often give the answer away: they may appear while
  preparing, never before the answer during play.
- Do not attribute the same prejudice to everyone: `lens_before` is a hypothesis for the
  teacher, not a belief to project onto students. A right answer may still have a reasoning
  worth discussing.
- The open question is not a second quiz: no options, no score, no right/wrong.
- Teacher notes (`teacher_note`) are technical cautions for the teacher, not feedback.
- Historical snapshots and estimates are not current measurements; keep the year visible.
- Random routes should not cluster on one country when the aim is an overview.
- A wrong answer is the moment of discovery: the tone must invite revision, never shame.

## Related ideas

Same civic-education audience as the game Bits (`just list --tag civic-education`). Natural
companions: map projections (equal-area vs Mercator), population cartograms, a handout with
the "Prima immaginavo… / ora posso sostenere…" reflection.
