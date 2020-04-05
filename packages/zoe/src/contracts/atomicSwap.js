/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertKeywords, rejectIfNotProposal } = makeZoeHelpers(zoe);
  assertKeywords(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstInviteHandle => {
    const seat = harden({
      matchOffer: () => swap(firstInviteHandle, inviteHandle),
    });
    const {
      proposal: { want, give },
    } = zoe.getOffer(firstInviteHandle);
    const { invite, inviteHandle } = zoe.makeInvitePair(seat, {
      asset: give.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    });
    return invite;
  };

  const makeFirstOfferInvite = () => {
    const seat = harden({
      makeFirstOffer: () => {
        const expected = harden({ give: ['Asset'], want: ['Price'] });
        rejectIfNotProposal(inviteHandle, expected);
        return makeMatchingInvite(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvitePair  (seat, {
      seatDesc: 'firstOffer',
    });
    return invite;
  };

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
