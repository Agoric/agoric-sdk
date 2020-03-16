import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertRoleNames, makeInvitePair } = makeZoeHelpers(zoe);
  assertRoleNames(harden(['Asset', 'Price']));

  const makeMatchingInvite = (
    firstInviteHandle,
    { offerRules: { want, offer } },
  ) =>
    makeInvitePair(inviteHandle => swap(firstInviteHandle, inviteHandle), {
      asset: offer.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    }).invite;

  const makeFirstOfferInvite = () =>
    makeInvitePair(
      makeMatchingInvite,
      {
        seatDesc: 'firstOffer',
      },
      { offer: ['Asset'], want: ['Price'] },
    ).invite;

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
