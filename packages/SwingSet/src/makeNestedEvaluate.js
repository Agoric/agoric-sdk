import harden from '@agoric/harden';

// We assume we're running in a SES environment.
export function makeNestedEvaluate(compartment, endowments = {}) {
  // Create a simple wrapper for the evaluator.
  const nestedEvaluate = source => compartment.evaluate(source, endowments);

  // Feed back the endowment to itself.
  endowments.nestedEvaluate = nestedEvaluate;
  return harden(nestedEvaluate);
}

// This function implements makeNestedEvaluate with SES1 (pre-lockdown).
export function SES1MakeNestedEvaluate(SES1, endowments = {}) {
  // We evaluate within SES so that the resulting object does
  // not give away access to the root realm.
  const source = `(${makeNestedEvaluate})`;
  const nestedEvaluate = SES1.evaluate(source, {
    harden: SES1.global.SES.harden,
  })(SES1, endowments);
  return nestedEvaluate;
}
