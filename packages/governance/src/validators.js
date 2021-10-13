// @ts-check

import { E } from '@agoric/eventual-send';
import { ChoiceMethod, ElectionType, QuorumRule } from './question.js';

const { details: X, quote: q } = assert;

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

  const governorInstallationFromGoverned = await E(
    zoe,
  ).getInstallationForInstance(realGovernorInstance);

  assert(
    governorInstallationFromGoverned === contractGovernorInstallation,
    X`The governed contract is not governed by an instance of the provided installation.`,
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

  assert(
    electorate === allegedElectorate,
    X`The allegedElectorate didn't match the actual ${q(electorate)}`,
  );

  return true;
};

/** @type {MakeParamChangePositions} */
const makeParamChangePositions = (paramSpec, proposedValue) => {
  const positive = harden({ changeParam: paramSpec, proposedValue });
  const negative = harden({ noChange: paramSpec });
  return { positive, negative };
};
/** @type {ValidateParamChangeQuestion} */
const validateParamChangeQuestion = details => {
  assert(
    details.method === ChoiceMethod.UNRANKED,
    X`ChoiceMethod must be UNRANKED, not ${details.method}`,
  );
  assert(
    details.electionType === ElectionType.PARAM_CHANGE,
    X`ElectionType must be PARAM_CHANGE, not ${details.electionType}`,
  );
  assert(
    details.maxChoices === 1,
    X`maxChoices must be 1, not ${details.maxChoices}`,
  );
  assert(
    details.quorumRule === QuorumRule.MAJORITY,
    X`QuorumRule must be MAJORITY, not ${details.quorumRule}`,
  );
  assert(
    details.tieOutcome.noChange,
    X`tieOutcome must be noChange, not ${details.tieOutcome}`,
  );
};

/** @type {AssertBallotConcernsQuestion} */
const assertBallotConcernsQuestion = (paramName, questionDetails) => {
  assert(
    // @ts-ignore typescript isn't sure the question is a paramChangeIssue
    // if it isn't, the assertion will fail.
    questionDetails.issue.paramSpec.parameterName === paramName,
    X`expected ${q(paramName)} to be included`,
  );
};

/** @type {ValidateQuestionDetails} */
const validateQuestionDetails = async (zoe, electorate, details) => {
  const {
    counterInstance,
    issue: { contract: governedInstance },
  } = details;
  validateParamChangeQuestion(details);

  const governorInstance = await E.get(E(zoe).getTerms(governedInstance))
    .electionManager;
  const governorPublic = E(zoe).getPublicFacet(governorInstance);

  return Promise.all([
    E(governorPublic).validateVoteCounter(counterInstance),
    E(governorPublic).validateElectorate(electorate),
    E(governorPublic).validateTimer(details),
  ]);
};

/** @type {ValidateQuestionFromCounter} */
const validateQuestionFromCounter = async (zoe, electorate, voteCounter) => {
  const counterPublicP = E(zoe).getPublicFacet(voteCounter);
  const questionDetails = await E(counterPublicP).getDetails();

  return validateQuestionDetails(zoe, electorate, questionDetails);
};

/** @type {MakeValidateVoteCounter} */
const makeValidateVoteCounter = createdQuestion => {
  return async voteCounter => {
    const created = await E(createdQuestion)(voteCounter);
    assert(created, X`VoteCounter was not created by this contractGovernor`);
    return true;
  };
};

/** @type {MakeValidateTimer} */
const makeValidateTimer = timer => {
  return async detailsP => {
    return E.when(detailsP, details => {
      assert(
        details.closingRule.timer === timer,
        X`closing rule must use my timer`,
      );
      return true;
    });
  };
};

/** @type {MakeValidateElectorate} */
const makeValidateElectorate = electorateInstance => {
  return async regP => {
    return E.when(regP, reg => {
      assert(
        reg === electorateInstance,
        X`Electorate doesn't match my Electorate`,
      );
      return true;
    });
  };
};

harden(assertContractGovernance);
harden(assertContractElectorate);
harden(validateQuestionDetails);
harden(validateQuestionFromCounter);
harden(makeValidateVoteCounter);
harden(makeValidateTimer);
harden(makeValidateElectorate);
harden(assertBallotConcernsQuestion);
harden(validateParamChangeQuestion);
harden(makeParamChangePositions);

export {
  assertContractGovernance,
  assertContractElectorate,
  validateQuestionFromCounter,
  validateQuestionDetails,
  makeValidateVoteCounter,
  makeValidateTimer,
  makeValidateElectorate,
  assertBallotConcernsQuestion,
  validateParamChangeQuestion,
  makeParamChangePositions,
};
