// book of offers to buy liquidating vaults with prices in terms of
// discount/markup from the current oracle price.

import { Far } from '@endo/marshal';
import { M, mustMatch } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';
import { provideDurableMapStore } from '@agoric/vat-data';

import {
  toBidScalingComparator,
  toScaledRateOfferKey,
  toPartialOfferKey,
  toPriceOfferKey,
} from './sortedOffers.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

// multiple offers might be provided at the same time (since the time
// granularity is limited to blocks), so we increment a sequenceNumber with each
// offer for uniqueness.
let latestSequenceNumber = 0n;
const nextSequenceNumber = () => {
  latestSequenceNumber += 1n;
  return latestSequenceNumber;
};

/**
 * Prices in this book are expressed as percentage of the full oracle price
 * snapshot taken when the auction started. .4 is 60% off. 1.1 is 10% above par.
 *
 * @param {Baggage} baggage
 * @param {Pattern} bidScalingPattern
 * @param {Brand} collateralBrand
 */
export const makeScaledBidBook = (
  baggage,
  bidScalingPattern,
  collateralBrand,
) => {
  const store = provideDurableMapStore(baggage, 'scaledBidStore');

  return Far('scaledBidBook ', {
    add(seat, bidScaling, wanted) {
      mustMatch(bidScaling, bidScalingPattern);

      const seqNum = nextSequenceNumber();
      const key = toScaledRateOfferKey(bidScaling, seqNum);
      const empty = AmountMath.makeEmpty(collateralBrand);
      const bidderRecord = {
        seat,
        bidScaling,
        wanted,
        seqNum,
        received: empty,
      };
      store.init(key, harden(bidderRecord));
      return key;
    },
    offersAbove(bidScaling) {
      return [...store.entries(M.gte(toBidScalingComparator(bidScaling)))];
    },
    hasOrders() {
      return store.getSize() > 0;
    },
    delete(key) {
      store.delete(key);
    },
    updateReceived(key, sold) {
      const oldRec = store.get(key);
      store.set(
        key,
        harden({ ...oldRec, received: AmountMath.add(oldRec.received, sold) }),
      );
    },
    exitAllSeats() {
      for (const { seat } of store.entries()) {
        if (!seat.hasExited()) {
          seat.exit();
        }
      }
    },
  });
};

/**
 * Prices in this book are actual prices expressed in terms of currency amount
 * and collateral amount.
 *
 * @param {Baggage} baggage
 * @param {Pattern} ratioPattern
 * @param {Brand} collateralBrand
 */
export const makePriceBook = (baggage, ratioPattern, collateralBrand) => {
  const store = provideDurableMapStore(baggage, 'scaledBidStore');
  return Far('priceBook ', {
    add(seat, price, wanted) {
      mustMatch(price, ratioPattern);

      const seqNum = nextSequenceNumber();
      const key = toPriceOfferKey(price, seqNum);
      const empty = AmountMath.makeEmpty(collateralBrand);
      const bidderRecord = { seat, price, wanted, seqNum, received: empty };
      store.init(key, harden(bidderRecord));
      return key;
    },
    offersAbove(price) {
      return [...store.entries(M.gte(toPartialOfferKey(price)))];
    },
    hasOrders() {
      return store.getSize() > 0;
    },
    delete(key) {
      store.delete(key);
    },
    updateReceived(key, sold) {
      const oldRec = store.get(key);
      store.set(
        key,
        harden({ ...oldRec, received: AmountMath.add(oldRec.received, sold) }),
      );
    },
    exitAllSeats() {
      for (const { seat } of store.values()) {
        if (!seat.hasExited()) {
          seat.exit();
        }
      }
    },
  });
};
