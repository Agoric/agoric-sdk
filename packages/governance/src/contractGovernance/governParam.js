// @ts-check

import { E } from '@endo/eventual-send';
import { Far, deeplyFulfilled } from '@endo/marshal';
import { keyEQ } from '@agoric/store';

import {
  ChoiceMethod,
  coerceQuestionSpec,
  ElectionType,
  QuorumRule,
} from '../question.js';

const { details: X } = assert;

/**
 * The electorate that governs changes to the contract's parameters. It must be
 * declared in the governed contract.
 */
const CONTRACT_ELECTORATE = 'Electorate';

/** @type {MakeParamChangePositions} */
const makeParamChangePositions = changes => {
  const positive = { changes };
  const namesOnly = Object.keys(changes);
  const negative = { noChange: namesOnly };
  // @ts-ignore
  return harden({ positive, negative });
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

/** @type {AssertBallotConcernsParam} */
const assertBallotConcernsParam = (paramSpec, questionDetails) => {
  const { key, parameterName } = paramSpec;
  /** @type {ParamChangeIssue} */
  // @ts-ignore cast
  const issue = questionDetails.issue;
  assert(issue, 'must be a param change issue');

  assert(
    issue.changes[parameterName],
    X`Question (${issue.changes}) does not concern ${parameterName}`,
  );
  assert(
    issue.key === key,
    X`Question key (${issue.key}) doesn't match key (${key})`,
  );
};

/** @type {SetupGovernance} */
const setupParamGovernance = async (
  zoe,
  paramManagerRetriever,
  contractInstance,
  timer,
  getUpdatedPoserFacet,
) => {
  /** @type {WeakSet<Instance>} */
  const voteCounters = new WeakSet();

  /** @type {VoteOnParamChanges} */
  const voteOnParamChanges = async (
    voteCounterInstallation,
    deadline,
    paramChanges,
  ) => {
    const paramMgr = await E(paramManagerRetriever).get(paramChanges);
    const changePs = {};
    for (const name of Object.keys(paramChanges.changes)) {
      const proposedValue = E(paramMgr).getVisibleValue(
        name,
        paramChanges.changes[name],
      );
      changePs[name] = proposedValue;
    }
    const changes = await deeplyFulfilled(harden(changePs));

    const { positive, negative } = makeParamChangePositions(changes);

    const issue = harden({
      key: paramChanges.key,
      changes,
      contract: contractInstance,
    });

    const questionSpec = coerceQuestionSpec({
      method: ChoiceMethod.UNRANKED,
      issue,
      positions: [positive, negative],
      electionType: ElectionType.PARAM_CHANGE,
      maxChoices: 1,
      closingRule: { timer, deadline },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: negative,
    });

    const { publicFacet: counterPublicFacet, instance: voteCounter } = await E(
      getUpdatedPoserFacet(),
    ).addQuestion(voteCounterInstallation, questionSpec);

    voteCounters.add(voteCounter);

    // CRUCIAL: Here we wait for the voteCounter to declare an outcome, and then
    // attempt to update the value of the parameter if that's what the vote
    // decided. We need to make sure that outcomeOfUpdateP is updated whatever
    // happens.
    // * If the vote was negative, resolve to the outcome
    // * If we update the value, say so
    // * If the update fails, reject the promise
    // * if the vote outcome failed, reject the promise.
    const outcomeOfUpdate = E(counterPublicFacet)
      .getOutcome()
      .then(async outcome => {
        if (keyEQ(positive, outcome)) {
          return E.when(
            E(paramMgr).updateParams(paramChanges.changes),
            () => positive,
          );
        }
        return negative;
      });

    return {
      outcomeOfUpdate,
      instance: voteCounter,
      details: E(counterPublicFacet).getDetails(),
    };
  };

  return Far('paramGovernor', {
    voteOnParamChanges,
    createdQuestion: b => voteCounters.has(b),
  });
};

harden(setupParamGovernance);
harden(makeParamChangePositions);
harden(validateParamChangeQuestion);
harden(assertBallotConcernsParam);
export {
  setupParamGovernance,
  makeParamChangePositions,
  validateParamChangeQuestion,
  assertBallotConcernsParam,
  CONTRACT_ELECTORATE,
};
