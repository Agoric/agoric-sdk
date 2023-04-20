import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { mustMatch, keyEQ } from '@agoric/store';
import { M } from '@agoric/vat-data';

import {
  ChoiceMethod,
  QuorumRule,
  ElectionType,
  coerceQuestionSpec,
} from '../question.js';

/**
 * Make a pair of positions for a question about whether to upgrade the contract.
 * If the vote passes, the the specfied bundleId will be passed to `upgradeContract`.
 *
 * @param {string} bundleId
 */
const makeContractUpgradePositions = bundleId => {
  /** @type {Position} */
  const positive = harden({ bundleId });
  /** @type {Position} */
  const negative = harden({ dontUpgrade: bundleId });
  return { positive, negative };
};

/**
 * Setup to allow governance to block some invitations.
 *
 * @param {ERef<import('@agoric/time/src/types').TimerService>} timer
 * @param {() => Promise<PoserFacet>} getPoser
 * @param {AdminFacet} adminFacet
 */
const setupUpgradeGovernance = (timer, getPoser, adminFacet) => {
  /** @type {WeakSet<Instance>} */
  const voteCounters = new WeakSet();

  /**
   *
   * @param {ERef<Installation>} voteCounterInstallation
   * @param {import('@agoric/time').Timestamp} deadline
   * @param {string} bundleId
   */
  const voteOnUpgrade = async (voteCounterInstallation, deadline, bundleId) => {
    mustMatch(bundleId, M.string());
    const { positive, negative } = makeContractUpgradePositions(bundleId);

    const questionSpec = coerceQuestionSpec({
      method: ChoiceMethod.UNRANKED,
      issue: harden({ bundleId }),
      positions: [positive, negative],
      electionType: ElectionType.OFFER_FILTER,
      maxChoices: 1,
      maxWinners: 1,
      closingRule: { timer, deadline },
      quorumRule: QuorumRule.MAJORITY,
      tieOutcome: negative,
    });

    const { publicFacet: counterPublicFacet, instance: voteCounter } = await E(
      getPoser(),
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
        /** @type {(outcome: Position) => ERef<Position>} */
        outcome => {
          if (keyEQ(outcome, positive)) {
            return E(adminFacet)
              .upgradeContract(bundleId)
              .then(() => {
                return positive;
              });
          } else if (keyEQ(outcome, negative)) {
            return negative;
          } else {
            assert.fail('unrecognized outcome');
          }
        },
      );

    return harden({
      outcomeOfUpdate,
      instance: voteCounter,
      details: E(counterPublicFacet).getDetails(),
    });
  };

  return Far('upgradeGovernor', {
    voteOnUpgrade,
    createdQuestion: b => voteCounters.has(b),
  });
};

harden(setupUpgradeGovernance);
harden(makeContractUpgradePositions);
export {
  setupUpgradeGovernance,
  makeContractUpgradePositions as makeOfferUpgradePositions,
};
