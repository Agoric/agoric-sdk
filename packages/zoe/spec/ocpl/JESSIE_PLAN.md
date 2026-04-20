# Jessie Adaptation Plan

The OCPL reference development suggests a better proof shape than the current
trace theorem.

Target correspondence:

- OCPL `lowval`
  becomes a Jessie semantic authority predicate on values
- OCPL `low γ`
  becomes a predicate on attacker environments / initial roots
- OCPL `safe C`
  becomes "any adversarial Jessie context preserves the low-authority invariant"
- OCPL `good_state` / `is_good`
  becomes a Jessie global goodness predicate used in adequacy, rather than a
  theorem phrased in terms of stuckness on failed assertions
- OCPL robust safety
  becomes the separation-of-duties theorem for `makeCounter`

For the reduced Jessie core, the semantic predicate should be specialized to
old dynamic authorities:

- a value is `low_cap A` when every old `PrimDyn pid` reachable from it lies in
  the allowed set `A`
- for the `cUp` theorem, `A` initially contains only the old increment
  authority

This avoids making the main theorem depend on a brittle raw-syntax lemma of the
form "reachability goes backward through one step". Those lemmas can still
support the proof, but the main statement should be semantic.

The attacker-language side should also follow OCPL's assertion split:

- verified code may use `assert`
- adversarial contexts may not
- robust safety should say that any linked execution starting from a good state
  remains good

For Jessie, that means we should introduce a Jessie analogue of `good_state`
and stop using plain `CoreBzzt` as the user-facing safety statement.
