// @ts-check

import harden from '@agoric/harden';
import { produceNotifier } from '@agoric/notifier';
import { makeZoeHelpers, defaultAcceptanceMsg } from '../contractSupport';

/**
 * SimpleExchange is an exchange with a simple matching algorithm, which allows
 * an unlimited number of parties to create new orders or accept existing
 * orders. The notifier allows callers to find the current list of orders.
 *
 * The SimpleExchange uses Asset and Price as its keywords. The contract treats
 * the two keywords symmetrically. New offers can be created and existing offers
 * can be accepted in either direction.
 *
 * { give: { 'Asset', simoleans(5) }, want: { 'Price', quatloos(3) } }
 * { give: { 'Price', quatloos(8) }, want: { 'Asset', simoleans(3) } }
 *
 * The Asset is treated as an exact amount to be exchanged, while the
 * Price is a limit that may be improved on. This simple exchange does
 * not partially fill orders.
 *
 * The invitation returned on installation of the contract is the same as what
 * is returned by calling `publicAPI.makeInvite().
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  let sellOfferHandles = [];
  let buyOfferHandles = [];
  const { notifier, updater } = produceNotifier();

  const {
    rejectOffer,
    checkIfProposal,
    swap,
    canTradeWith,
    getActiveOffers,
    assertKeywords,
  } = makeZoeHelpers(zcf);

  assertKeywords(harden(['Asset', 'Price']));

  function flattenOffer(o) {
    return {
      want: o.proposal.want,
      give: o.proposal.give,
    };
  }

  function flattenOrders(offerHandles) {
    const result = zcf
      .getOffers(zcf.getOfferStatuses(offerHandles).active)
      .map(offerRecord => flattenOffer(offerRecord));
    return result;
  }

  function getBookOrders() {
    return {
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

  // Tell the notifier that there has been a change to the book orders
  function bookOrdersChanged() {
    updater.updateState(getBookOrders());
  }

  // If there's an existing offer that this offer is a match for, make the trade
  // and return the handle for the matched offer. If not, return undefined, so
  // the caller can know to add the new offer to the book.
  function swapIfCanTrade(offerHandles, offerHandle) {
    for (const iHandle of offerHandles) {
      if (canTradeWith(offerHandle, iHandle)) {
        swap(offerHandle, iHandle);
        // return handle to remove
        return iHandle;
      }
    }
    return undefined;
  }

  // try to swap offerHandle with one of the counterOffers. If it works, remove
  // the matching offer and return the remaining counterOffers. If there's no
  // matching offer, add the offerHandle to the coOffers, and return the
  // unmodified counterOfffers
  function swapIfCanTradeAndUpdateBook(counterOffers, coOffers, offerHandle) {
    const handle = swapIfCanTrade(counterOffers, offerHandle);
    if (handle) {
      // remove the matched offer.
      counterOffers = counterOffers.filter(value => value !== handle);
    } else {
      // Save the order in the book
      coOffers.push(offerHandle);
    }

    return counterOffers;
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
      buyOfferHandles = swapIfCanTradeAndUpdateBook(
        buyOfferHandles,
        sellOfferHandles,
        offerHandle,
      );
      /* eslint-disable no-else-return */
    } else if (checkIfProposal(offerHandle, buyAssetForPrice)) {
      sellOfferHandles = swapIfCanTradeAndUpdateBook(
        sellOfferHandles,
        buyOfferHandles,
        offerHandle,
      );
    } else {
      // Eject because the offer must be invalid
      return rejectOffer(offerHandle);
    }
    bookOrdersChanged();
    return defaultAcceptanceMsg;
  };

  const makeExchangeInvite = () =>
    zcf.makeInvitation(exchangeOfferHook, 'exchange');

  zcf.initPublicAPI(
    harden({
      makeInvite: makeExchangeInvite,
      getOffer,
      getNotifier: () => notifier,
    }),
  );

  return makeExchangeInvite();
};

harden(makeContract);
export { makeContract };
