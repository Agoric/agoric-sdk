/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import { makePromise } from '@agoric/make-promise';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/**
 * The SimpleExchange uses Asset and Price as its keywords. In usage,
 * they're somewhat symmetrical. Participants will be buying or
 * selling in both directions.
 *
 * { give: { 'Asset', simoleans(5) }, want: { 'Price', quatloos(3) } }
 * { give: { 'Price', quatloos(8) }, want: { 'Asset', simoleans(3) } }
 *
 * The Asset is treated as an exact amount to be exchanged, while the
 * Price is a limit that may be improved on. This simple exchange does
 * not partially fill orders.
 */
export const makeContract = harden(zoe => {
  const PRICE = 'Price';
  const ASSET = 'Asset';

  let sellInviteHandles = [];
  let buyInviteHandles = [];
  let nextChangePromise = makePromise();

  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
  } = makeZoeHelpers(zoe);

  assertKeywords(harden([ASSET, PRICE]));

  function flattenRule(r) {
    const keyword = Object.getOwnPropertyNames(r)[0];
    const struct = {};
    struct[keyword] = r[keyword].extent;
    return harden(struct);
  }

  function flattenOffer(o) {
    return harden([flattenRule(o.proposal.want), flattenRule(o.proposal.give)]);
  }

  function flattenOrders(offerHandles) {
    const result = zoe
      .getOffers(zoe.getOfferStatuses(offerHandles).active)
      .map(offerRecord => flattenOffer(offerRecord));
    return result;
  }

  function getBookOrders() {
    return {
      changed: nextChangePromise.promise,
      buys: flattenOrders(buyInviteHandles),
      sells: flattenOrders(sellInviteHandles),
    };
  }

  function getOffer(inviteHandle) {
    for (const handle of [...sellInviteHandles, ...buyInviteHandles]) {
      if (inviteHandle === handle) {
        return flattenOffer(getActiveOffers([inviteHandle])[0]);
      }
    }
    return 'not an active offer';
  }

  // This is a really simple update protocol, which merely provides a promise
  // in getBookOrders() that will resolve when the state changes. Clients
  // subscribe to the promise and are notified at some future point. A much
  // nicer protocol is in https://github.com/Agoric/agoric-sdk/issues/253
  function bookOrdersChanged() {
    nextChangePromise.resolve();
    nextChangePromise = makePromise();
  }

  function swapIfCanTrade(inviteHandles, inviteHandle) {
    for (const iHandle of inviteHandles) {
      if (canTradeWith(inviteHandle, iHandle)) {
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
        const buyAssetForPrice = harden({
          give: { Price: null },
          want: { Asset: null },
        });
        const sellAssetForPrice = harden({
          give: { Asset: null },
          want: { Price: null },
        });
        if (checkIfProposal(inviteHandle, sellAssetForPrice)) {
          // Save the valid offer and try to match
          sellInviteHandles.push(inviteHandle);
          buyInviteHandles = [...zoe.getOfferStatuses(buyInviteHandles).active];
          return swapIfCanTrade(buyInviteHandles, inviteHandle);
          /* eslint-disable no-else-return */
        } else if (checkIfProposal(inviteHandle, buyAssetForPrice)) {
          // Save the valid offer and try to match
          buyInviteHandles.push(inviteHandle);
          sellInviteHandles = [
            ...zoe.getOfferStatuses(sellInviteHandles).active,
          ];
          return swapIfCanTrade(sellInviteHandles, inviteHandle);
        } else {
          // Eject because the offer must be invalid
          return rejectOffer(inviteHandle);
        }
      },
    });
    const { invite, inviteHandle } = zoe.makeInvite(seat);
    return { invite, inviteHandle };
  };

  return harden({
    invite: makeInvite(),
    publicAPI: { makeInvite, getBookOrders, getOffer },
  });
});
