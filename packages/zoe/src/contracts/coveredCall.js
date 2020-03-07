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

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, rejectIfNotOfferRules } = makeZoeHelpers(zoe);
  assertRoleNames(harden(['UnderlyingAsset', 'StrikePrice']));

  const makeCallOptionInvite = sellerHandle => {
    const seat = harden({
      exercise: () => {
        const expected = harden({
          offer: ['StrikePrice'],
          want: ['UnderlyingAsset'],
        });
        rejectIfNotOfferRules(inviteHandle, expected);
        const rejectMsg = `The covered call option is expired.`;
        return swap(sellerHandle, inviteHandle, rejectMsg);
      },
    });

    const {
      userOfferRules: { want, offer, exit },
    } = zoe.getOffer(sellerHandle);

    const { invite: callOption, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'exerciseOption',
      expirationDate: exit.afterDeadline.deadline,
      timerAuthority: exit.afterDeadline.timer,
      underlyingAsset: offer.UnderlyingAsset,
      strikePrice: want.StrikePrice,
    });
    return callOption;
  };

  const makeCoveredCallInvite = () => {
    const seat = harden({
      makeCallOption: () => {
        const expected = harden({
          offer: ['UnderlyingAsset'],
          want: ['StrikePrice'],
          exit: ['afterDeadline'],
        });
        rejectIfNotOfferRules(inviteHandle, expected);
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
