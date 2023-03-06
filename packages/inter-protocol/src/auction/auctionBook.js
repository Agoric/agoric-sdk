import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/exported.js';

import { M, provide } from '@agoric/vat-data';
import { AmountMath } from '@agoric/ertp';
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
  isScaledBidPriceHigher,
  makeBrandedRatioPattern,
  priceFrom,
} from './util.js';

const { Fail } = assert;

const DEFAULT_DECIMALS = 9n;

/**
 * @file The book represents the collateral-specific state of an ongoing
 * auction. It holds the book, the lockedPrice, and the collateralSeat that has
 * the allocation of assets for sale.
 *
 * The book contains orders for the collateral. It holds two kinds of
 * orders:
 *   - Prices express the bid in terms of a Currency amount
 *   - Scaled bids express the bid in terms of a discount (or markup) from the
 *     most recent oracle price.
 *
 * Offers can be added in three ways. 1) When the auction is not active, prices
 * are automatically added to the appropriate collection. When the auction is
 * active, 2) if a new offer is at or above the current price, it will be
 * settled immediately; 2) If the offer is below the current price, it will be
 * added in the appropriate place and settled when the price reaches that level.
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
  const [currencyAmountShape, collateralAmountShape] = await Promise.all([
    E(currencyBrand).getAmountShape(),
    E(collateralBrand).getAmountShape(),
  ]);
  const BidSpecShape = M.or(
    {
      want: collateralAmountShape,
      offerPrice: makeBrandedRatioPattern(
        currencyAmountShape,
        collateralAmountShape,
      ),
    },
    {
      want: collateralAmountShape,
      offerBidScaling: makeBrandedRatioPattern(
        currencyAmountShape,
        currencyAmountShape,
      ),
    },
  );

  let assetsForSale = AmountMath.makeEmpty(collateralBrand);

  // these don't have to be durable, since we're currently assuming that upgrade
  // from a quiescent state is sufficient. When the auction is quiescent, there
  // may be offers in the book, but these seats will be empty, with all assets
  // returned to the funders.
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: currencySeat } = zcf.makeEmptySeatKit();

  let lockedPriceForRound = zeroRatio;
  let updatingOracleQuote = zeroRatio;
  E.when(
    E(collateralBrand).getDisplayInfo(),
    ({ decimalPlaces = DEFAULT_DECIMALS }) => {
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
          throw Error(
            `auction observer of ${collateralBrand} failed: ${reason}`,
          );
        },
        finish: done => {
          throw Error(`auction observer for ${collateralBrand} died: ${done}`);
        },
      });
    },
  );

  let curAuctionPrice = zeroRatio;

  const scaledBidBook = provide(baggage, 'scaledBidBook', () => {
    const ratioPattern = makeBrandedRatioPattern(
      currencyAmountShape,
      currencyAmountShape,
    );
    return makeScaledBidBook(baggage, ratioPattern, collateralBrand);
  });

  const priceBook = provide(baggage, 'sortedOffers', () => {
    const ratioPattern = makeBrandedRatioPattern(
      currencyAmountShape,
      collateralAmountShape,
    );

    return makePriceBook(baggage, ratioPattern, collateralBrand);
  });

  /**
   * remove the key from the appropriate book, indicated by whether the price
   * is defined.
   *
   * @param {string} key
   * @param {Ratio | undefined} price
   */
  const removeFromItsBook = (key, price) => {
    if (price) {
      priceBook.delete(key);
    } else {
      scaledBidBook.delete(key);
    }
  };

  /**
   * Update the entry in the appropriate book, indicated by whether the price
   * is defined.
   *
   * @param {string} key
   * @param {Amount} collateralSold
   * @param {Ratio | undefined} price
   */
  const updateItsBook = (key, collateralSold, price) => {
    if (price) {
      priceBook.updateReceived(key, collateralSold);
    } else {
      scaledBidBook.updateReceived(key, collateralSold);
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

    const affordableAmounts = () => {
      if (AmountMath.isGTE(currencyAvailable, currencyNeeded)) {
        return [collateralTarget, currencyNeeded];
      } else {
        const affordableCollateral = floorDivideBy(
          currencyAvailable,
          curAuctionPrice,
        );
        return [affordableCollateral, currencyAvailable];
      }
    };
    const [collateralAmount, currencyAmount] = affordableAmounts();
    trace('settle', { collateralAmount, currencyAmount });

    atomicRearrange(
      zcf,
      harden([
        [collateralSeat, seat, { Collateral: collateralAmount }],
        [seat, currencySeat, { Currency: currencyAmount }],
      ]),
    );
    return collateralAmount;
  };

  /**
   *  Accept an offer expressed as a price. If the auction is active, attempt to
   *  buy collateral. If any of the offer remains add it to the book.
   *
   *  @param {ZCFSeat} seat
   *  @param {Ratio} price
   *  @param {Amount} want
   *  @param {boolean} trySettle
   */
  const acceptPriceOffer = (seat, price, want, trySettle) => {
    trace('acceptPrice');
    // Offer has ZcfSeat, offerArgs (w/price) and timeStamp

    const collateralSold =
      trySettle && ratioGTE(price, curAuctionPrice)
        ? settle(seat, want)
        : AmountMath.makeEmptyFromAmount(want);

    const stillWant = AmountMath.subtract(want, collateralSold);
    if (
      AmountMath.isEmpty(stillWant) ||
      AmountMath.isEmpty(seat.getCurrentAllocation().Currency)
    ) {
      seat.exit();
    } else {
      trace('added Offer ', price, stillWant.value);
      priceBook.add(seat, price, stillWant);
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
   *  @param {boolean} trySettle
   */
  const acceptScaledBidOffer = (seat, bidScaling, want, trySettle) => {
    trace('accept scaled bid offer');
    const collateralSold =
      trySettle &&
      isScaledBidPriceHigher(bidScaling, curAuctionPrice, lockedPriceForRound)
        ? settle(seat, want)
        : AmountMath.makeEmptyFromAmount(want);

    const stillWant = AmountMath.subtract(want, collateralSold);
    if (
      AmountMath.isEmpty(stillWant) ||
      AmountMath.isEmpty(seat.getCurrentAllocation().Currency)
    ) {
      seat.exit();
    } else {
      scaledBidBook.add(seat, bidScaling, stillWant);
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
      const scaledBidOffers = scaledBidBook.offersAbove(reduction);

      const compareValues = (v1, v2) => {
        if (v1 < v2) {
          return -1;
        } else if (v1 === v2) {
          return 0;
        } else {
          return 1;
        }
      };
      trace(`settling`, pricedOffers.length, scaledBidOffers.length);
      // requested price or bid scaling gives no priority beyond specifying which
      // round the order will be serviced in.
      const prioritizedOffers = [...pricedOffers, ...scaledBidOffers].sort(
        (a, b) => compareValues(a[1].seqNum, b[1].seqNum),
      );
      for (const [key, { seat, price: p, wanted }] of prioritizedOffers) {
        if (seat.hasExited()) {
          removeFromItsBook(key, p);
        } else {
          const collateralSold = settle(seat, wanted);

          if (
            AmountMath.isEmpty(seat.getCurrentAllocation().Currency) ||
            AmountMath.isGTE(seat.getCurrentAllocation().Collateral, wanted)
          ) {
            seat.exit();
            removeFromItsBook(key, p);
          } else if (!AmountMath.isGTE(collateralSold, wanted)) {
            updateItsBook(key, collateralSold, p);
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
    addOffer(bidSpec, seat, trySettle) {
      mustMatch(bidSpec, BidSpecShape);
      const { give } = seat.getProposal();
      mustMatch(
        give.Currency,
        currencyAmountShape,
        'give must include "Currency"',
      );

      if (bidSpec.offerPrice) {
        return acceptPriceOffer(
          seat,
          bidSpec.offerPrice,
          bidSpec.want,
          trySettle,
        );
      } else if (bidSpec.offerBidScaling) {
        return acceptScaledBidOffer(
          seat,
          bidSpec.offerBidScaling,
          bidSpec.want,
          trySettle,
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

/** @typedef {Awaited<ReturnType<typeof makeAuctionBook>>} AuctionBook */
