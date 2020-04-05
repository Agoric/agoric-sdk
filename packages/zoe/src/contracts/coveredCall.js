/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

// In a covered call, the owner of a digital asset sells a call
// option. A call option is the right to buy the digital asset at a
// certain price, called the strike price. The call option has an expiry
// date, at which point the contract is cancelled.

// In this contract, the expiry date is represented by the deadline at
// which the offer escrowing the underlying assets is cancelled.
// Therefore, the proposal for the underlying assets must have an
// exit record with the key "afterDeadline".

// The invite that the creator of the covered call receives is the
// call option and has the following additional information in the
// extent of the invite:
// { expirationDate, timerAuthority, underlyingAsset, strikePrice }

import { makeZoeHelpers } from './helpers/zoeHelpers';

const rejectMsg = `The covered call option is expired.`;

export const makeContract = harden(zoe => {
  const { swap, makeInvite } = makeZoeHelpers(zoe);

  const makeCallOptionInvite = sellerHandle => {
    const {
      proposal: { want, give, exit },
    } = zoe.getOffer(sellerHandle);
    return makeInvite(
      inviteHandle => swap(sellerHandle, inviteHandle, rejectMsg),
      {
        seatDesc: 'exerciseOption',
        expirationDate: exit.afterDeadline.deadline,
        timerAuthority: exit.afterDeadline.timer,
        underlyingAsset: give.UnderlyingAsset,
        strikePrice: want.StrikePrice,
      },
      {
        give: ['StrikePrice'],
        want: ['UnderlyingAsset'],
      },
    );
  };

  const makeCoveredCallInvite = () =>
    makeInvite(
      makeCallOptionInvite,
      {
        seatDesc: 'makeCallOption',
      },
      {
        give: ['UnderlyingAsset'],
        want: ['StrikePrice'],
        exit: ['afterDeadline'],
      },
    );

  return harden({
    invite: makeCoveredCallInvite(),
  });
});
