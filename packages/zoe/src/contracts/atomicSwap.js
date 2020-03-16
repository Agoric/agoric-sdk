/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, makeInvite } = makeZoeHelpers(zoe);
  assertRoleNames(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstInviteHandle => {
    const {
      offerRules: { want, offer },
    } = zoe.getOffer(firstInviteHandle);
    return makeInvite(
      harden(inviteHandle => swap(firstInviteHandle, inviteHandle)),
      harden({ offer: ['Price'], want: ['Asset'] }),
      harden({
        asset: offer.Asset,
        price: want.Price,
        seatDesc: 'matchOffer',
      }),
    );
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
