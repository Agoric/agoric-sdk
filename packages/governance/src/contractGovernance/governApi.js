import { Fail, q } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { keyEQ } from '@agoric/store';

import {
  ChoiceMethod,
  QuorumRule,
  ElectionType,
  coerceQuestionSpec,
} from '../question.js';

/**
 * @import {Passable, RemotableObject} from '@endo/pass-style';
 * @import {Position, ApiGovernor, ApiInvocationIssue, PoserFacet, VoteOnApiInvocation, GovernedApis} from '../types.js';
 */

/**
 * Make a pair of positions for a question about whether to invoke an API. If
 * the vote passes, the method will be called on the governedApis facet with the
 * arguments that were provided.
 *
 * @param {string} apiMethodName
 * @param {Passable[]} methodArgs
 */
const makeApiInvocationPositions = (apiMethodName, methodArgs) => {
  const positive = harden({ apiMethodName, methodArgs });
  const negative = harden({ dontInvoke: apiMethodName });
  return harden({ positive, negative });
};

/**
 * manage contracts that allow governance to invoke functions.
 *
 * @param {() => ERef<GovernedApis>} getGovernedApis
 * @param {() => Promise<Array<string | symbol>>} getGovernedNames names of the governed API methods
 * @param {ERef<import('@agoric/time').TimerService>} timer
 * @param {() => Promise<PoserFacet>} getUpdatedPoserFacet
 * @returns {ApiGovernor}
 */
const setupApiGovernance = (
  getGovernedApis,
  getGovernedNames,
  timer,
  getUpdatedPoserFacet,
) => {
  /** @type {WeakSet<Instance>} */
  const voteCounters = new WeakSet();

  /** @type {VoteOnApiInvocation} */
  const voteOnApiInvocation = async (
    apiMethodName,
    methodArgs,
    voteCounterInstallation,
    deadline,
  ) => {
    const governedNames = await getGovernedNames();
    governedNames.includes(apiMethodName) ||
      Fail`${apiMethodName} is not a governed API.`;

    const { positive, negative } = makeApiInvocationPositions(
      apiMethodName,
      methodArgs,
    );

    /** @type {ApiInvocationIssue} */
    const issue = harden({ apiMethodName, methodArgs });
    const questionSpec = coerceQuestionSpec({
      method: ChoiceMethod.UNRANKED,
      issue,
      positions: [positive, negative],
      electionType: ElectionType.API_INVOCATION,
      maxChoices: 1,
      maxWinners: 1,
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
    // * If the vote passed, invoke the API, and return the positive position
    // * If the vote was negative, return the negative position
    // * If we can't do either, (the vote failed or the API invocation failed)
    //   return a broken promise.
    const outcomeOfUpdate = E(counterPublicFacet)
      .getOutcome()
      .then(
        /** @type {(outcome: Position) => Promise<Position>} */
        async outcome => {
          await null;

          if (keyEQ(positive, outcome)) {
            keyEQ(outcome, harden({ apiMethodName, methodArgs })) ||
              Fail`The question's method name (${q(
                apiMethodName,
              )}) and args (${methodArgs}) didn't match the outcome ${outcome}`;

            // E(remote)[name](args) invokes the method named 'name' on remote.
            const governedApis = await getGovernedApis();
            return E(governedApis)
              [apiMethodName](...methodArgs)
              .then(() => {
                return positive;
              });
          } else {
            return negative;
          }
        },
      );

    return harden({
      outcomeOfUpdate,
      instance: voteCounter,
      details: E(counterPublicFacet).getDetails(),
    });
  };

  return Far('paramGovernor', {
    voteOnApiInvocation,
    createdQuestion: b => voteCounters.has(b),
  });
};

harden(setupApiGovernance);
harden(makeApiInvocationPositions);
export { setupApiGovernance, makeApiInvocationPositions };
