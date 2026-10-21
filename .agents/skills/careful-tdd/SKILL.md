---
name: careful-tdd
description: Develop a feature from an agreed specification through review-gated, symptom-changing TDD steps. Use when the user wants to commit the failing feature test first, review each minimal implementation step, and preserve the incremental history for later squashing or retconning.
---

# Careful TDD

Turn a specification into working behavior without jumping from the initial red
test to a complete implementation. Treat each changed failure as evidence that
one understood part of the design has been implemented.

## Establish the feature test

- Identify the specification and the production boundary it exercises.
- Write the smallest feature test that demonstrates the specified behavior at
  that boundary. Prefer realistic public interfaces over test-only seams.
- Run it and inspect the failure. The initial red result must be caused by the
  missing feature, not by a broken fixture, typo, unrelated failure, or invalid
  premise.
- Commit the failing test separately so the starting point remains reviewable.

Do not weaken the expectation to match current behavior. If the test or
specification proves mistaken, explain the discrepancy and get agreement before
changing the test.

## Advance one symptom at a time

For each implementation step:

1. Record the current failure symptom precisely.
2. Choose the smallest production change that is both consistent with the
   design and expected to change that symptom. A stub is acceptable only when
   it represents a real architectural seam; do not hard-code the expected test
   result or bypass authority, validation, persistence, or asynchronous
   behavior.
3. Make only that change and rerun the narrow feature test.
4. Confirm that the symptom changed for the predicted reason. The test need not
   pass yet; a new failure at the next unimplemented boundary is useful
   progress.
5. Present the diff, old symptom, new symptom, and design rationale for user
   review. Stop before starting another step.

If the user accepts the step, normally commit it as its own checkpoint. If the
user rejects it, revise the same step rather than stacking more code on a
disputed choice.

Keep the feature test stable while advancing through production code. Add or
adjust narrower tests only when a newly exposed invariant needs focused
coverage, and keep such tests with the implementation step they explain.

## Finish the cycle

Green means the original feature test passes through the intended production
path, not merely that its immediate assertion was silenced. When it turns
green, reconcile the implementation with the agreed specification and actively
look for another observable counterexample. If an in-scope design obligation is
still missing, add the smallest test that falsifies the current implementation;
that new red test is part of the current step, not a future enhancement.

Declare the feature complete only when no remaining in-scope way to distinguish
the implementation from the agreed design is known. This is a falsification
check, not a demand for exhaustive proof or unrelated hardening. Run the
relevant focused checks and any repository-required verification before
declaring the feature complete.

Preserve the review checkpoints during development. Squash, fix up, or retcon
them only when the user asks or the agreed workflow reaches that stage.
