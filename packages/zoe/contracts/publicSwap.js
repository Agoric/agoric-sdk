/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { defaultAcceptanceMsg, makeHelpers } from './helpers/userFlow';

export const makeContract = harden((zoe, terms) => {
  const { assays } = terms;
  const { rejectOffer, swap, hasValidPayoutRules } = makeHelpers(zoe, assays);
  let firstInviteHandle;

  const makeFirstOfferInvite = () => {
    const seat = harden({
      makeFirstOffer: () => {
        if (
          !hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)
        ) {
          throw rejectOffer(inviteHandle);
        }
        firstInviteHandle = inviteHandle;
        return defaultAcceptanceMsg;
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      seatDesc: 'firstOffer',
    });
    return invite;
  };

  const makeMatchingInvite = () => {
    const seat = harden({
      matchOffer: () => swap(firstInviteHandle, inviteHandle),
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat, {
      offerMadeRules: zoe.getOffer(firstInviteHandle).payoutRules,
      seatDesc: 'matchOffer',
    });
    return invite;
  };

  return harden({
    invite: makeFirstOfferInvite(),
    publicAPI: { makeMatchingInvite },
    terms,
  });
});
