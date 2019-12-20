/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { defaultAcceptanceMsg, makeHelpers } from './helpers/userFlow';
import { makeExchangeHelpers } from './helpers/exchanges';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order with payoutRules: [ { kind: 'offerAtMost',
// units1 }, {kind: 'wantAtLeast', units2 }] or a buy order:
// [ { kind: 'wantAtLeast', units1 }, { kind: 'offerAtMost',
// units2 }]. Note that the asset in the first slot of the
// payoutRules will always be bought or sold in exact amounts, whereas
// the amount of the second asset received in a sell order may be
// greater than expected, and the amount of the second asset paid in a
// buy order may be less than expected. This simple exchange does not
// support partial fills of orders.

export const makeContract = harden((zoe, terms) => {
  const sellInviteHandles = [];
  const buyInviteHandles = [];
  const { assays } = terms;
  const { rejectOffer, hasValidPayoutRules } = makeHelpers(zoe, assays);
  const {
    isMatchingLimitOrder,
    reallocateSurplusToSeller: reallocate,
  } = makeExchangeHelpers(zoe, assays);

  const makeInvite = () => {
    const seat = harden({
      addOrder: () => {
        // Is it a valid sell offer?
        if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)) {
          // Save the valid offer and try to match
          sellInviteHandles.push(inviteHandle);
          const { active } = zoe.getOfferStatuses(buyInviteHandles);
          for (let i = 0; i < active.length; i += 1) {
            if (isMatchingLimitOrder(inviteHandle, active[i])) {
              return reallocate(inviteHandle, active[i]);
            }
          }
          return defaultAcceptanceMsg;
        }
        // Is it a valid buy offer?
        if (hasValidPayoutRules(['wantAtLeast', 'offerAtMost'], inviteHandle)) {
          // Save the valid offer and try to match
          buyInviteHandles.push(inviteHandle);
          const { active } = zoe.getOfferStatuses(sellInviteHandles);
          for (let i = 0; i < active.length; i += 1) {
            if (isMatchingLimitOrder(active[i], inviteHandle)) {
              reallocate(active[i], inviteHandle);
            }
          }
          return defaultAcceptanceMsg;
        }
        // Eject because the offer must be invalid
        throw rejectOffer(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return invite;
  };
  return harden({
    invite: makeInvite(),
    publicAPI: { makeInvite },
    terms,
  });
});
