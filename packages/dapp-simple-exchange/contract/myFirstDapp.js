import harden from '@agoric/harden';
import { makeHelpers, defaultAcceptanceMsg } from '@agoric/zoe/src/contracts/helpers/userFlow';

/**  EDIT THIS CONTRACT WITH YOUR OWN BUSINESS LOGIC */

/**
 * This contract is like the simpleExchange contract. The exchange only accepts
 * limit orders. A limit order is an order with payoutRules that specifies
 * wantAtLeast on one side and offerAtMost on the other:
 * [ { kind: 'wantAtLeast', units2 }, { kind: 'offerAtMost', units1 }]
 * [ { kind: 'wantAtLeast', units1 }, { kind: 'offerAtMost', units2 }]
 *
 * Note that the asset specified as wantAtLeast is treated as the exact amount
 * to be exchanged, while the amount specified as offerAtMost is a limit that
 * may be improved on. This simple exchange does not partially fill orders.
 */
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
    getActiveOffers,
  } = makeHelpers(zoe, issuers);

  function flattenRule(r) {
    switch (r.kind) {
      case 'offerAtMost':
        return { offer: r.amount };
      case 'wantAtLeast':
        return { want: r.amount };
      default:
        throw new Error(`${r.kind} not supported.`);
    }
  }

  function flattenOffer(o) {
    return harden([
      flattenRule(o.payoutRules[0]),
      flattenRule(o.payoutRules[1]),
    ]);
  }

  function flattenOrders(offerHandles) {
    const result = zoe
      .getOffers(zoe.getOfferStatuses(offerHandles).active)
      .map(offer => flattenOffer(offer));
    return result;
  }

  function getBookOrders() {
    return {
      buys: flattenOrders(buyInviteHandles),
      sells: flattenOrders(sellInviteHandles),
    };
  }

  function getOffer(inviteHandle) {
    if (
      sellInviteHandles.includes(inviteHandle) ||
      buyInviteHandles.includes(inviteHandle)
    ) {
      return flattenOffer(getActiveOffers([inviteHandle])[0]);
    }
    return 'not an active offer';
  }

  function swapOrAddToBook(inviteHandles, inviteHandle) {
    for (const iHandle of inviteHandles) {
      if (
        areAssetsEqualAtIndex(ASSET_INDEX, inviteHandle, iHandle) &&
        canTradeWith(inviteHandle, iHandle)
      ) {
        return swap(inviteHandle, iHandle);
      }
    }
    return defaultAcceptanceMsg;
  }

  const makeInvite = () => {
    const seat = harden({
      // This code might be modified to support immediate_or_cancel. Current
      // implementation is effectively fill_or_kill.
      makeOffer: () => {
        // Is it a valid sell offer?
        if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)) {
          // Save the valid offer and try to match

          // IDEA: to implement matching against the best price, the orders
          // should be sorted. (We'd also want to allow partial matches.)
          sellInviteHandles.push(inviteHandle);
          buyInviteHandles = [...zoe.getOfferStatuses(buyInviteHandles).active];
          return swapOrAddToBook(buyInviteHandles, inviteHandle);
        }
        // Is it a valid buy offer?
        if (hasValidPayoutRules(['wantAtLeast', 'offerAtMost'], inviteHandle)) {
          // Save the valid offer and try to match
          buyInviteHandles.push(inviteHandle);
          sellInviteHandles = [
            ...zoe.getOfferStatuses(sellInviteHandles).active,
          ];
          return swapOrAddToBook(sellInviteHandles, inviteHandle);
        }
        // Eject because the offer must be invalid
        throw rejectOffer(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return { invite, inviteHandle };
  };

  return harden({
    invite: makeInvite(),
    publicAPI: { makeInvite, getBookOrders, getOffer },
    terms,
  });
});
