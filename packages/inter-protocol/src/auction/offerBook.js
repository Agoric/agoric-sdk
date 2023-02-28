// book of offers to buy liquidating vaults with prices in terms of
// discount/markup from the current oracle price.

import { Far } from '@endo/marshal';
import { M, mustMatch } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';

import {
  toBidScalingComparator,
  toScaledRateOfferKey,
  toPartialOfferKey,
  toPriceOfferKey,
} from './sortedOffers.js';
import { makeBrandedRatioPattern } from './util.js';

// multiple offers might be provided at the same time (since the time
// granularity is limited to blocks), so we increment a sequenceNumber with each
// offer for uniqueness.
let latestSequenceNumber = 0n;
const nextSequenceNumber = () => {
  latestSequenceNumber += 1n;
  return latestSequenceNumber;
};

// prices in this book are expressed as percentage of the full oracle price
// snapshot taken when the auction started. .4 is 60% off. 1.1 is 10% above par.
export const makeScaledBidBook = (store, currencyBrand, collateralBrand) => {
  return Far('scaledBidBook ', {
    add(seat, bidScaling, wanted) {
      // XXX mustMatch(bidScaling, BID_SCALING_PATTERN);

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

// prices in this book are actual prices expressed in terms of currency amount
// and collateral amount.
export const makePriceBook = (store, currencyBrand, collateralBrand) => {
  const RATIO_PATTERN = makeBrandedRatioPattern(currencyBrand, collateralBrand);
  return Far('priceBook ', {
    add(seat, price, wanted) {
      mustMatch(price, RATIO_PATTERN);

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
