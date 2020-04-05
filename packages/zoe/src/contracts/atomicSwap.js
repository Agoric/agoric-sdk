/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeZoeHelpers } from './helpers/zoeHelpers';

export const makeContract = harden(zoe => {
  const { swap, assertKeywords, rejectIfNotProposal } = makeZoeHelpers(zoe);
  assertKeywords(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstInviteHandle => {
    const {
      proposal: { want, give },
    } = zoe.getOffer(firstInviteHandle);
    return zoe.makeInvite(
      inviteHandle => swap(firstInviteHandle, inviteHandle),
      {
        asset: give.Asset,
        price: want.Price,
        seatDesc: 'matchOffer',
      },
    );
  };

  const makeFirstOfferInvite = () => {
    return zoe.makeInvite(
      inviteHandle => {
        const expected = harden({ give: ['Asset'], want: ['Price'] });
        rejectIfNotProposal(inviteHandle, expected);
        return makeMatchingInvite(inviteHandle);
      },
      {
        seatDesc: 'firstOffer',
      },
    );
  };

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
