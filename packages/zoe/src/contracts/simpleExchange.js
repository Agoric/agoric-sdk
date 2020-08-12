// @ts-check

import { makeNotifierKit } from '@agoric/notifier';

import '../../exported';
import {
  swap,
  satisfies,
  checkIfProposal,
  assertIssuerKeywords,
} from '../contractSupport/zoeHelpers';

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
 * is returned by calling `await E(publicAPI).makeInvite().
 *
 * @type {ContractStartFn}
 */
const start = (zcf, _terms) => {
  let sellOfferSeats = [];
  let buyOfferSeats = [];
  // eslint-disable-next-line no-use-before-define
  const { notifier, updater } = makeNotifierKit(getBookOrders());

  assertIssuerKeywords(zcf, harden(['Asset', 'Price']));

  function dropOnExit(p) {
    return {
      want: p.want,
      give: p.give,
    };
  }

  function flattenOrders(seats) {
    const activeSeats = seats.filter(s => !s.hasExited());
    return activeSeats.map(offerRecord =>
      dropOnExit(offerRecord.getProposal()),
    );
  }

  function getBookOrders() {
    return {
      buys: flattenOrders(buyOfferSeats),
      sells: flattenOrders(sellOfferSeats),
    };
  }

  // Tell the notifier that there has been a change to the book orders
  function bookOrdersChanged() {
    updater.updateState(getBookOrders());
  }

  // If there's an existing offer that this offer is a match for, make the trade
  // and return the handle for the matched offer. If not, return undefined, so
  // the caller can know to add the new offer to the book.
  function swapIfCanTrade(offers, offerSeat) {
    for (const offer of offers) {
      const satisfiedBy = (xSeat, ySeat) =>
        satisfies(zcf, xSeat, ySeat.getCurrentAllocation());
      if (satisfiedBy(offer, offerSeat) && satisfiedBy(offerSeat, offer)) {
        swap(zcf, offerSeat, offer);
        // return handle to remove
        return offer;
      }
    }
    return undefined;
  }

  // try to swap offerHandle with one of the counterOffers. If it works, remove
  // the matching offer and return the remaining counterOffers. If there's no
  // matching offer, add the offerHandle to the coOffers, and return the
  // unmodified counterOfffers
  function swapIfCanTradeAndUpdateBook(counterOffers, coOffers, offerSeat) {
    const offer = swapIfCanTrade(counterOffers, offerSeat);
    if (offer) {
      // remove the matched offer.
      counterOffers = counterOffers.filter(value => value !== offer);
    } else {
      // Save the order in the book
      coOffers.push(offerSeat);
    }

    return counterOffers;
  }

  /** @type {OfferHandler} */
  const exchangeOfferHandler = offerSeat => {
    const buyAssetForPrice = harden({
      give: { Price: null },
      want: { Asset: null },
    });
    const sellAssetForPrice = harden({
      give: { Asset: null },
      want: { Price: null },
    });
    if (checkIfProposal(offerSeat, sellAssetForPrice)) {
      buyOfferSeats = swapIfCanTradeAndUpdateBook(
        buyOfferSeats,
        sellOfferSeats,
        offerSeat,
      );
      /* eslint-disable no-else-return */
    } else if (checkIfProposal(offerSeat, buyAssetForPrice)) {
      sellOfferSeats = swapIfCanTradeAndUpdateBook(
        sellOfferSeats,
        buyOfferSeats,
        offerSeat,
      );
    } else {
      // Eject because the offer must be invalid
      throw offerSeat.kickOut();
    }
    bookOrdersChanged();
    return 'Trade Successful';
  };

  const makeExchangeInvitation = () =>
    zcf.makeInvitation(exchangeOfferHandler, 'exchange');

  const publicFacet = harden({
    makeInvitation: makeExchangeInvitation,
    getNotifier: () => notifier,
  });

  const creatorFacet = harden({
    getPublicFacet: () => publicFacet,
  });

  // set the initial state of the notifier
  bookOrdersChanged();
  return {
    creatorInvitation: makeExchangeInvitation(),
    creatorFacet,
    publicFacet,
  };
};

harden(start);
export { start };
