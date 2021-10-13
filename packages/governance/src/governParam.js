// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { sameStructure } from '@agoric/same-structure';
import {
  ChoiceMethod,
  QuorumRule,
  ElectionType,
  looksLikeQuestionSpec,
} from './question.js';
import { assertType } from './paramManager.js';
import {
  assertBallotConcernsQuestion,
  validateParamChangeQuestion,
  makeParamChangePositions,
} from './validators.js';

/** @type {SetupGovernance} */
const setupParamGovernance = async (
  paramManagerRetriever,
  poserFacet,
  contractInstance,
  timer,
  addCounter,
) => {
  /** @type {VoteOnParamChange} */
  const voteOnParamChange = async (
    paramSpec,
    proposedValue,
    voteCounterInstallation,
    deadline,
  ) => {
    const paramMgr = E(paramManagerRetriever).get(paramSpec);
    const paramName = paramSpec.parameterName;
    const param = await E(paramMgr).getParam(paramName);
    assertType(param.type, proposedValue, paramName);
    const outcomeOfUpdateP = makePromiseKit();

    const { positive, negative } = makeParamChangePositions(
      paramSpec,
      proposedValue,
    );
    const issue = harden({
      paramSpec,
      contract: contractInstance,
      proposedValue,
    });
    const questionSpec = looksLikeQuestionSpec({
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
      poserFacet,
    ).addQuestion(voteCounterInstallation, questionSpec);
    addCounter(voteCounter);

    // CRUCIAL: Here we wait for the voteCounter to declare an outcome, and then
    // attempt to update the value of the parameter if that's what the vote
    // decided. We need to make sure that outcomeOfUpdateP is updated whatever
    // happens.
    // * If the vote was negative, resolve to the outcome
    // * If we update the value, say so
    // * If the update fails, reject the promise
    // * if the vote outcome failed, reject the promise.
    E(counterPublicFacet)
      .getOutcome()
      .then(outcome => {
        if (sameStructure(positive, outcome)) {
          E(paramMgr)
            [`update${paramName}`](proposedValue)
            .then(newValue => outcomeOfUpdateP.resolve(newValue))
            .catch(e => {
              outcomeOfUpdateP.reject(e);
            });
        } else {
          outcomeOfUpdateP.resolve(negative);
        }
      })
      .catch(e => {
        outcomeOfUpdateP.reject(e);
      });

    return {
      outcomeOfUpdate: outcomeOfUpdateP.promise,
      instance: voteCounter,
      details: E(counterPublicFacet).getDetails(),
    };
  };

  return Far('paramGovernor', {
    voteOnParamChange,
  });
};

harden(setupParamGovernance);
harden(makeParamChangePositions);
harden(validateParamChangeQuestion);
harden(assertBallotConcernsQuestion);
export {
  setupParamGovernance,
  makeParamChangePositions,
  validateParamChangeQuestion,
  assertBallotConcernsQuestion,
};
