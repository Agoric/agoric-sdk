import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, makeInvite } = makeZoeHelpers(zoe);
  assertRoleNames(harden(['Asset', 'Price']));

  const makeMatchingInvite = (
    firstInviteHandle,
    { offerRules: { want, offer } },
  ) =>
    makeInvite(inviteHandle => swap(firstInviteHandle, inviteHandle), {
      asset: offer.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    });

  const makeFirstOfferInvite = () =>
    makeInvite(
      makeMatchingInvite,
      {
        seatDesc: 'firstOffer',
      },
      { offer: ['Asset'], want: ['Price'] },
    );

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
