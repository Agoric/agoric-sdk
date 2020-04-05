import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, makeInvite } = makeZoeHelpers(zoe);

  const makeMatchingInvite = firstInviteHandle => {
    const {
      proposal: { want, give },
    } = zoe.getOffer(firstInviteHandle);
    return makeInvite(inviteHandle => swap(firstInviteHandle, inviteHandle), {
      asset: give.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    });
  };

  const makeFirstOfferInvite = () =>
    makeInvite(
      makeMatchingInvite,
      { seatDesc: 'firstOffer' },
      { give: ['Asset'], want: ['Price'] },
    );

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
