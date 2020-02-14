/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

import { defaultAcceptanceMsg, makeHelpers } from './helpers/userFlow';

// This exchange only accepts limit orders. A limit order is defined
// as either a sell order with payoutRules: [ { kind: 'offerAtMost',
// amount1 }, {kind: 'wantAtLeast', amount2 }] or a buy order:
// [ { kind: 'wantAtLeast', amount1 }, { kind: 'offerAtMost',
// amount2 }]. Note that the asset in the first slot of the
// payoutRules will always be bought or sold in exact amounts, whereas
// the amount of the second asset received in a sell order may be
// greater than expected, and the amount of the second asset paid in a
// buy order may be less than expected. This simple exchange does not
// support partial fills of orders.

export const makeContract = harden((zoe, terms) => {
  const ASSET_INDEX = 0;
  let sellInviteHandles = [];
  let buyInviteHandles = [];
  const { issuers } = terms;
  const {
    rejectOffer,
    hasValidPayoutRules,
    swap,
    areAssetsEqualAtIndex,
    canTradeWith,
  } = makeHelpers(zoe, issuers);

  const makeInvite = () => {
    const seat = harden({
      addOrder: () => {
        // Is it a valid sell offer?
        if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)) {
          // Save the valid offer and try to match
          sellInviteHandles.push(inviteHandle);
          buyInviteHandles = [...zoe.getOfferStatuses(buyInviteHandles).active];
          for (const buyHandle of buyInviteHandles) {
            if (
              areAssetsEqualAtIndex(ASSET_INDEX, inviteHandle, buyHandle) &&
              canTradeWith(inviteHandle, buyHandle)
            ) {
              return swap(inviteHandle, buyHandle);
            }
          }
          return defaultAcceptanceMsg;
        }
        // Is it a valid buy offer?
        if (hasValidPayoutRules(['wantAtLeast', 'offerAtMost'], inviteHandle)) {
          // Save the valid offer and try to match
          buyInviteHandles.push(inviteHandle);
          sellInviteHandles = [
            ...zoe.getOfferStatuses(sellInviteHandles).active,
          ];
          for (const sellHandle of sellInviteHandles) {
            if (
              areAssetsEqualAtIndex(ASSET_INDEX, inviteHandle, sellHandle) &&
              canTradeWith(inviteHandle, sellHandle)
            ) {
              return swap(inviteHandle, sellHandle);
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
