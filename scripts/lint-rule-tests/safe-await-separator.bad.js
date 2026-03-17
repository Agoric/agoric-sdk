// Lint parity test fixture for @jessie.js/safe-await-separator.
//
// This file deliberately contains a safe-await-separator violation, suppressed
// with an eslint-disable comment. If the rule ever stops firing — e.g. because
// the oxlint JS plugin bridge breaks — the disable becomes "unused" and oxlint
// will report an error via reportUnusedDisableDirectives, acting as a canary.
//
// DO NOT add `await null` or restructure this to fix the lint violation.
// The violation is intentional.

/* eslint-disable @jessie.js/safe-await-separator -- intentional parity-test violation */

/** @param {boolean} condition */
export async function maybeDoThing(condition) {
  if (condition) {
    await Promise.resolve(); // first await is nested inside `if` — violates safe-await-separator
  }
}
