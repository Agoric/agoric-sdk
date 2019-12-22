/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { defaultAcceptanceMsg, makeHelpers } from './helpers/userFlow';

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
  const {
    rejectOffer,
    hasValidPayoutRules,
    swap,
    areAssetsEqualAtIndex,
  } = makeHelpers(zoe, assays);

  const makeInvite = () => {
    const seat = harden({
      addOrder: () => {
        // Is it a valid sell offer?
        if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)) {
          // Save the valid offer and try to match
          sellInviteHandles.push(inviteHandle);
          for (const buyHandle of zoe.getOfferStatuses(buyInviteHandles)
            .active) {
            if (areAssetsEqualAtIndex(0, inviteHandle, buyHandle)) {
              swap(inviteHandle, buyHandle);
            }
          }
          return defaultAcceptanceMsg;
        }
        // Is it a valid buy offer?
        if (hasValidPayoutRules(['wantAtLeast', 'offerAtMost'], inviteHandle)) {
          // Save the valid offer and try to match
          buyInviteHandles.push(inviteHandle);
          for (const sellHandle of zoe.getOfferStatuses(sellInviteHandles)
            .active) {
            if (areAssetsEqualAtIndex(0, inviteHandle, sellHandle)) {
              swap(inviteHandle, sellHandle);
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
