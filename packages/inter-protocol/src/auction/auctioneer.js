import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/exported.js';

import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { M, makeScalarBigMapStore, provide } from '@agoric/vat-data';
import { AmountMath } from '@agoric/ertp';
import {
  atomicRearrange,
  makeRatioFromAmounts,
  makeRatio,
  natSafeMath,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import { handleParamGovernance } from '@agoric/governance';
import { makeTracer } from '@agoric/internal';

import { makeAuctionBook } from './auctionBook.js';
import { BASIS_POINTS } from './util.js';
import { makeScheduler } from './scheduler.js';
import { auctioneerParamTypes } from './params.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail, quote: q } = assert;

const trace = makeTracer('Auction', true);

const makeBPRatio = (rate, currencyBrand, collateralBrand = currencyBrand) =>
  makeRatioFromAmounts(
    AmountMath.make(currencyBrand, rate),
    AmountMath.make(collateralBrand, 10000n),
  );

/**
 * @param {ZCF<GovernanceTerms<{
 *   StartFrequency: 'relativeTime',
 *   ClockStep: 'relativeTime',
 *   StartingRate: 'nat',
 *   lowestRate: 'nat',
 *   DiscountStep: 'nat',
 * }> & {timerService: import('@agoric/time/src/types').TimerService, priceAuthority: PriceAuthority}>} zcf
 * @param {{initialPoserInvitation: Invitation, storageNode: StorageNode, marshaller: Marshaller}} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { brands, timerService: timer, priceAuthority } = zcf.getTerms();
  timer || Fail`Timer must be in Auctioneer terms`;
  const timerBrand = await E(timer).getTimerBrand();

  const books = provide(baggage, 'auctionBooks', () =>
    makeScalarBigMapStore('orderedVaultStore', {
      durable: true,
    }),
  );
  const deposits = provide(baggage, 'deposits', () =>
    makeScalarBigMapStore('deposits', {
      durable: true,
    }),
  );
  const addDeposit = (seat, amount) => {
    if (deposits.has(amount.brand)) {
      const depositListForBrand = deposits.get(amount.brand);
      deposits.set(
        amount.brand,
        harden([...depositListForBrand, { seat, amount }]),
      );
    } else {
      deposits.init(amount.brand, harden([{ seat, amount }]));
    }
  };

  // could be above or below 100%.  in basis points
  let currentDiscountRate;

  const distributeProceeds = () => {
    // assert collaterals in map match known collaterals
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
          ]),
        );
        liqSeat.exit();
      } else {
        const totalDeposits = depositsForBrand.reduce((prev, { amount }) => {
          return AmountMath.add(prev, amount);
        }, AmountMath.makeEmpty(brand));
        const curCollateral =
          depositsForBrand[0].seat.getCurrentAllocation().Collateral;
        if (AmountMath.isEmpty(curCollateral)) {
          const currencyRaised = currencySeat.getCurrentAllocation().Currency;
          for (const { seat, amount } of deposits.get(brand).values()) {
            const payment = floorMultiplyBy(
              amount,
              makeRatioFromAmounts(currencyRaised, totalDeposits),
            );
            atomicRearrange(
              zcf,
              harden([[currencySeat, seat, { Currency: payment }]]),
            );
            seat.exit();
          }
          // TODO(cth) sweep away dust
        } else {
          Fail`Split up incomplete sale`;
        }
      }
    }
  };
  const releaseSeats = () => {
    for (const brand of deposits.keys()) {
      books.get(brand).exitAllSeats();
    }
  };

  const { publicMixin, creatorMixin, makeFarGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      // @ts-expect-error XXX How to type this?
      auctioneerParamTypes,
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  const tradeEveryBook = () => {
    const discountRatio = makeRatio(
      currentDiscountRate,
      brands.Currency,
      BASIS_POINTS,
    );

    [...books.entries()].forEach(([_collateralBrand, book]) => {
      book.settleAtNewRate(discountRatio);
    });
  };

  const driver = Far('Auctioneer', {
    descendingStep: () => {
      trace('descent');

      natSafeMath.isGTE(currentDiscountRate, params.getDiscountStep()) ||
        Fail`rates must fall ${currentDiscountRate}`;

      currentDiscountRate = natSafeMath.subtract(
        currentDiscountRate,
        params.getDiscountStep(),
      );

      tradeEveryBook();

      if (!natSafeMath.isGTE(currentDiscountRate, params.getDiscountStep())) {
        // end trading
      }
    },
    finalize: () => {
      trace('finalize');
      distributeProceeds();
      releaseSeats();
    },
    startRound() {
      trace('startRound');

      currentDiscountRate = params.getStartingRate();
      [...books.entries()].forEach(([_collateralBrand, book]) => {
        book.lockOraclePriceForRound();
        book.setStartingRate(makeBPRatio(currentDiscountRate, brands.Currency));
      });

      tradeEveryBook();
    },
  });

  // @ts-expect-error types are correct. How to convince TS?
  const scheduler = await makeScheduler(driver, timer, params, timerBrand);
  const depositOfferHandler = zcfSeat => {
    const { Collateral: collateralAmount } = zcfSeat.getCurrentAllocation();
    const book = books.get(collateralAmount.brand);
    trace(`deposited ${q(collateralAmount)}`);
    book.addAssets(collateralAmount, zcfSeat);
    addDeposit(zcfSeat, collateralAmount);
    return 'deposited';
  };

  const getDepositInvitation = () =>
    zcf.makeInvitation(depositOfferHandler, 'deposit Collateral');

  const publicFacet = Far('publicFacet', {
    getBidInvitation(collateralBrand) {
      const newBidHandler = (zcfSeat, bidSpec) => {
        if (books.has(collateralBrand)) {
          const auctionBook = books.get(collateralBrand);
          auctionBook.addOffer(bidSpec, zcfSeat, scheduler.getAuctionState());
          return 'Your offer has been received';
        } else {
          zcfSeat.exit(`No book for brand ${collateralBrand}`);
          return 'Your offer was refused';
        }
      };

      return zcf.makeInvitation(
        newBidHandler,
        'new bid',
        {},
        harden({
          give: AmountKeywordRecordShape,
          want: AmountKeywordRecordShape,
          // XXX is there a standard Exit Pattern?
          exit: M.any(),
        }),
      );
    },
    getSchedules() {
      return E(scheduler).getSchedule();
    },
    getDepositInvitation,
    ...publicMixin,
    ...params,
  });

  const limitedCreatorFacet = Far('creatorFacet', {
    async addBrand(issuer, collateralBrand, kwd) {
      if (!baggage.has(kwd)) {
        baggage.init(kwd, makeScalarBigMapStore(kwd, { durable: true }));
      }
      const newBook = await makeAuctionBook(
        baggage.get(kwd),
        zcf,
        brands.Currency,
        collateralBrand,
        priceAuthority,
      );
      zcf.saveIssuer(issuer, kwd);
      books.init(collateralBrand, newBook);
    },
    // TODO (cth) if it's in public, doesn't also need to be in creatorFacet.
    getDepositInvitation,
    getSchedule() {
      return E(scheduler).getSchedule();
    },
    ...creatorMixin,
  });

  const governorFacet = makeFarGovernorFacet(limitedCreatorFacet);

  return { publicFacet, creatorFacet: governorFacet };
};

/** @typedef {ContractOf<typeof start>} AuctioneerContract */
/** @typedef {AuctioneerContract['publicFacet']} AuctioneerPublicFacet */
/** @typedef {AuctioneerContract['creatorFacet']} AuctioneerCreatorFacet */
