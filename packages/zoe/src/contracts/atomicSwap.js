/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, rejectIfNotOfferRules } = makeZoeHelpers(zoe);
  assertRoleNames(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstInviteHandle => {
    const seat = harden({
      matchOffer: () => swap(firstInviteHandle, inviteHandle),
    });
    const {
      offerRules: { want, offer },
    } = zoe.getOffer(firstInviteHandle);
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      asset: offer.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    });
    return invite;
  };

  const makeFirstOfferInvite = () => {
    const seat = harden({
      makeFirstOffer: () => {
        const expected = harden({ offer: ['Asset'], want: ['Price'] });
        rejectIfNotOfferRules(inviteHandle, expected);
        return makeMatchingInvite(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'firstOffer',
    });
    return invite;
  };

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
