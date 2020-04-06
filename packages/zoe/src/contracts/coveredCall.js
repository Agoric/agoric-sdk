/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

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

export const makeContract = harden(zoe => {
  const { swap, assertKeywords, rejectIfNotProposal } = makeZoeHelpers(zoe);
  assertKeywords(harden(['UnderlyingAsset', 'StrikePrice']));

  const makeCallOptionInvite = sellerHandle => {
    const seat = harden({
      exercise: () => {
        const expected = harden({
          give: ['StrikePrice'],
          want: ['UnderlyingAsset'],
        });
        rejectIfNotProposal(inviteHandle, expected);
        const rejectMsg = `The covered call option is expired.`;
        return swap(sellerHandle, inviteHandle, rejectMsg);
      },
    });

    const {
      proposal: { want, give, exit },
    } = zoe.getOffer(sellerHandle);

    const { invite: callOption, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'exerciseOption',
      expirationDate: exit.afterDeadline.deadline,
      timerAuthority: exit.afterDeadline.timer,
      underlyingAsset: give.UnderlyingAsset,
      strikePrice: want.StrikePrice,
    });
    return callOption;
  };

  const makeCoveredCallInvite = () => {
    const seat = harden({
      makeCallOption: () => {
        const expected = harden({
          give: ['UnderlyingAsset'],
          want: ['StrikePrice'],
          exit: ['afterDeadline'],
        });
        rejectIfNotProposal(inviteHandle, expected);
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
