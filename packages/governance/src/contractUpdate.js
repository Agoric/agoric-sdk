// @ts-check

import { passStyleOf, sameStructure } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { ChoiceMethod, ElectionType, QuorumRule } from './question.js';

const { details: X } = assert;

const looksLikeUpdateSpec = spec => {
  // TODO(hibbert): validate
  return spec;
};

/** @type {MakeVoteOnContractUpdate} */
const makeVoteOnContractUpdate = (
  publication,
  timer,
  poserFacet,
  addCounter,
) => {
  const voteOnContractUpdate = async (
    update,
    voteCounterInstallation,
    deadline,
  ) => {
    assert(
      passStyleOf(update) === 'copyRecord',
      X`Contract update must be a copyRecord, not ${update}`,
    );

    const negative = { reject: update };
    const updateSpec = looksLikeUpdateSpec({
      method: ChoiceMethod.UNRANKED,
      issue: update,
      positions: [update, negative],
      electionType: ElectionType.UPDATE,
      maxChoices: 1,
      closingRule: { timer, deadline },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: negative,
    });

    const { publicFacet: counterPublicFacet, instance: voteCounter } = await E(
      poserFacet,
    ).addQuestion(voteCounterInstallation, updateSpec);
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
        if (sameStructure(outcome, update)) {
          E(publication).updateState(outcome);
        } else {
          E(publication).updateState(negative);
        }
      })
      .catch(e => {
        E(publication).updateState({ reject: update, reason: e });
      });

    return {
      instance: voteCounter,
      publicFacet: counterPublicFacet,
      details: E(counterPublicFacet).getDetails(),
    };
  };

  return voteOnContractUpdate;
};

const makeUpdateObserver = (checkUpdate, task) => {
  const updateState = update => {
    if (checkUpdate(update)) {
      task(update);
    }
  };

  return harden({ updateState });
};

harden(makeVoteOnContractUpdate);
harden(makeUpdateObserver);
export { makeVoteOnContractUpdate, makeUpdateObserver };
