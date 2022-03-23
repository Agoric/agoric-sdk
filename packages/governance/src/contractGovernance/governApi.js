// @ts-check

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { keyEQ } from '@agoric/store';

import {
  ChoiceMethod,
  QuorumRule,
  ElectionType,
  looksLikeQuestionSpec,
} from '../question.js';

const { details: X } = assert;

/**
 * Make a pair of positions for a question about whether to invoke an API. If
 * the vote passes, the method will be called on the governedApis facet with the
 * parameters that were provided.
 *
 * @param {string} apiMethod
 * @param {[unknown]} methodParams
 */
const makeApiInvocationPositions = (apiMethod, methodParams) => {
  const positive = harden({ apiMethod, methodParams });
  const negative = harden({ dontInvoke: apiMethod });
  return { positive, negative };
};

/**
 * manage contracts that allow governance to invoke functions.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {Instance} governedInstance
 * @param {any} governedApis
 * @param {string[]} governedNames
 * @param {ERef<TimerService>} timer
 * @param {() => Promise<PoserFacet>} getUpdatedPoserFacet
 * @returns {Promise<ApiGovernor>}
 */
const setupApiGovernance = async (
  zoe,
  governedInstance,
  governedApis,
  governedNames,
  timer,
  getUpdatedPoserFacet,
) => {
  /** @type {WeakSet<Instance>} */
  const voteCounters = new WeakSet();

  /** @type {VoteOnApiInvocation} */
  const voteOnApiInvocation = async (
    apiMethod,
    methodParams,
    voteCounterInstallation,
    deadline,
  ) => {
    const outcomeOfUpdateP = makePromiseKit();

    assert(
      governedNames.includes(apiMethod),
      X`${apiMethod} is not a governed API.`,
    );

    const { positive, negative } = makeApiInvocationPositions(
      apiMethod,
      methodParams,
    );
    const issue = harden({ apiMethod, methodParams });
    const questionSpec = looksLikeQuestionSpec({
      method: ChoiceMethod.UNRANKED,
      issue,
      positions: [positive, negative],
      electionType: ElectionType.API_INVOCATION,
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
    // attempt to invoke the API if that's what the vote called for. We need to
    // make sure that outcomeOfUpdateP is updated whatever happens.
    //
    // * If the vote was negative, resolve to the outcome
    // * If the API invocation succeeds, say so
    // * If the update fails, reject the promise
    // * if the vote outcome failed, reject the promise.
    E(counterPublicFacet)
      .getOutcome()
      .then(outcome => {
        if (keyEQ(positive, outcome)) {
          E(governedApis)
            [apiMethod](...methodParams)
            .then(returnValue => outcomeOfUpdateP.resolve(returnValue))
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
    voteOnApiInvocation,
    createdQuestion: b => voteCounters.has(b),
  });
};

harden(setupApiGovernance);
harden(makeApiInvocationPositions);
export { setupApiGovernance, makeApiInvocationPositions };
