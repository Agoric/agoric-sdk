import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/exported.js';

import { M, makeScalarBigMapStore, provide } from '@agoric/vat-data';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { mustMatch } from '@agoric/store';
import { observeNotifier } from '@agoric/notifier';

import {
  atomicRearrange,
  ceilMultiplyBy,
  floorDivideBy,
  makeRatioFromAmounts,
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/captp';
import { makeTracer } from '@agoric/internal';

import { makeDiscountBook, makePriceBook } from './discountBook.js';
import {
  AuctionState,
  isDiscountedPriceHigher,
  makeBrandedRatioPattern,
  priceFrom,
} from './util.js';

const { Fail } = assert;

/**
 * @file The book represents the collateral-specific state of an ongoing
 * auction. It holds the book, the lockedPrice, and the collateralSeat that has
 * the allocation of assets for sale.
 *
 * The book contains orders for the collateral. It holds two kinds of
 * orders:
 *   - Prices express the bid in terms of a Currency amount
 *   - Discount  express the bid in terms of a discount (or markup) from the
 *     most recent oracle price.
 *
 * Offers can be added in three ways. When the auction is not active, prices are
 * automatically added to the appropriate collection. If a new offer is at or
 * above the current price of an active auction, it will be settled immediately.
 * If the offer is below the current price, it will be added, and settled when
 * the price reaches that level.
 */

const trace = makeTracer('AucBook', false);

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

export const makeAuctionBook = async (
  baggage,
  zcf,
  currencyBrand,
  collateralBrand,
  priceAuthority,
) => {
  const makeZeroRatio = () =>
    makeRatioFromAmounts(
      AmountMath.makeEmpty(currencyBrand),
      AmountMath.make(collateralBrand, 1n),
    );
  const BidSpecShape = M.or(
    {
      want: AmountShape,
      offerPrice: makeBrandedRatioPattern(currencyBrand, collateralBrand),
    },
    {
      want: AmountShape,
      offerDiscount: makeBrandedRatioPattern(currencyBrand, currencyBrand),
    },
  );

  let assetsForSale = AmountMath.makeEmpty(collateralBrand);
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: currencySeat } = zcf.makeEmptySeatKit();

  let lockedPriceForRound = makeZeroRatio();
  let updatingOracleQuote = makeZeroRatio();
  E.when(E(collateralBrand).getDisplayInfo(), ({ decimalPlaces = 9n }) => {
    // TODO(#6946) use this to keep a current price that can be published in state.
    const quoteNotifier = E(priceAuthority).makeQuoteNotifier(
      AmountMath.make(collateralBrand, 10n ** decimalPlaces),
      currencyBrand,
    );

    observeNotifier(quoteNotifier, {
      updateState: quote => {
        trace(
          `BOOK notifier ${priceFrom(quote).numerator.value}/${
            priceFrom(quote).denominator.value
          }`,
        );
        return (updatingOracleQuote = priceFrom(quote));
      },
      fail: reason => {
        throw Error(`auction observer of ${collateralBrand} failed: ${reason}`);
      },
      finish: done => {
        throw Error(`auction observer for ${collateralBrand} died: ${done}`);
      },
    });
  });

  let curAuctionPrice = makeZeroRatio();

  const discountBook = provide(baggage, 'discountBook', () => {
    const discountStore = makeScalarBigMapStore('orderedVaultStore', {
      durable: true,
    });
    return makeDiscountBook(discountStore, currencyBrand, collateralBrand);
  });

  const priceBook = provide(baggage, 'sortedOffers', () => {
    const priceStore = makeScalarBigMapStore('orderedVaultStore', {
      durable: true,
    });
    return makePriceBook(priceStore, currencyBrand, collateralBrand);
  });

  const removeFromOneBook = (isPriceBook, key) => {
    if (isPriceBook) {
      priceBook.delete(key);
    } else {
      discountBook.delete(key);
    }
  };

  // Settle with seat. The caller is responsible for updating the book, if any.
  const settle = (seat, collateralWanted) => {
    const { Currency: currencyAvailable } = seat.getCurrentAllocation();
    const { Collateral: collateralAvailable } =
      collateralSeat.getCurrentAllocation();
    if (!collateralAvailable || AmountMath.isEmpty(collateralAvailable)) {
      return AmountMath.makeEmptyFromAmount(collateralWanted);
    }

    /** @type {Amount<'nat'>} */
    const collateralTarget = AmountMath.min(
      collateralWanted,
      collateralAvailable,
    );

    const currencyNeeded = ceilMultiplyBy(collateralTarget, curAuctionPrice);
    if (AmountMath.isEmpty(currencyNeeded)) {
      seat.fail('price fell to zero');
      return AmountMath.makeEmptyFromAmount(collateralWanted);
    }

    let collateralRecord;
    let currencyRecord;
    if (AmountMath.isGTE(currencyAvailable, currencyNeeded)) {
      collateralRecord = {
        Collateral: collateralTarget,
      };
      currencyRecord = {
        Currency: currencyNeeded,
      };
    } else {
      const affordableCollateral = floorDivideBy(
        currencyAvailable,
        curAuctionPrice,
      );
      collateralRecord = {
        Collateral: affordableCollateral,
      };
      currencyRecord = {
        Currency: currencyAvailable,
      };
    }

    trace('settle', { currencyRecord, collateralRecord });

    atomicRearrange(
      zcf,
      harden([
        [collateralSeat, seat, collateralRecord],
        [seat, currencySeat, currencyRecord],
      ]),
    );
    return collateralRecord.Collateral;
  };

  const isActive = auctionState => auctionState === AuctionState.ACTIVE;

  /**
   *  Accept an offer expressed as a price. If the auction is active, attempt to
   *  buy collateral. If any of the offer remains add it to the book.
   *
   *  @param {ZCFSeat} seat
   *  @param {Ratio} price
   *  @param {Amount} want
   *  @param {AuctionState} auctionState
   */
  const acceptPriceOffer = (seat, price, want, auctionState) => {
    trace('acceptPrice');
    // Offer has ZcfSeat, offerArgs (w/price) and timeStamp

    let collateralSold = AmountMath.makeEmptyFromAmount(want);
    if (isActive(auctionState) && ratioGTE(price, curAuctionPrice)) {
      collateralSold = settle(seat, want);

      if (AmountMath.isEmpty(seat.getCurrentAllocation().Currency)) {
        seat.exit();
        return;
      }
    }

    const stillWant = AmountMath.subtract(want, collateralSold);
    if (!AmountMath.isEmpty(stillWant)) {
      trace('added Offer ', price, stillWant.value);
      priceBook.add(seat, price, stillWant);
    } else {
      seat.exit();
    }
  };

  /**
   *  Accept an offer expressed as a discount (or markup). If the auction is
   *  active, attempt to buy collateral. If any of the offer remains add it to
   *  the book.
   *
   *  @param {ZCFSeat} seat
   *  @param {Ratio} discount
   *  @param {Amount} want
   *  @param {AuctionState} auctionState
   */
  const acceptDiscountOffer = (seat, discount, want, auctionState) => {
    trace('accept discount');
    let collateralSold = AmountMath.makeEmptyFromAmount(want);

    if (
      isActive(auctionState) &&
      isDiscountedPriceHigher(discount, curAuctionPrice, lockedPriceForRound)
    ) {
      collateralSold = settle(seat, want);
      if (AmountMath.isEmpty(seat.getCurrentAllocation().Currency)) {
        seat.exit();
        return;
      }
    }

    const stillWant = AmountMath.subtract(want, collateralSold);
    if (!AmountMath.isEmpty(stillWant)) {
      discountBook.add(seat, discount, stillWant);
    } else {
      seat.exit();
    }
  };

  return Far('AuctionBook', {
    addAssets(assetAmount, sourceSeat) {
      trace('add assets');
      assetsForSale = AmountMath.add(assetsForSale, assetAmount);
      atomicRearrange(
        zcf,
        harden([[sourceSeat, collateralSeat, { Collateral: assetAmount }]]),
      );
    },
    settleAtNewRate(reduction) {
      curAuctionPrice = multiplyRatios(reduction, lockedPriceForRound);

      const pricedOffers = priceBook.offersAbove(curAuctionPrice);
      const discOffers = discountBook.offersAbove(reduction);

      // requested price or discount gives no priority beyond specifying which
      // round the order will be service in.
      const prioritizedOffers = [...pricedOffers, ...discOffers].sort();

      trace(`settling`, pricedOffers.length, discOffers.length);
      prioritizedOffers.forEach(([key, { seat, price: p, wanted }]) => {
        if (seat.hasExited()) {
          removeFromOneBook(p, key);
        } else {
          const collateralSold = settle(seat, wanted);

          if (
            AmountMath.isEmpty(seat.getCurrentAllocation().Currency) ||
            AmountMath.isGTE(seat.getCurrentAllocation().Collateral, wanted)
          ) {
            seat.exit();
            removeFromOneBook(p, key);
          } else if (!AmountMath.isGTE(collateralSold, wanted)) {
            if (p) {
              priceBook.updateReceived(key, collateralSold);
            } else {
              discountBook.updateReceived(key, collateralSold);
            }
          }
        }
      });
    },
    getCurrentPrice() {
      return curAuctionPrice;
    },
    hasOrders() {
      return discountBook.hasOrders() || priceBook.hasOrders();
    },
    lockOraclePriceForRound() {
      trace(`locking `, updatingOracleQuote);
      lockedPriceForRound = updatingOracleQuote;
    },

    setStartingRate(rate) {
      trace('set startPrice', lockedPriceForRound);
      curAuctionPrice = multiplyRatios(lockedPriceForRound, rate);
    },
    addOffer(bidSpec, seat, auctionState) {
      mustMatch(bidSpec, BidSpecShape);

      if (bidSpec.offerPrice) {
        return acceptPriceOffer(
          seat,
          bidSpec.offerPrice,
          bidSpec.want,
          auctionState,
        );
      } else if (bidSpec.offerDiscount) {
        return acceptDiscountOffer(
          seat,
          bidSpec.offerDiscount,
          bidSpec.want,
          auctionState,
        );
      } else {
        throw Fail`Offer was neither a price nor a discount`;
      }
    },
    getSeats() {
      return { collateralSeat, currencySeat };
    },
    exitAllSeats() {
      priceBook.exitAllSeats();
      discountBook.exitAllSeats();
    },
  });
};
