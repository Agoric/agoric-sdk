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

import { makeScaledBidBook, makePriceBook } from './offerBook.js';
import {
  AuctionState,
  isScaledBidPriceHigher,
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
 *   - Scaled bid  express the bid in terms of a discount (or markup) from the
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
  const zeroRatio = makeRatioFromAmounts(
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
      offerBidScaling: makeBrandedRatioPattern(currencyBrand, currencyBrand),
    },
  );

  let assetsForSale = AmountMath.makeEmpty(collateralBrand);
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: currencySeat } = zcf.makeEmptySeatKit();

  let lockedPriceForRound = zeroRatio;
  let updatingOracleQuote = zeroRatio;
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

  let curAuctionPrice = zeroRatio;

  const scaledBidBook = provide(baggage, 'scaledBidBook', () => {
    const scaledBidStore = makeScalarBigMapStore('scaledBidBookStore', {
      durable: true,
    });
    return makeScaledBidBook(scaledBidStore, currencyBrand, collateralBrand);
  });

  const priceBook = provide(baggage, 'sortedOffers', () => {
    const priceStore = makeScalarBigMapStore('sortedOffersStore', {
      durable: true,
    });
    return makePriceBook(priceStore, currencyBrand, collateralBrand);
  });

  const removeFromOneBook = (isPriceBook, key) => {
    if (isPriceBook) {
      priceBook.delete(key);
    } else {
      scaledBidBook.delete(key);
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
   *  @param {Ratio} bidScaling
   *  @param {Amount} want
   *  @param {AuctionState} auctionState
   */
  const acceptScaledBidOffer = (seat, bidScaling, want, auctionState) => {
    trace('accept scaled bid offer');
    let collateralSold = AmountMath.makeEmptyFromAmount(want);

    if (
      isActive(auctionState) &&
      isScaledBidPriceHigher(bidScaling, curAuctionPrice, lockedPriceForRound)
    ) {
      collateralSold = settle(seat, want);
      if (AmountMath.isEmpty(seat.getCurrentAllocation().Currency)) {
        seat.exit();
        return;
      }
    }

    const stillWant = AmountMath.subtract(want, collateralSold);
    if (!AmountMath.isEmpty(stillWant)) {
      scaledBidBook.add(seat, bidScaling, stillWant);
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
      const discOffers = scaledBidBook.offersAbove(reduction);

      // requested price or bid scaling gives no priority beyond specifying which
      // round the order will be service in.
      const prioritizedOffers = [...pricedOffers, ...discOffers].sort();

      trace(`settling`, pricedOffers.length, discOffers.length);
      for (const [key, { seat, price: p, wanted }] of prioritizedOffers) {
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
              scaledBidBook.updateReceived(key, collateralSold);
            }
          }
        }
      }
    },
    getCurrentPrice() {
      return curAuctionPrice;
    },
    hasOrders() {
      return scaledBidBook.hasOrders() || priceBook.hasOrders();
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
      } else if (bidSpec.offerBidScaling) {
        return acceptScaledBidOffer(
          seat,
          bidSpec.offerBidScaling,
          bidSpec.want,
          auctionState,
        );
      } else {
        throw Fail`Offer was neither a price nor a scaled bid`;
      }
    },
    getSeats() {
      return { collateralSeat, currencySeat };
    },
    exitAllSeats() {
      priceBook.exitAllSeats();
      scaledBidBook.exitAllSeats();
    },
  });
};
