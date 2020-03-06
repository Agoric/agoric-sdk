/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { makeHelpers } from './helpers/userFlow';

export const makeContract = harden((zoe, terms) => {
  const { issuers } = terms;
  const { rejectOffer, swap, hasValidPayoutRules } = makeHelpers(zoe, issuers);

  const makeMatchingInvite = firstInviteHandle => {
    const seat = harden({
      matchOffer: () => swap(firstInviteHandle, inviteHandle),
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      offerMadeRules: zoe.getOffer(firstInviteHandle).payoutRules,
      seatDesc: 'matchOffer',
    });
    return invite;
  };

  const makeFirstOfferInvite = () => {
    const seat = harden({
      makeFirstOffer: () => {
        if (
          !hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)
        ) {
          throw rejectOffer(inviteHandle);
        }
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
    terms,
  });
});
