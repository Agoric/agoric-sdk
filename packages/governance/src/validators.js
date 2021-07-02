// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details as X, q } from '@agoric/assert';

/**
 * Assert that the governed contract was started by the governor. Throws if
 * either direction can't be established. If the call succeeds, then the
 * governor got exclusive access to the governed contract's creatorFacet, and
 * can be trusted to manage its parameters.
 *
 * @type {AssertContractGovernance}
 */
const assertContractGovernance = async (
  zoe,
  allegedGoverned,
  allegedGovernor,
) => {
  const allegedGovernorPF = E(zoe).getPublicFacet(allegedGovernor);
  const realGovernedP = E(allegedGovernorPF).getGovernedContract();
  const allegedGovernedTermsP = E(zoe).getTerms(allegedGoverned);
  const [
    { electionManager: realGovernorInstance },
    realGovernedInstance,
  ] = await Promise.all([allegedGovernedTermsP, realGovernedP]);

  assert(
    allegedGovernor === realGovernorInstance,
    X`The alleged governor did not match the governor retrieved from the governed contract`,
  );

  assert(
    allegedGoverned === realGovernedInstance,
    X`The alleged governed did not match the governed contract retrieved from the governor`,
  );

  // TODO(3344): assert the installation once Zoe validates installations
  return { governor: realGovernorInstance, governed: realGovernedInstance };
};

/**
 * Assert that the governor refers to the indicated registrar.
 *
 * @type {AssertContractRegistrar}
 */
const assertContractRegistrar = async (
  zoe,
  allegedGovernor,
  allegedRegistrar,
) => {
  const allegedGovernorPF = E(zoe).getPublicFacet(allegedGovernor);
  const registrar = await E(allegedGovernorPF).getRegistrar();

  assert(
    registrar === allegedRegistrar,
    X`The allegedRegistrar didn't match the actual ${q(registrar)}`,
  );

  return true;
};

harden(assertContractGovernance);
harden(assertContractRegistrar);
export { assertContractGovernance, assertContractRegistrar };
