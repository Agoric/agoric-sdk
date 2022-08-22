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

/**
 * Return a record containing the positive and negative positions for a
 * question on changing the param to the proposedValue.
 *
 * @param {Record<string, ParamValue>} changes
 * @returns {ParamChangePositions}
 */
const makeParamChangePositions = changes => {
  /** @type {ChangeParamsPosition} */
  const positive = { changes };
  const namesOnly = Object.keys(changes);
  const negative = { noChange: namesOnly };
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

/**
 * assert that the parameter described by paramSpec is proposed to be changed in
 * the question described by questionSpec.
 *
 * @param {{ parameterName: string, paramPath: unknown}} paramSpec
 * @param {QuestionSpec<ParamChangeIssue<unknown>>} questionSpec
 */
const assertBallotConcernsParam = (paramSpec, questionSpec) => {
  const { parameterName, paramPath } = paramSpec;
  const { issue } = questionSpec;

  // XXX doesn't fully test this requirement
  assert(issue, 'must be a param change issue');

  if (!issue.spec.changes[parameterName]) {
    assert.fail(
      X`Question (${issue.spec.changes}) does not concern ${parameterName}`,
    );
  }

  if (!keyEQ(issue.spec.paramPath, paramPath)) {
    assert.fail(
      X`Question path (${issue.spec.paramPath}) doesn't match request (${paramPath})`,
    );
  }
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
    paramSpec,
  ) => {
    const paramMgr = await E(paramManagerRetriever).get(paramSpec.paramPath);
    const changePs = {};
    for (const name of Object.keys(paramSpec.changes)) {
      const proposedValue = E(paramMgr).getVisibleValue(
        name,
        paramSpec.changes[name],
      );
      changePs[name] = proposedValue;
    }
    const changes = await deeplyFulfilled(harden(changePs));

    const { positive, negative } = makeParamChangePositions(changes);

    /** @type {ParamChangeIssue<unknown>} */
    const issue = harden({
      spec: {
        paramPath: paramSpec.paramPath,
        changes,
      },
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
            E(paramMgr).updateParams(paramSpec.changes),
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
