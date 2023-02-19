// book of offers to buy liquidating vaults with prices in terms of discount
// from the current oracle price.

import { Far } from '@endo/marshal';
import { mustMatch, M } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';

import {
  toDiscountedRateOfferKey,
  toPriceOfferKey,
  toPriceComparator,
  toDiscountComparator,
} from './sortedOffers.js';
import { makeRatioPattern } from './util.js';

// multiple offers might be provided with the same timestamp (since the time
// granularity is limited to blocks), so we increment with each offer for
// uniqueness.
let mostRecentTimestamp = 0n;
const makeNextTimestamp = () => {
  return timestamp => {
    if (timestamp > mostRecentTimestamp) {
      mostRecentTimestamp = timestamp;
      return timestamp;
    }
    mostRecentTimestamp += 1n;
    return mostRecentTimestamp;
  };
};
const nextTimestamp = makeNextTimestamp();

// prices in this book are expressed as percentage of full price. .4 is 60% off.
// 1.1 is 10% above par.
export const makeDiscountBook = (store, currencyBrand, collateralBrand) => {
  return Far('discountBook ', {
    add(seat, discount, wanted, proposedTimestamp) {
      // XXX mustMatch(discount, DISCOUNT_PATTERN);

      const time = nextTimestamp(proposedTimestamp);
      const key = toDiscountedRateOfferKey(discount, time);
      const empty = AmountMath.makeEmpty(collateralBrand);
      const bidderRecord = { seat, discount, wanted, time, received: empty };
      store.init(key, harden(bidderRecord));
      return key;
    },
    offersAbove(discount) {
      return [...store.entries(M.gte(toDiscountComparator(discount)))];
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

export const makePriceBook = (store, currencyBrand, collateralBrand) => {
  const RATIO_PATTERN = makeRatioPattern(currencyBrand, collateralBrand);
  return Far('discountBook ', {
    add(seat, price, wanted, proposedTimestamp) {
      mustMatch(price, RATIO_PATTERN);

      const time = nextTimestamp(proposedTimestamp);
      const key = toPriceOfferKey(price, time);
      const empty = AmountMath.makeEmpty(collateralBrand);
      const bidderRecord = { seat, price, wanted, time, received: empty };
      store.init(key, harden(bidderRecord));
      return key;
    },
    offersAbove(price) {
      return [...store.entries(M.gte(toPriceComparator(price)))];
    },
    firstOffer() {
      return [...store.keys()][0];
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
      for (const [_, { seat }] of store.entries()) {
        if (!seat.hasExited()) {
          seat.exit();
        }
      }
    },
  });
};
