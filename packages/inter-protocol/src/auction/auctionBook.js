import '@agoric/governance/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import { AmountMath } from '@agoric/ertp';
import { mustMatch } from '@agoric/store';
import { M, prepareExoClassKit } from '@agoric/vat-data';

import { assertAllDefined, makeTracer } from '@agoric/internal';
import {
  atomicRearrange,
  ceilMultiplyBy,
  floorDivideBy,
  makeRatioFromAmounts,
  multiplyRatios,
  ratioGTE,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/captp';

import { observeNotifier } from '@agoric/notifier';
import { makeNatAmountShape } from '../contractSupport.js';
import { preparePriceBook, prepareScaledBidBook } from './offerBook.js';
import {
  isScaledBidPriceHigher,
  makeBrandedRatioPattern,
  priceFrom,
} from './util.js';

const { Fail } = assert;
const { makeEmpty } = AmountMath;

const DEFAULT_DECIMALS = 9;

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

/**
 * @typedef {{
 * want: Amount<'nat'>
 * } & {
 *   exitAfterBuy?: boolean,
 * } & ({
 *   offerPrice: Ratio,
 * } | {
 *    offerBidScaling: Ratio,
 * })} BidSpec
 */
/**
 *
 * @param {Brand<'nat'>} currencyBrand
 * @param {Brand<'nat'>} collateralBrand
 */
export const makeBidSpecShape = (currencyBrand, collateralBrand) => {
  const currencyAmountShape = makeNatAmountShape(currencyBrand);
  const collateralAmountShape = makeNatAmountShape(collateralBrand);
  return M.splitRecord(
    { want: collateralAmountShape },
    {
      exitAfterBuy: true,
      // xxx should have exactly one of these properties
      offerPrice: makeBrandedRatioPattern(
        currencyAmountShape,
        collateralAmountShape,
      ),
      offerBidScaling: makeBrandedRatioPattern(
        currencyAmountShape,
        currencyAmountShape,
      ),
    },
  );
};

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {Baggage} baggage
 * @param {ZCF} zcf
 */
export const prepareAuctionBook = (baggage, zcf) => {
  const makeScaledBidBook = prepareScaledBidBook(baggage);
  const makePriceBook = preparePriceBook(baggage);

  const makeAuctionBookKit = prepareExoClassKit(
    baggage,
    'AuctionBook',
    undefined,
    /**
     *
     * @param {Brand<'nat'>} currencyBrand
     * @param {Brand<'nat'>} collateralBrand
     * @param {PriceAuthority} priceAuthority
     */
    (currencyBrand, collateralBrand, priceAuthority) => {
      assertAllDefined({ currencyBrand, collateralBrand, priceAuthority });
      const zeroCurrency = makeEmpty(currencyBrand);
      const zeroRatio = makeRatioFromAmounts(
        zeroCurrency,
        AmountMath.make(collateralBrand, 1n),
      );

      // these don't have to be durable, since we're currently assuming that upgrade
      // from a quiescent state is sufficient. When the auction is quiescent, there
      // may be offers in the book, but these seats will be empty, with all assets
      // returned to the funders.
      const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();
      const { zcfSeat: currencySeat } = zcf.makeEmptySeatKit();

      const currencyAmountShape = makeNatAmountShape(currencyBrand);
      const collateralAmountShape = makeNatAmountShape(collateralBrand);
      const scaledBidBook = makeScaledBidBook(
        makeBrandedRatioPattern(currencyAmountShape, currencyAmountShape),
        collateralBrand,
      );

      const priceBook = makePriceBook(
        makeBrandedRatioPattern(currencyAmountShape, collateralAmountShape),
        collateralBrand,
      );

      return {
        currencyBrand,
        collateralBrand,
        priceAuthority,

        collateralAmountShape,
        currencyAmountShape,
        priceBook,
        scaledBidBook,

        collateralSeat,
        curAuctionPrice: zeroRatio,
        currencySeat,
        lockedPriceForRound: zeroRatio,
        updatingOracleQuote: zeroRatio,
        /**
         * null indicates no limit; empty indicates limit exhausted
         *
         * @type {Amount<'nat'> | null}
         */
        totalProceedsGoal: null,
      };
    },
    {
      helper: {
        /**
         * remove the key from the appropriate book, indicated by whether the price
         * is defined.
         *
         * @param {string} key
         * @param {Ratio | undefined} price
         */
        removeFromItsBook(key, price) {
          const { priceBook, scaledBidBook } = this.state;
          if (price) {
            priceBook.delete(key);
          } else {
            scaledBidBook.delete(key);
          }
        },

        /**
         * Update the entry in the appropriate book, indicated by whether the price
         * is defined.
         *
         * @param {string} key
         * @param {Amount} collateralSold
         * @param {Ratio | undefined} price
         */
        updateItsBook(key, collateralSold, price) {
          const { priceBook, scaledBidBook } = this.state;
          if (price) {
            priceBook.updateReceived(key, collateralSold);
          } else {
            scaledBidBook.updateReceived(key, collateralSold);
          }
        },

        /**
         * Settle with seat. The caller is responsible for updating the book, if any.
         *
         * @param {ZCFSeat} seat
         * @param {Amount<'nat'>} collateralWanted
         */
        settle(seat, collateralWanted) {
          const { collateralSeat, collateralBrand } = this.state;
          const { Currency: currencyAlloc } = seat.getCurrentAllocation();
          const { Collateral: collateralAvailable } =
            collateralSeat.getCurrentAllocation();
          if (!collateralAvailable || AmountMath.isEmpty(collateralAvailable)) {
            return makeEmpty(collateralBrand);
          }

          /** @type {Amount<'nat'>} */
          const initialCollateralTarget = AmountMath.min(
            collateralWanted,
            collateralAvailable,
          );

          const { curAuctionPrice, currencySeat, totalProceedsGoal } =
            this.state;
          const currencyNeeded = ceilMultiplyBy(
            initialCollateralTarget,
            curAuctionPrice,
          );
          if (AmountMath.isEmpty(currencyNeeded)) {
            seat.fail(Error('price fell to zero'));
            return makeEmpty(collateralBrand);
          }

          const initialCurrencyTarget = AmountMath.min(
            currencyNeeded,
            currencyAlloc,
          );
          const currencyLimit = totalProceedsGoal
            ? AmountMath.min(totalProceedsGoal, initialCurrencyTarget)
            : initialCurrencyTarget;
          const isRaiseLimited =
            totalProceedsGoal ||
            !AmountMath.isGTE(currencyLimit, currencyNeeded);

          const [currencyTarget, collateralTarget] = isRaiseLimited
            ? [currencyLimit, floorDivideBy(currencyLimit, curAuctionPrice)]
            : [initialCurrencyTarget, initialCollateralTarget];

          trace('settle', {
            collateral: collateralTarget,
            currency: currencyTarget,
            totalProceedsGoal,
          });

          atomicRearrange(
            zcf,
            harden([
              [collateralSeat, seat, { Collateral: collateralTarget }],
              [seat, currencySeat, { Currency: currencyTarget }],
            ]),
          );

          if (totalProceedsGoal) {
            this.state.totalProceedsGoal = AmountMath.subtract(
              totalProceedsGoal,
              currencyTarget,
            );
          }
          return collateralTarget;
        },

        /**
         *  Accept an offer expressed as a price. If the auction is active, attempt to
         *  buy collateral. If any of the offer remains add it to the book.
         *
         *  @param {ZCFSeat} seat
         *  @param {Ratio} price
         *  @param {Amount<'nat'>} want
         *  @param {boolean} trySettle
         *  @param {boolean} [exitAfterBuy]
         */
        acceptPriceOffer(seat, price, want, trySettle, exitAfterBuy = false) {
          const { priceBook, curAuctionPrice } = this.state;
          const { helper } = this.facets;
          trace('acceptPrice');
          // Offer has ZcfSeat, offerArgs (w/price) and timeStamp

          const collateralSold =
            trySettle && ratioGTE(price, curAuctionPrice)
              ? helper.settle(seat, want)
              : AmountMath.makeEmptyFromAmount(want);

          const stillWant = AmountMath.subtract(want, collateralSold);
          if (
            (exitAfterBuy && !AmountMath.isEmpty(collateralSold)) ||
            AmountMath.isEmpty(stillWant) ||
            AmountMath.isEmpty(seat.getCurrentAllocation().Currency)
          ) {
            seat.exit();
          } else {
            trace('added Offer ', price, stillWant.value);
            priceBook.add(seat, price, stillWant, exitAfterBuy);
          }
        },

        /**
         *  Accept an offer expressed as a discount (or markup). If the auction is
         *  active, attempt to buy collateral. If any of the offer remains add it to
         *  the book.
         *
         *  @param {ZCFSeat} seat
         *  @param {Ratio} bidScaling
         *  @param {Amount<'nat'>} want
         *  @param {boolean} trySettle
         *  @param {boolean} [exitAfterBuy]
         */
        acceptScaledBidOffer(
          seat,
          bidScaling,
          want,
          trySettle,
          exitAfterBuy = false,
        ) {
          trace('accept scaled bid offer');
          const { curAuctionPrice, lockedPriceForRound, scaledBidBook } =
            this.state;
          const { helper } = this.facets;
          const collateralSold =
            trySettle &&
            isScaledBidPriceHigher(
              bidScaling,
              curAuctionPrice,
              lockedPriceForRound,
            )
              ? helper.settle(seat, want)
              : AmountMath.makeEmptyFromAmount(want);

          const stillWant = AmountMath.subtract(want, collateralSold);
          if (
            (exitAfterBuy && !AmountMath.isEmpty(collateralSold)) ||
            AmountMath.isEmpty(stillWant) ||
            AmountMath.isEmpty(seat.getCurrentAllocation().Currency)
          ) {
            seat.exit();
          } else {
            scaledBidBook.add(seat, bidScaling, stillWant, exitAfterBuy);
          }
        },
      },
      self: {
        /**
         * @param {Amount<'nat'>} assetAmount
         * @param {ZCFSeat} sourceSeat
         * @param {Amount<'nat'>} [proceedsGoal] an amount that the depositor
         *    would like to raise. The auction is requested to not sell more
         *    collateral than required to raise that much. The auctioneer might
         *    sell more if there is more than one supplier of collateral, and
         *    they request inconsistent limits.
         */
        addAssets(assetAmount, sourceSeat, proceedsGoal) {
          trace('add assets');
          const { collateralBrand, collateralSeat, totalProceedsGoal } =
            this.state;

          // When adding assets, the new ratio of totalCollectionGoal to collateral
          // allocation will be the larger of the existing ratio and the ratio
          // implied by the new deposit. Add the new collateral and raise
          // totalProceedsGoal so it's proportional to the new ratio. This can
          // result in raising more currency than one depositor wanted, but
          // that's better than not selling as much as the other desired.

          const allocation = collateralSeat.getCurrentAllocation();
          const curCollateral =
            'Collateral' in allocation
              ? allocation.Collateral
              : makeEmpty(collateralBrand);

          // when neither proceedsGoal nor totalProceedsGoal is defined, we don't need an
          // update and the call immediately below won't invoke this function.
          const calcTargetRatio = () => {
            if (totalProceedsGoal && !proceedsGoal) {
              return makeRatioFromAmounts(totalProceedsGoal, curCollateral);
            } else if (!totalProceedsGoal && proceedsGoal) {
              return makeRatioFromAmounts(proceedsGoal, assetAmount);
            } else if (totalProceedsGoal && proceedsGoal) {
              const curRatio = makeRatioFromAmounts(
                totalProceedsGoal,
                curCollateral,
              );
              const newRatio = makeRatioFromAmounts(proceedsGoal, assetAmount);
              return ratioGTE(newRatio, curRatio) ? newRatio : curRatio;
            }

            throw Fail`calcTargetRatio called with !totalProceedsGoal && !proceedsGoal`;
          };

          if (proceedsGoal || totalProceedsGoal) {
            this.state.totalProceedsGoal = ceilMultiplyBy(
              AmountMath.add(curCollateral, assetAmount),
              calcTargetRatio(),
            );
          }

          atomicRearrange(
            zcf,
            harden([[sourceSeat, collateralSeat, { Collateral: assetAmount }]]),
          );
        },
        /** @type {(reduction: Ratio) => void} */
        settleAtNewRate(reduction) {
          trace('settleAtNewRate', reduction);
          const { lockedPriceForRound, priceBook, scaledBidBook } = this.state;
          this.state.curAuctionPrice = multiplyRatios(
            reduction,
            lockedPriceForRound,
          );
          // extract after it's set in state
          const { curAuctionPrice } = this.state;

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

          const { totalProceedsGoal } = this.state;
          const { helper } = this.facets;
          for (const [key, seatRecord] of prioritizedOffers) {
            const { seat, price: p, wanted, exitAfterBuy } = seatRecord;
            if (totalProceedsGoal && AmountMath.isEmpty(totalProceedsGoal)) {
              break;
            } else if (seat.hasExited()) {
              helper.removeFromItsBook(key, p);
            } else {
              const collateralSold = helper.settle(seat, wanted);

              const alloc = seat.getCurrentAllocation();
              if (
                (exitAfterBuy && !AmountMath.isEmpty(collateralSold)) ||
                AmountMath.isEmpty(alloc.Currency) ||
                ('Collateral' in alloc &&
                  AmountMath.isGTE(alloc.Collateral, wanted))
              ) {
                seat.exit();
                helper.removeFromItsBook(key, p);
              } else if (!AmountMath.isGTE(collateralSold, wanted)) {
                helper.updateItsBook(key, collateralSold, p);
              }
            }
          }
        },
        getCurrentPrice() {
          return this.state.curAuctionPrice;
        },
        hasOrders() {
          const { scaledBidBook, priceBook } = this.state;
          return scaledBidBook.hasOrders() || priceBook.hasOrders();
        },
        lockOraclePriceForRound() {
          const { updatingOracleQuote } = this.state;
          trace(`locking `, updatingOracleQuote);
          this.state.lockedPriceForRound = updatingOracleQuote;
        },

        setStartingRate(rate) {
          const { lockedPriceForRound } = this.state;
          trace('set startPrice', lockedPriceForRound);
          this.state.curAuctionPrice = multiplyRatios(
            lockedPriceForRound,
            rate,
          );
        },
        /**
         * @param {BidSpec} bidSpec
         * @param {ZCFSeat} seat
         * @param {boolean} trySettle
         */
        addOffer(bidSpec, seat, trySettle) {
          const { currencyBrand, collateralBrand } = this.state;
          const BidSpecShape = makeBidSpecShape(currencyBrand, collateralBrand);

          mustMatch(bidSpec, BidSpecShape);
          const { give } = seat.getProposal();
          const { currencyAmountShape } = this.state;
          mustMatch(
            give.Currency,
            currencyAmountShape,
            'give must include "Currency"',
          );

          const { helper } = this.facets;
          const exitAfterBuy = bidSpec.exitAfterBuy;
          if ('offerPrice' in bidSpec) {
            return helper.acceptPriceOffer(
              seat,
              bidSpec.offerPrice,
              bidSpec.want,
              trySettle,
              exitAfterBuy,
            );
          } else if ('offerBidScaling' in bidSpec) {
            return helper.acceptScaledBidOffer(
              seat,
              bidSpec.offerBidScaling,
              bidSpec.want,
              trySettle,
              exitAfterBuy,
            );
          } else {
            throw Fail`Offer was neither a price nor a scaled bid`;
          }
        },
        getSeats() {
          const { collateralSeat, currencySeat } = this.state;
          this.state.totalProceedsGoal = null;
          return { collateralSeat, currencySeat };
        },
        exitAllSeats() {
          const { priceBook, scaledBidBook } = this.state;
          priceBook.exitAllSeats();
          scaledBidBook.exitAllSeats();
        },
      },
    },
    {
      finish: ({ state }) => {
        const { collateralBrand, currencyBrand, priceAuthority } = state;
        assertAllDefined({ collateralBrand, currencyBrand, priceAuthority });
        void E.when(
          E(collateralBrand).getDisplayInfo(),
          ({ decimalPlaces = DEFAULT_DECIMALS }) => {
            // TODO(#6946) use this to keep a current price that can be published in state.
            const quoteNotifier = E(priceAuthority).makeQuoteNotifier(
              AmountMath.make(collateralBrand, 10n ** BigInt(decimalPlaces)),
              currencyBrand,
            );
            void observeNotifier(quoteNotifier, {
              updateState: quote => {
                trace(
                  `BOOK notifier ${priceFrom(quote).numerator.value}/${
                    priceFrom(quote).denominator.value
                  }`,
                );
                return (state.updatingOracleQuote = priceFrom(quote));
              },
              fail: reason => {
                throw Error(
                  `auction observer of ${collateralBrand} failed: ${reason}`,
                );
              },
              finish: done => {
                throw Error(
                  `auction observer for ${collateralBrand} died: ${done}`,
                );
              },
            });
          },
        );
      },
    },
  );

  return (cur, col, pa) => makeAuctionBookKit(cur, col, pa).self;
};
harden(prepareAuctionBook);

/** @typedef {ReturnType<ReturnType<typeof prepareAuctionBook>>} AuctionBook */
