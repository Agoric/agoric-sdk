/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import makePromise from '@agoric/make-promise';
import { makeHelpers, defaultAcceptanceMsg } from './helpers/userFlow';

/**
 * The SimpleExchange only accepts limit orders. A limit order is an order with
 * payoutRules that specifies wantAtLeast on one side and offerAtMost on the
 * other:
 * [ { kind: 'wantAtLeast', amount2 }, { kind: 'offerAtMost', amount1 }]
 * [ { kind: 'wantAtLeast', amount1 }, { kind: 'offerAtMost', amount2 }]
 *
 * Note that the asset specified as wantAtLeast is treated as the exact amount
 * to be exchanged, while the amount specified as offerAtMost is a limit that
 * may be improved on. This simple exchange does not partially fill orders.
 */
export const makeContract = harden((zoe, terms) => {
  const ASSET_INDEX = 0;
  let sellInviteHandles = [];
  let buyInviteHandles = [];
  let nextChangePromise = makePromise();

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
    const description = r.amount;
    let result;
    switch (r.kind) {
      case 'offerAtMost':
        result = { offer: description };
        break;
      case 'wantAtLeast':
        result = { want: description };
        break;
      default:
        throw new Error(`${r.kind} not supported.`);
    }
    return harden(result);
  }

  function flattenOffer(o) {
    return harden({
      ...flattenRule(o.payoutRules[0]),
      ...flattenRule(o.payoutRules[1]),
    });
  }

  function flattenOrders(offerHandles) {
    return zoe
      .getOffers(zoe.getOfferStatuses(offerHandles).active)
      .map(offer => flattenOffer(offer));
  }

  function getBookOrders() {
    return {
      changed: nextChangePromise.p,
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

  // This is a really simple update protocol, which merely provides a promise
  // in getBookOrders() that will resolve when the state changes. Clients
  // subscribe to the promise and are notified at some future point. A much
  // nicer protocol is in https://github.com/Agoric/agoric-sdk/issues/253
  function bookOrdersChanged() {
    nextChangePromise.res();
    nextChangePromise = makePromise();
  }

  function swapOrAddToBook(inviteHandles, inviteHandle) {
    for (const iHandle of inviteHandles) {
      if (
        areAssetsEqualAtIndex(ASSET_INDEX, inviteHandle, iHandle) &&
        canTradeWith(inviteHandle, iHandle)
      ) {
        bookOrdersChanged();
        return swap(inviteHandle, iHandle);
      }
    }
    bookOrdersChanged();
    return defaultAcceptanceMsg;
  }

  const makeInvite = () => {
    const seat = harden({
      addOrder: () => {
        // Is it a valid sell offer?
        if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast'], inviteHandle)) {
          // Save the valid offer and try to match
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
