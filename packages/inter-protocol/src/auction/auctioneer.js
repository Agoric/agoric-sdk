import '@agoric/governance/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import { AmountMath, AmountShape, BrandShape } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { BASIS_POINTS, makeTracer } from '@agoric/internal';
import { mustMatch } from '@agoric/store';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import { M, provideDurableMapStore } from '@agoric/vat-data';
import {
  atomicRearrange,
  floorMultiplyBy,
  floorDivideBy,
  makeRatio,
  makeRatioFromAmounts,
  natSafeMath,
  provideEmptySeat,
  ceilMultiplyBy,
  ceilDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { FullProposalShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import { makeNatAmountShape } from '../contractSupport.js';
import { makeBidSpecShape, prepareAuctionBook } from './auctionBook.js';
import { auctioneerParamTypes } from './params.js';
import { makeScheduler } from './scheduler.js';
import { AuctionState } from './util.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail, quote: q } = assert;
const { add, multiply } = natSafeMath;

const trace = makeTracer('Auction', false);

/**
 * @param {NatValue} rate
 * @param {Brand<'nat'>} currencyBrand
 * @param {Brand<'nat'>} collateralBrand
 */
const makeBPRatio = (rate, currencyBrand, collateralBrand = currencyBrand) =>
  makeRatioFromAmounts(
    AmountMath.make(currencyBrand, rate),
    AmountMath.make(collateralBrand, BASIS_POINTS),
  );

/**
 * Return a set of transfers for atomicRearrange() that distribute
 * collateralReturn and currencyRaise proportionally to each seat's deposited
 * amount. Any uneven split should be allocated to the reserve.
 *
 * @param {Amount} collateralReturn
 * @param {Amount} currencyRaise
 * @param {{seat: ZCFSeat, amount: Amount<'nat'>, toRaise: Amount<'nat'>}[]} deposits
 * @param {ZCFSeat} collateralSeat
 * @param {ZCFSeat} currencySeat
 * @param {string} collateralKeyword
 * @param {ZCFSeat} reserveSeat
 * @param {Brand} brand
 */
const distributeProportionalShares = (
  collateralReturn,
  currencyRaise,
  deposits,
  collateralSeat,
  currencySeat,
  collateralKeyword,
  reserveSeat,
  brand,
) => {
  const totalCollDeposited = deposits.reduce((prev, { amount }) => {
    return AmountMath.add(prev, amount);
  }, AmountMath.makeEmpty(brand));

  const collShare = makeRatioFromAmounts(collateralReturn, totalCollDeposited);
  const currShare = makeRatioFromAmounts(currencyRaise, totalCollDeposited);
  /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
  const transfers = [];
  let currencyLeft = currencyRaise;
  let collateralLeft = collateralReturn;

  // each depositor gets a share that equals their amount deposited
  // divided by the total deposited multiplied by the currency and
  // collateral being distributed.
  for (const { seat, amount } of deposits.values()) {
    const currPortion = floorMultiplyBy(amount, currShare);
    currencyLeft = AmountMath.subtract(currencyLeft, currPortion);
    const collPortion = floorMultiplyBy(amount, collShare);
    collateralLeft = AmountMath.subtract(collateralLeft, collPortion);
    transfers.push([currencySeat, seat, { Currency: currPortion }]);
    transfers.push([collateralSeat, seat, { Collateral: collPortion }]);
  }

  // TODO(#7117) The leftovers should go to the reserve, and should be visible.
  transfers.push([currencySeat, reserveSeat, { Currency: currencyLeft }]);

  // There will be multiple collaterals, so they can't all use the same keyword
  transfers.push([
    collateralSeat,
    reserveSeat,
    { Collateral: collateralLeft },
    { [collateralKeyword]: collateralLeft },
  ]);
  return transfers;
};

/**
 * Return a set of transfers for atomicRearrange() that distribute
 * collateralReturn and currencyRaise proportionally to each seat's deposited
 * amount. Any uneven split should be allocated to the reserve.
 *
 * This function is exported for testability, and is not expected to be used
 * outside the contract below.
 *
 * Some or all of the depositors may have specified a toRaise target.
 *  A if none did, return collateral and currency prorated to deposits.
 *  B if currencyRaise < totalToRaise everyone gets prorated amounts of both.
 *  C if currencyRaise matches totalToRaise, everyone gets the currency they
 *    asked for, plus enough collateral to reach the same proportional payout.
 *    If any depositor's toRaise limit exceeded their share of the total,
 *    we'll fall back to the first approach.
 *  D if currencyRaise > totalToRaise && all depositors specified a limit,
 *    all depositors get their toRaise first, then we distribute the
 *    remainder (collateral and currency) to get the same proportional payout.
 *  E if currencyRaise > totalToRaise && some depositors didn't specify a
 *    limit, depositors who did get their toRaise first, then we distribute
 *    the remainder (collateral and currency) to get the same proportional
 *    payout. If any depositor's toRaise limit exceeded their share of the
 *    total, we'll fall back as above.
 * Think of it this way: those who specified a limit want as much collateral
 * back as possible, consistent with raising a certain amount of currency. Those
 * who didn't specify a limit are trying to sell collateral, and would prefer to
 * have it all converted to currency.
 *
 * @param {Amount<'nat'>} collateralReturn
 * @param {Amount<'nat'>} currencyRaise
 * @param {{seat: ZCFSeat, amount: Amount<'nat'>, toRaise: Amount<'nat'>}[]} deposits
 * @param {ZCFSeat} collateralSeat
 * @param {ZCFSeat} currencySeat
 * @param {string} collateralKeyword
 * @param {ZCFSeat} reserveSeat
 * @param {Brand} brand
 */
export const distributeProportionalSharesWithLimits = (
  collateralReturn,
  currencyRaise,
  deposits,
  collateralSeat,
  currencySeat,
  collateralKeyword,
  reserveSeat,
  brand,
) => {
  trace('distributeProportionally with limits');
  // unmatched is the sum of the deposits by those who didn't specify toRaise
  const [collDeposited, totalToRaise, unmatchedDeposits] = deposits.reduce(
    (prev, { amount, toRaise }) => {
      const nextDeposit = AmountMath.add(prev[0], amount);
      let nextToRaise;
      let nextUnmatched;
      if (toRaise) {
        nextToRaise = AmountMath.add(toRaise, prev[1]);
        nextUnmatched = prev[2];
      } else {
        nextToRaise = prev[1];
        nextUnmatched = AmountMath.add(prev[2], amount);
      }
      return [nextDeposit, nextToRaise, nextUnmatched];
    },
    [
      AmountMath.makeEmpty(brand),
      AmountMath.makeEmptyFromAmount(currencyRaise),
      AmountMath.makeEmpty(brand),
    ],
  );

  const distributeProportionally = () =>
    distributeProportionalShares(
      collateralReturn,
      currencyRaise,
      deposits,
      collateralSeat,
      currencySeat,
      collateralKeyword,
      reserveSeat,
      brand,
    );

  // cases A and B
  if (
    AmountMath.isEmpty(totalToRaise) ||
    !AmountMath.isGTE(currencyRaise, totalToRaise)
  ) {
    return distributeProportionally();
  }

  // Calculate multiplier for collateral that gives total value each depositor
  // should get.
  //
  // The average price of collateral is CurrencyRaise / CollateralSold.
  // The value of Collateral is Price * collateralReturn.
  // The overall total value to be distributed is
  //     CurrencyRaise + collateralValue.
  // Each depositor should get currency and collateral that sum to the overall
  // total value multiplied by the ratio of that depositor's collateral
  // deposited to all the collateral deposited.
  //
  // To improve the resolution of the result, we only divide once, so we
  // multiply each depositor's collateral remaining by this expression.
  //
  //        collSold * currencyRaise  +  currencyRaise * collateralReturn
  //         -----------------------------------------------------------
  //                   collSold * totalCollDeposit
  //
  // If you do the dimension analysis, we'll multiply collateral by a ratio
  // representing currency/collateral.

  // average value of collateral is collateralSold / currencyRaise
  const collateralSold = AmountMath.subtract(collDeposited, collateralReturn);
  const numeratorValue = add(
    multiply(collateralSold.value, currencyRaise.value),
    multiply(collateralReturn.value, currencyRaise.value),
  );
  const denominatorValue = multiply(collateralSold.value, collDeposited.value);
  const totalValueRatio = makeRatioFromAmounts(
    AmountMath.make(currencyRaise.brand, numeratorValue),
    AmountMath.make(brand, denominatorValue),
  );

  const avgPrice = makeRatioFromAmounts(currencyRaise, collateralSold);

  // Allocate the toRaise to depositors who specified it. Add collateral to
  // reach their share. Then see what's left, and allocate it among the
  // remaining depositors. Escape to distributeProportionalShares if anything
  // doesn't work.
  /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
  const transfers = [];
  let currencyLeft = currencyRaise;
  let collateralLeft = collateralReturn;

  // case C
  if (AmountMath.isEqual(totalToRaise, currencyRaise)) {
    // each depositor gets a share that equals their amount deposited
    // multiplied by totalValueRatio computed above.

    for (const { seat, amount, toRaise } of deposits.values()) {
      const depositorValue = floorMultiplyBy(amount, totalValueRatio);
      if (!toRaise || AmountMath.isGTE(depositorValue, toRaise)) {
        let valueNeeded = depositorValue;
        if (toRaise && !AmountMath.isEmpty(toRaise)) {
          currencyLeft = AmountMath.subtract(currencyLeft, toRaise);
          transfers.push([currencySeat, seat, { Currency: toRaise }]);
          valueNeeded = AmountMath.subtract(depositorValue, toRaise);
        }

        const collateralToAdd = floorDivideBy(valueNeeded, avgPrice);
        collateralLeft = AmountMath.subtract(collateralLeft, collateralToAdd);
        transfers.push([collateralSeat, seat, { Collateral: collateralToAdd }]);
      } else {
        // This depositor asked for more than their share.
        // ignore `transfers` and distribute everything proportionally.
        return distributeProportionally();
      }
    }
  } else {
    // Cases D & E. CurrencyRaise > totalToRaise, so those who specified a limit
    // receive at least their target.

    const collateralValue = floorMultiplyBy(collateralReturn, avgPrice);
    const totalDistributableValue = AmountMath.add(
      currencyRaise,
      collateralValue,
    );
    // The share for those who specified a limit is proportional to their
    // collateral. ceiling because it's a lower limit on the restrictive branch
    const limitedShare = ceilMultiplyBy(
      AmountMath.subtract(collDeposited, unmatchedDeposits),
      makeRatioFromAmounts(totalDistributableValue, collDeposited),
    );

    // if totalToRaise + value of collateralReturn >= limitedShare then those
    // who specified a limit can get all the excess over their limit in
    // collateral. Others share whatever is left.
    // If totalToRaise + collateralReturn < limitedShare then those who
    // specified share all the collateral, and everyone gets currency to cover
    // the remainder of their share.
    const limitedGetMaxCollateral = AmountMath.isGTE(
      AmountMath.add(totalToRaise, collateralValue),
      limitedShare,
    );

    const calcNotLimitedCollateralShare = () => {
      if (limitedGetMaxCollateral) {
        // those who limited will get limitedShare - totalToRaise in collateral
        const ltdCollatValue = AmountMath.subtract(limitedShare, totalToRaise);
        const ltdCollatShare = ceilDivideBy(ltdCollatValue, avgPrice);
        // the unlimited will get the remainder of the collateral
        return AmountMath.subtract(collateralReturn, ltdCollatShare);
      } else {
        return AmountMath.makeEmpty(brand);
      }
    };
    const notLimitedCollateralShare = calcNotLimitedCollateralShare();

    for (const { seat, amount, toRaise } of deposits.values()) {
      const depositorValue = floorMultiplyBy(amount, totalValueRatio);

      debugger;

      const addRemainderInCurrency = collateralAdded => {
        const collateralVal = ceilMultiplyBy(collateralAdded, avgPrice);
        const valueNeeded = AmountMath.subtract(depositorValue, collateralVal);

        debugger;

        currencyLeft = AmountMath.subtract(currencyLeft, valueNeeded);
        transfers.push([currencySeat, seat, { Currency: valueNeeded }]);
      };

      if (!toRaise || AmountMath.isEmpty(toRaise)) {
        const collateralShare = floorMultiplyBy(
          notLimitedCollateralShare,
          makeRatioFromAmounts(amount, unmatchedDeposits),
        );
        collateralLeft = AmountMath.subtract(collateralLeft, collateralShare);
        addRemainderInCurrency(collateralShare);
        const collateralShareRecord = { Collateral: collateralShare };
        transfers.push([collateralSeat, seat, collateralShareRecord]);
      } else {
        if (limitedGetMaxCollateral) {
          currencyLeft = AmountMath.subtract(currencyLeft, toRaise);
          transfers.push([currencySeat, seat, { Currency: toRaise }]);

          const valueNeeded = AmountMath.subtract(depositorValue, toRaise);
          const collateralToAdd = floorDivideBy(valueNeeded, avgPrice);
          collateralLeft = AmountMath.subtract(collateralLeft, collateralToAdd);
          transfers.push([
            collateralSeat,
            seat,
            { Collateral: collateralToAdd },
          ]);
        } else {
          // There's not enough collateral to completely cover the gap above
          // toRaise, so each depositor gets a proportional share of
          // collateralReturn plus enough currency to reach their share.
          const collateralShare = floorMultiplyBy(
            collateralReturn,
            makeRatioFromAmounts(amount, collDeposited),
          );
          collateralLeft = AmountMath.subtract(collateralLeft, collateralShare);
          addRemainderInCurrency(collateralShare);
          const collateralShareRecord = { Collateral: collateralShare };
          transfers.push([collateralSeat, seat, collateralShareRecord]);
        }
      }
    }
  }

  // TODO(#7117) The leftovers should go to the reserve, and should be visible.
  transfers.push([currencySeat, reserveSeat, { Currency: currencyLeft }]);

  // There will be multiple collaterals, so they can't all use the same keyword
  transfers.push([
    collateralSeat,
    reserveSeat,
    { Collateral: collateralLeft },
    { [collateralKeyword]: collateralLeft },
  ]);
  return transfers;
};

/**
 * @param {ZCF<GovernanceTerms<typeof auctioneerParamTypes> & {
 *   timerService: import('@agoric/time/src/types').TimerService,
 *   priceAuthority: PriceAuthority
 * }>} zcf
 * @param {{
 *   initialPoserInvitation: Invitation,
 *   storageNode: StorageNode,
 *   marshaller: Marshaller
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { brands, timerService: timer, priceAuthority } = zcf.getTerms();
  timer || Fail`Timer must be in Auctioneer terms`;
  const timerBrand = await E(timer).getTimerBrand();

  const currencyAmountShape = { brand: brands.Currency, value: M.nat() };

  /** @type {MapStore<Brand, import('./auctionBook.js').AuctionBook>} */
  const books = provideDurableMapStore(baggage, 'auctionBooks');
  /** @type {MapStore<Brand, Array<{ seat: ZCFSeat, amount: Amount<'nat'>, toRaise: Amount<'nat'>}>>} */
  const deposits = provideDurableMapStore(baggage, 'deposits');
  /** @type {MapStore<Brand, Keyword>} */
  const brandToKeyword = provideDurableMapStore(baggage, 'brandToKeyword');

  const reserveFunds = provideEmptySeat(zcf, baggage, 'collateral');

  const makeAuctionBook = prepareAuctionBook(baggage, zcf);

  /**
   * @param {ZCFSeat} seat
   * @param {Amount<'nat'>} amount
   * @param {Amount<'nat'>} toRaise
   */
  const addDeposit = (seat, amount, toRaise) => {
    appendToStoredArray(
      deposits,
      amount.brand,
      harden({ seat, amount, toRaise }),
    );
  };

  // Called "discount" rate even though it can be above or below 100%.
  /** @type {NatValue} */
  let currentDiscountRateBP;

  const distributeProceeds = () => {
    for (const brand of deposits.keys()) {
      const book = books.get(brand);
      const { collateralSeat, currencySeat } = book.getSeats();

      const depositsForBrand = deposits.get(brand);
      if (depositsForBrand.length === 1) {
        // send it all to the one
        const liqSeat = depositsForBrand[0].seat;

        atomicRearrange(
          zcf,
          harden([
            [collateralSeat, liqSeat, collateralSeat.getCurrentAllocation()],
            [currencySeat, liqSeat, currencySeat.getCurrentAllocation()],
          ]),
        );
        liqSeat.exit();
        deposits.set(brand, []);
      } else if (depositsForBrand.length > 1) {
        const collProceeds = collateralSeat.getCurrentAllocation().Collateral;
        const currProceeds = currencySeat.getCurrentAllocation().Currency;
        const transfers = distributeProportionalSharesWithLimits(
          collProceeds,
          currProceeds,
          depositsForBrand,
          collateralSeat,
          currencySeat,
          brandToKeyword.get(brand),
          reserveFunds,
          brand,
        );
        atomicRearrange(zcf, harden(transfers));

        for (const { seat } of depositsForBrand) {
          seat.exit();
        }
        deposits.set(brand, []);
      }
    }
  };

  const { augmentPublicFacet, creatorMixin, makeFarGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      auctioneerParamTypes,
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  const tradeEveryBook = () => {
    const bidScalingRatio = makeRatio(
      currentDiscountRateBP,
      brands.Currency,
      BASIS_POINTS,
    );

    for (const book of books.values()) {
      book.settleAtNewRate(bidScalingRatio);
    }
  };

  const driver = Far('Auctioneer', {
    reducePriceAndTrade: () => {
      trace('reducePriceAndTrade');

      natSafeMath.isGTE(currentDiscountRateBP, params.getDiscountStep()) ||
        Fail`rates must fall ${currentDiscountRateBP}`;

      currentDiscountRateBP = natSafeMath.subtract(
        currentDiscountRateBP,
        params.getDiscountStep(),
      );

      tradeEveryBook();
    },
    finalize: () => {
      trace('finalize');
      distributeProceeds();
    },
    startRound() {
      trace('startRound');

      currentDiscountRateBP = params.getStartingRate();
      for (const book of books.values()) {
        book.lockOraclePriceForRound();
        book.setStartingRate(
          makeBPRatio(currentDiscountRateBP, brands.Currency),
        );
      }

      tradeEveryBook();
    },
  });

  // @ts-expect-error types are correct. How to convince TS?
  const scheduler = await makeScheduler(driver, timer, params, timerBrand);
  const isActive = () => scheduler.getAuctionState() === AuctionState.ACTIVE;

  /**
   * @param {ZCFSeat} zcfSeat
   * @param {{ toRaise: Amount<'nat'>}} offerArgs
   */
  const depositOfferHandler = (zcfSeat, offerArgs) => {
    const toRaiseMatcher = M.or(undefined, { toRaise: currencyAmountShape });
    mustMatch(offerArgs, harden(toRaiseMatcher));
    const { Collateral: collateralAmount } = zcfSeat.getCurrentAllocation();
    const book = books.get(collateralAmount.brand);
    trace(`deposited ${q(collateralAmount)} toRaise: ${q(offerArgs?.toRaise)}`);

    book.addAssets(collateralAmount, zcfSeat, offerArgs?.toRaise);
    addDeposit(zcfSeat, collateralAmount, offerArgs?.toRaise);
    return 'deposited';
  };

  const getDepositInvitation = () =>
    zcf.makeInvitation(
      depositOfferHandler,
      'deposit Collateral',
      undefined,
      M.splitRecord({ give: { Collateral: AmountShape } }),
    );

  const bidProposalShape = M.splitRecord(
    {
      give: { Currency: makeNatAmountShape(brands.Currency) },
    },
    {
      want: M.or({ Collateral: AmountShape }, {}),
      exit: FullProposalShape.exit,
    },
  );

  const publicFacet = augmentPublicFacet(
    harden({
      /** @param {Brand<'nat'>} collateralBrand */
      makeBidInvitation(collateralBrand) {
        mustMatch(collateralBrand, BrandShape);
        books.has(collateralBrand) ||
          Fail`No book for brand ${collateralBrand}`;
        const bidSpecShape = makeBidSpecShape(brands.Currency, collateralBrand);
        /**
         * @param {ZCFSeat} zcfSeat
         * @param {import('./auctionBook.js').BidSpec} bidSpec
         */
        const newBidHandler = (zcfSeat, bidSpec) => {
          // xxx consider having Zoe guard the offerArgs with a provided shape
          mustMatch(bidSpec, bidSpecShape);
          const auctionBook = books.get(collateralBrand);
          auctionBook.addOffer(bidSpec, zcfSeat, isActive());
          return 'Your bid has been accepted';
        };

        return zcf.makeInvitation(
          newBidHandler,
          'new bid',
          {},
          bidProposalShape,
        );
      },
      getSchedules() {
        return E(scheduler).getSchedule();
      },
      getDepositInvitation,
      ...params,
    }),
  );

  const creatorFacet = makeFarGovernorFacet(
    Far('Auctioneer creatorFacet', {
      /**
       * @param {Issuer} issuer
       * @param {Keyword} kwd
       */
      async addBrand(issuer, kwd) {
        zcf.assertUniqueKeyword(kwd);
        !baggage.has(kwd) ||
          Fail`cannot add brand with keyword ${kwd}. it's in use`;
        const { brand } = await zcf.saveIssuer(issuer, kwd);

        const newBook = await makeAuctionBook(
          brands.Currency,
          brand,
          priceAuthority,
        );

        // These three store.init() calls succeed or fail atomically
        deposits.init(brand, harden([]));
        books.init(brand, newBook);
        brandToKeyword.init(brand, kwd);
      },
      /** @returns {Promise<import('./scheduler.js').FullSchedule>} */
      getSchedule() {
        return E(scheduler).getSchedule();
      },
      ...creatorMixin,
    }),
  );

  return { publicFacet, creatorFacet };
};

/** @typedef {ContractOf<typeof start>} AuctioneerContract */
/** @typedef {AuctioneerContract['publicFacet']} AuctioneerPublicFacet */
/** @typedef {AuctioneerContract['creatorFacet']} AuctioneerCreatorFacet */
// xxx the governance types should handle this automatically
/** @typedef {ReturnType<AuctioneerContract['creatorFacet']['getLimitedCreatorFacet']>} AuctioneerLimitedCreatorFacet */

export const AuctionPFShape = M.remotable('Auction Public Facet');
