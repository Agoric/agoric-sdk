import harden from '@agoric/harden';
// Eventually will be importable from '@agoric/zoe-contract-support'
import { producePromise } from '@agoric/produce-promise';
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
// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  let sellOfferHandles = [];
  let buyOfferHandles = [];
  let nextChangePromise = producePromise();

  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
    inviteAnOffer,
  } = makeZoeHelpers(zcf);

  assertKeywords(harden(['Asset', 'Price']));

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
    const result = zcf
      .getOffers(zcf.getOfferStatuses(offerHandles).active)
      .map(offerRecord => flattenOffer(offerRecord));
    return result;
  }

  function getBookOrders() {
    return {
      changed: nextChangePromise.promise,
      buys: flattenOrders(buyOfferHandles),
      sells: flattenOrders(sellOfferHandles),
    };
  }

  function getOffer(offerHandle) {
    for (const handle of [...sellOfferHandles, ...buyOfferHandles]) {
      if (offerHandle === handle) {
        return flattenOffer(getActiveOffers([offerHandle])[0]);
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
    nextChangePromise = producePromise();
  }

  function swapIfCanTrade(offerHandles, offerHandle) {
    for (const iHandle of offerHandles) {
      if (canTradeWith(offerHandle, iHandle)) {
        bookOrdersChanged();
        return swap(offerHandle, iHandle);
      }
    }
    bookOrdersChanged();
    return defaultAcceptanceMsg;
  }

  const exchangeOfferHook = offerHandle => {
    const buyAssetForPrice = harden({
      give: { Price: null },
      want: { Asset: null },
    });
    const sellAssetForPrice = harden({
      give: { Asset: null },
      want: { Price: null },
    });
    if (checkIfProposal(offerHandle, sellAssetForPrice)) {
      // Save the valid offer and try to match
      sellOfferHandles.push(offerHandle);
      buyOfferHandles = [...zcf.getOfferStatuses(buyOfferHandles).active];
      return swapIfCanTrade(buyOfferHandles, offerHandle);
      /* eslint-disable no-else-return */
    } else if (checkIfProposal(offerHandle, buyAssetForPrice)) {
      // Save the valid offer and try to match
      buyOfferHandles.push(offerHandle);
      sellOfferHandles = [...zcf.getOfferStatuses(sellOfferHandles).active];
      return swapIfCanTrade(sellOfferHandles, offerHandle);
    } else {
      // Eject because the offer must be invalid
      return rejectOffer(offerHandle);
    }
  };

  const makeExchangeInvite = () =>
    inviteAnOffer({
      offerHook: exchangeOfferHook,
      customProperties: {
        inviteDesc: 'exchange',
      },
    });

  return harden({
    invite: makeExchangeInvite(),
    publicAPI: { makeInvite: makeExchangeInvite, getBookOrders, getOffer },
  });
});
