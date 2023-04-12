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
import {
  observeNotifier,
  pipeTopicToStorage,
  makePublicTopic,
} from '@agoric/notifier';

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
 *   want: Amount<'nat'>
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
      exitAfterBuy: M.boolean(),
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
 * @typedef {object} BookDataNotification
 *
 * @property {Ratio         | null}      startPrice identifies the priceAuthority and price
 * @property {Ratio         | null}      currentPriceLevel the price at the current auction tier
 * @property {Amount<'nat'> | null}      startProceedsGoal The proceeds the sellers were targeting to raise
 * @property {Amount<'nat'> | null}      remainingProceedsGoal The remainder of
 *     the proceeds the sellers were targeting to raise
 * @property {Amount<'nat'> | undefined} proceedsRaised The proceeds raised so far in the auction
 * @property {Amount<'nat'>}             startCollateral How much collateral was
 *    available for sale at the start. (If more is deposited later, it'll be
 *    added in.)
 * @property {Amount<'nat'> | null}      collateralAvailable The amount of collateral remaining
 */

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
     * @param {Brand<'nat'>} currencyBrand
     * @param {Brand<'nat'>} collateralBrand
     * @param {PriceAuthority} pAuthority
     * @param {PublishKit<BookDataNotification>} pubKit
     * @param {Marshaller} marshaller
     * @param {StorageNode} node
     */
    (currencyBrand, collateralBrand, pAuthority, pubKit, marshaller, node) => {
      assertAllDefined({ currencyBrand, collateralBrand, pAuthority });
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

      const { publisher: bookDataPublisher, subscriber: bookDataSubscriber } =
        pubKit;
      pipeTopicToStorage(bookDataSubscriber, node, marshaller);

      return {
        collateralBrand,
        collateralSeat,
        collateralAmountShape,
        currencyBrand,
        currencySeat,
        currencyAmountShape,

        priceAuthority: pAuthority,
        updatingOracleQuote: zeroRatio,

        bookDataPublisher,
        bookDataSubscriber,
        node,

        priceBook,
        scaledBidBook,
        /**
         * Set to empty at the end of an auction. It increases when
         * `addAssets()` is called
         */
        startCollateral: AmountMath.makeEmpty(collateralBrand),

        /**
         * Null indicates no limit; empty indicates limit exhausted. It is reset
         * at the end of each auction. It increases when `addAssets()` is called
         * with a goal.
         *
         * @type {Amount<'nat'> | null}
         */
        startProceedsGoal: null,

        /**
         * Assigned a value to lock the price and reset to null at the end of
         * each auction.
         *
         * @type {Ratio | null}
         */
        lockedPriceForRound: null,

        /**
         * non-null during auctions. It is assigned a value at the beginning of
         * each descending step, and reset at the end of the auction.
         *
         * @type {Ratio | null}
         */
        curAuctionPrice: null,

        /**
         * null outside of auctions. during an auction null indicates no limit;
         * empty indicates limit exhausted
         *
         * @type {Amount<'nat'> | null}
         */
        remainingProceedsGoal: null,
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

          const { curAuctionPrice, currencySeat, remainingProceedsGoal } =
            this.state;
          curAuctionPrice !== null ||
            Fail`auctionPrice must be set before each round`;
          assert(curAuctionPrice);

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
          const currencyLimit = remainingProceedsGoal
            ? AmountMath.min(remainingProceedsGoal, initialCurrencyTarget)
            : initialCurrencyTarget;
          const isRaiseLimited =
            remainingProceedsGoal ||
            !AmountMath.isGTE(currencyLimit, currencyNeeded);

          const [currencyTarget, collateralTarget] = isRaiseLimited
            ? [currencyLimit, floorDivideBy(currencyLimit, curAuctionPrice)]
            : [initialCurrencyTarget, initialCollateralTarget];

          trace('settle', {
            collateral: collateralTarget,
            currency: currencyTarget,
            remainingProceedsGoal,
          });

          const { Collateral } = seat.getProposal().want;
          if (Collateral && AmountMath.isGTE(Collateral, collateralTarget)) {
            seat.exit('unable to satisfy want');
          }

          atomicRearrange(
            zcf,
            harden([
              [collateralSeat, seat, { Collateral: collateralTarget }],
              [seat, currencySeat, { Currency: currencyTarget }],
            ]),
          );

          if (remainingProceedsGoal) {
            this.state.remainingProceedsGoal = AmountMath.subtract(
              remainingProceedsGoal,
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
         *  @param {object} opts
         *  @param {boolean} opts.trySettle
         *  @param {boolean} [opts.exitAfterBuy]
         */
        acceptPriceOffer(
          seat,
          price,
          want,
          { trySettle, exitAfterBuy = false },
        ) {
          const { priceBook, curAuctionPrice } = this.state;
          const { helper } = this.facets;
          trace('acceptPrice');

          const settleIfPriceExists = () => {
            if (curAuctionPrice !== null) {
              return trySettle && ratioGTE(price, curAuctionPrice)
                ? helper.settle(seat, want)
                : AmountMath.makeEmptyFromAmount(want);
            } else {
              return AmountMath.makeEmptyFromAmount(want);
            }
          };
          const collateralSold = settleIfPriceExists();

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

          helper.publishBookData();
        },

        /**
         *  Accept an offer expressed as a discount (or markup). If the auction is
         *  active, attempt to buy collateral. If any of the offer remains add it to
         *  the book.
         *
         *  @param {ZCFSeat} seat
         *  @param {Ratio} bidScaling
         *  @param {Amount<'nat'>} want
         *  @param {object} opts
         *  @param {boolean} opts.trySettle
         *  @param {boolean} [opts.exitAfterBuy]
         */
        acceptScaledBidOffer(
          seat,
          bidScaling,
          want,
          { trySettle, exitAfterBuy = false },
        ) {
          trace('accept scaled bid offer');
          const { curAuctionPrice, lockedPriceForRound, scaledBidBook } =
            this.state;
          const { helper } = this.facets;

          const settleIfPricesDefined = () => {
            if (
              curAuctionPrice &&
              lockedPriceForRound &&
              trySettle &&
              isScaledBidPriceHigher(
                bidScaling,
                curAuctionPrice,
                lockedPriceForRound,
              )
            ) {
              return helper.settle(seat, want);
            }
            return AmountMath.makeEmptyFromAmount(want);
          };
          const collateralSold = settleIfPricesDefined();

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

          helper.publishBookData();
        },
        publishBookData() {
          const { state } = this;

          const allocation = state.collateralSeat.getCurrentAllocation();
          const curCollateral =
            'Collateral' in allocation
              ? allocation.Collateral
              : makeEmpty(state.collateralBrand);

          const collateralAvailable = state.startCollateral
            ? AmountMath.subtract(state.startCollateral, curCollateral)
            : null;

          const bookData = harden({
            startPrice: state.lockedPriceForRound,
            startProceedsGoal: state.startProceedsGoal,
            remainingProceedsGoal: state.remainingProceedsGoal,
            proceedsRaised: allocation.Currency,
            startCollateral: state.startCollateral,
            collateralAvailable,
            currentPriceLevel: state.curAuctionPrice,
          });
          state.bookDataPublisher.publish(bookData);
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
          const { state, facets } = this;
          trace('add assets', { assetAmount, proceedsGoal });
          const { collateralBrand, collateralSeat, startProceedsGoal } = state;

          // When adding assets, the new ratio of totalCollectionGoal to collateral
          // allocation will be the larger of the existing ratio and the ratio
          // implied by the new deposit. Add the new collateral and raise
          // startProceedsGoal so it's proportional to the new ratio. This can
          // result in raising more currency than one depositor wanted, but
          // that's better than not selling as much as the other desired.

          const allocation = collateralSeat.getCurrentAllocation();
          const curCollateral =
            'Collateral' in allocation
              ? allocation.Collateral
              : makeEmpty(collateralBrand);

          // when neither proceedsGoal nor startProceedsGoal is defined, we don't need an
          // update and the call immediately below won't invoke this function.
          const calcTargetRatio = () => {
            if (startProceedsGoal && !proceedsGoal) {
              return makeRatioFromAmounts(startProceedsGoal, curCollateral);
            } else if (!startProceedsGoal && proceedsGoal) {
              return makeRatioFromAmounts(proceedsGoal, assetAmount);
            } else if (startProceedsGoal && proceedsGoal) {
              const curRatio = makeRatioFromAmounts(
                startProceedsGoal,
                AmountMath.add(curCollateral, assetAmount),
              );
              const newRatio = makeRatioFromAmounts(proceedsGoal, assetAmount);
              return ratioGTE(newRatio, curRatio) ? newRatio : curRatio;
            }

            throw Fail`calcTargetRatio called with !remainingProceedsGoal && !proceedsGoal`;
          };

          if (proceedsGoal || startProceedsGoal) {
            const nextProceedsGoal = ceilMultiplyBy(
              AmountMath.add(curCollateral, assetAmount),
              calcTargetRatio(),
            );

            if (state.remainingProceedsGoal !== null) {
              const incrementToGoal = state.startProceedsGoal
                ? AmountMath.subtract(nextProceedsGoal, state.startProceedsGoal)
                : nextProceedsGoal;

              state.remainingProceedsGoal = state.remainingProceedsGoal
                ? AmountMath.add(state.remainingProceedsGoal, incrementToGoal)
                : incrementToGoal;
            }

            state.startProceedsGoal = nextProceedsGoal;
          }

          state.startCollateral = state.startCollateral
            ? AmountMath.add(state.startCollateral, assetAmount)
            : assetAmount;
          facets.helper.publishBookData();

          atomicRearrange(
            zcf,
            harden([[sourceSeat, collateralSeat, { Collateral: assetAmount }]]),
          );
        },
        /** @type {(reduction: Ratio) => void} */
        settleAtNewRate(reduction) {
          const { state, facets } = this;

          trace('settleAtNewRate', reduction);
          const { lockedPriceForRound, priceBook, scaledBidBook } = state;
          lockedPriceForRound !== null ||
            Fail`price must be locked before auction starts`;
          assert(lockedPriceForRound);

          state.curAuctionPrice = multiplyRatios(
            reduction,
            lockedPriceForRound,
          );
          // extract after it's set in state
          const { curAuctionPrice } = state;

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

          const { remainingProceedsGoal } = state;
          const { helper } = facets;
          for (const [key, seatRecord] of prioritizedOffers) {
            const { seat, price: p, wanted, exitAfterBuy } = seatRecord;
            if (
              remainingProceedsGoal &&
              AmountMath.isEmpty(remainingProceedsGoal)
            ) {
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

          facets.helper.publishBookData();
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
          lockedPriceForRound !== null ||
            Fail`lockedPriceForRound must be set before each round`;
          assert(lockedPriceForRound);

          trace('set startPrice', lockedPriceForRound);
          this.state.remainingProceedsGoal = this.state.startProceedsGoal;
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
          const { exitAfterBuy } = bidSpec;
          if ('offerPrice' in bidSpec) {
            return helper.acceptPriceOffer(
              seat,
              bidSpec.offerPrice,
              bidSpec.want,
              {
                trySettle,
                exitAfterBuy,
              },
            );
          } else if ('offerBidScaling' in bidSpec) {
            return helper.acceptScaledBidOffer(
              seat,
              bidSpec.offerBidScaling,
              bidSpec.want,
              {
                trySettle,
                exitAfterBuy,
              },
            );
          } else {
            throw Fail`Offer was neither a price nor a scaled bid`;
          }
        },
        getSeats() {
          const { collateralSeat, currencySeat } = this.state;
          return { collateralSeat, currencySeat };
        },
        exitAllSeats() {
          const { priceBook, scaledBidBook } = this.state;
          priceBook.exitAllSeats();
          scaledBidBook.exitAllSeats();
        },
        endAuction() {
          const { state } = this;

          state.startCollateral = AmountMath.makeEmpty(state.collateralBrand);

          state.lockedPriceForRound = null;
          state.curAuctionPrice = null;
          state.remainingProceedsGoal = null;
          state.startProceedsGoal = null;
        },
        getDataUpdates() {
          return this.state.bookDataSubscriber;
        },
        getPublicTopics() {
          return {
            bookData: makePublicTopic(
              'Auction schedule',
              this.state.bookDataSubscriber,
              this.state.node,
            ),
          };
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

  return (cur, col, priceAuthority, pubKit, marshaller, node) =>
    makeAuctionBookKit(cur, col, priceAuthority, pubKit, marshaller, node).self;
};
harden(prepareAuctionBook);

/** @typedef {ReturnType<ReturnType<typeof prepareAuctionBook>>} AuctionBook */
