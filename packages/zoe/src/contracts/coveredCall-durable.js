// @ts-check

import { fit, M } from '@agoric/store';
import '../../exported.js';

import { vivifyKind, vivifySingleton } from '@agoric/vat-data';
import { swapExact } from '../contractSupport/index.js';
import { isAfterDeadlineExitRule } from '../typeGuards.js';

const { details: X } = assert;

const sellSeatExpiredMsg = 'The covered call option is expired.';

/**
 * @see comment on functionality in ./coveredCall.js.
 *
 * This variant has been made durable and upgradeable. The exerciser survives
 * upgrade so the exerciseOption invitation will continue to work after upgrade.
 *
 * The version in
 * zoe/test/swingsetTests/upgradeCoveredCall/coveredCall-durable-V3.js
 * has some minor changes so tests can verify that upgrading from this to that
 * preserves usefulness of the invitation.
 *
 * @param {ZCF} zcf
 * @param {unknown} _privateArgs
 * @param {import('@agoric/vat-data').Baggage} instanceBaggage
 */
const start = async (zcf, _privateArgs, instanceBaggage) => {
  // TODO the exerciseOption offer handler that this makes is an object rather
  // than a function for now only because we do not yet support durable
  // functions.
  const makeExerciser = vivifyKind(
    instanceBaggage,
    'makeExerciserKindHandle',
    sellSeat => ({ sellSeat }),
    {
      handle: ({ state: { sellSeat } }, buySeat) => {
        assert(!sellSeat.hasExited(), sellSeatExpiredMsg);
        try {
          swapExact(zcf, sellSeat, buySeat);
        } catch (err) {
          console.log(
            'Swap failed. Please make sure your offer has the same underlyingAssets and strikePrice as specified in the invitation details. The keywords should not matter.',
            err,
          );
          throw err;
        }
        zcf.shutdown('Swap completed.');
        return 'The option was exercised. Please collect the assets in your payout.';
      },
    },
  );

  /** @type {OfferHandler} */
  const makeOption = sellSeat => {
    fit(sellSeat.getProposal(), M.split({ exit: { afterDeadline: M.any() } }));
    const sellSeatExitRule = sellSeat.getProposal().exit;
    assert(
      isAfterDeadlineExitRule(sellSeatExitRule),
      X`the seller must have an afterDeadline exitRule, but instead had ${sellSeatExitRule}`,
    );

    const exerciseOption = makeExerciser(sellSeat);
    const customProps = harden({
      expirationDate: sellSeatExitRule.afterDeadline.deadline,
      timeAuthority: sellSeatExitRule.afterDeadline.timer,
      underlyingAssets: sellSeat.getProposal().give,
      strikePrice: sellSeat.getProposal().want,
    });
    // @ts-expect-error durable handlers need typing
    return zcf.makeInvitation(exerciseOption, 'exerciseOption', customProps);
  };

  const creatorFacet = vivifySingleton(instanceBaggage, 'creatorFacet', {
    makeInvitation: () => zcf.makeInvitation(makeOption, 'makeCallOption'),
  });
  return harden({ creatorFacet });
};

harden(start);
export { start };
