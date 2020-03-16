/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, makeInvite } = makeZoeHelpers(zoe);
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
    return makeInvite(
      harden(inviteHandle => makeMatchingInvite(inviteHandle)),
      harden({ offer: ['Asset'], want: ['Price'] }),
      harden({
        seatDesc: 'firstOffer',
      }),
    );
  };

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
