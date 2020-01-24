/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

// In a covered call, the owner of a digital asset sells a call
// option. A call option is the right to buy the digital asset at a
// certain price, called the strike price. The call option has an expiry
// date, at which point the contract is cancelled.

// In this contract, the expiry date is represented by the deadline at
// which the owner of the digital asset's offer is cancelled.
// Therefore, the owner of the digital asset's offer exitRules must be
// of the kind "afterDeadline".

// The invite that the creator of the covered call receives is the
// call option and has the following additional information in the
// extent of the invite:
// { expirationDate, timerAuthority, underlyingAsset, strikePrice }

import { makeHelpers } from './helpers/userFlow';

export const makeContract = harden((zoe, terms) => {
  const { rejectOffer, hasValidPayoutRules, swap } = makeHelpers(
    zoe,
    terms.assays,
  );
  const ASSET_INDEX = 0;
  const PRICE_INDEX = 1;

  const makeCallOptionInvite = sellerHandle => {
    const seat = harden({
      exercise: () =>
        swap(sellerHandle, inviteHandle, `The covered call option is expired.`),
    });
    const { payoutRules, exitRule } = zoe.getOffer(sellerHandle);
    const { invite: callOption, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'exerciseOption',
      expirationDate: exitRule.deadline,
      timerAuthority: exitRule.timer,
      underlyingAsset: payoutRules[ASSET_INDEX].units,
      strikePrice: payoutRules[PRICE_INDEX].units,
    });
    return callOption;
  };

  const makeCoveredCallInvite = () => {
    const seat = harden({
      makeCallOption: () => {
        const { exitRule } = zoe.getOffer(inviteHandle);
        if (
          !hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle) ||
          exitRule.kind !== 'afterDeadline'
        ) {
          throw rejectOffer(inviteHandle);
        }
        return makeCallOptionInvite(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'makeCallOption',
    });
    return invite;
  };

  return harden({
    invite: makeCoveredCallInvite(),
  });
});
