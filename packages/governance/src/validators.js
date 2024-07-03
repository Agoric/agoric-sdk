import { Fail, q } from '@endo/errors';
import { E } from '@endo/eventual-send';

/**
 * @import {VoteCounterCreatorFacet, VoteCounterPublicFacet, QuestionSpec, OutcomeRecord, AddQuestion, AddQuestionReturn, AssertContractGovernance, AssertContractElectorate} from './types.js';
 */

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
  contractGovernorInstallation,
) => {
  const allegedGovernorPF = E(zoe).getPublicFacet(allegedGovernor);
  const realGovernedP = E(allegedGovernorPF).getGovernedContract();
  const allegedGovernedTermsP = E(zoe).getTerms(allegedGoverned);

  const [{ electionManager: realGovernorInstance }, realGovernedInstance] =
    await Promise.all([allegedGovernedTermsP, realGovernedP]);

  assert(
    allegedGovernor === realGovernorInstance,
    'The alleged governor did not match the governor retrieved from the governed contract',
  );

  assert(
    allegedGoverned === realGovernedInstance,
    'The alleged governed did not match the governed contract retrieved from the governor',
  );

  const governorInstallationFromGoverned =
    await E(zoe).getInstallationForInstance(realGovernorInstance);

  assert(
    governorInstallationFromGoverned === contractGovernorInstallation,
    'The governed contract is not governed by an instance of the provided installation.',
  );

  return { governor: realGovernorInstance, governed: realGovernedInstance };
};

/**
 * Assert that the governor refers to the indicated electorate.
 *
 * @type {AssertContractElectorate}
 */
const assertContractElectorate = async (
  zoe,
  allegedGovernor,
  allegedElectorate,
) => {
  const allegedGovernorPF = E(zoe).getPublicFacet(allegedGovernor);
  const electorate = await E(allegedGovernorPF).getElectorate();
  electorate === allegedElectorate ||
    Fail`The allegedElectorate didn't match the actual ${q(electorate)}`;

  return true;
};

harden(assertContractGovernance);
harden(assertContractElectorate);
export { assertContractGovernance, assertContractElectorate };
