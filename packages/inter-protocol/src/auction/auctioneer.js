import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/exported.js';

import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import {
  M,
  makeScalarBigMapStore,
  provide,
  provideDurableMapStore,
} from '@agoric/vat-data';
import { AmountMath } from '@agoric/ertp';
import {
  atomicRearrange,
  makeRatioFromAmounts,
  makeRatio,
  natSafeMath,
  floorMultiplyBy,
  provideEmptySeat,
} from '@agoric/zoe/src/contractSupport/index.js';
import { handleParamGovernance } from '@agoric/governance';
import { makeTracer } from '@agoric/internal';
import { FullProposalShape } from '@agoric/zoe/src/typeGuards.js';

import { makeAuctionBook } from './auctionBook.js';
import { BASIS_POINTS } from './util.js';
import { makeScheduler } from './scheduler.js';
import { auctioneerParamTypes } from './params.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail, quote: q } = assert;

const trace = makeTracer('Auction', false);

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

  const books = provideDurableMapStore(baggage, 'auctionBooks');
  const deposits = provideDurableMapStore(baggage, 'deposits');
  const brandToKeyword = provide(baggage, 'brandToKeyword', () =>
    makeScalarBigMapStore('deposits', {
      durable: true,
    }),
  );

  const reserveFunds = provideEmptySeat(zcf, baggage, 'collateral');

  const addDeposit = (seat, amount) => {
    const depositListForBrand = deposits.get(amount.brand);
    deposits.set(
      amount.brand,
      harden([...depositListForBrand, { seat, amount }]),
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
        const totCollDeposited = depositsForBrand.reduce((prev, { amount }) => {
          return AmountMath.add(prev, amount);
        }, AmountMath.makeEmpty(brand));

        const collatRaise = collateralSeat.getCurrentAllocation().Collateral;
        const currencyRaise = currencySeat.getCurrentAllocation().Currency;

        const collShare = makeRatioFromAmounts(collatRaise, totCollDeposited);
        const currShare = makeRatioFromAmounts(currencyRaise, totCollDeposited);
        /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
        const transfers = [];
        let currencyLeft = currencyRaise;
        let collateralLeft = collatRaise;

        // each depositor gets as share that equals their amount deposited
        // divided by the total deposited multplied by the currency and
        // collateral being distributed.
        for (const { seat, amount } of deposits.get(brand).values()) {
          const currPortion = floorMultiplyBy(amount, currShare);
          currencyLeft = AmountMath.subtract(currencyLeft, currPortion);
          const collPortion = floorMultiplyBy(amount, collShare);
          collateralLeft = AmountMath.subtract(collateralLeft, collPortion);
          transfers.push([currencySeat, seat, { Currency: currPortion }]);
          transfers.push([collateralSeat, seat, { Collateral: collPortion }]);
        }

        // TODO The leftovers should go to the reserve, and should be visible.
        const keyword = brandToKeyword.get(brand);
        transfers.push([
          currencySeat,
          reserveFunds,
          { Currency: currencyLeft },
        ]);
        transfers.push([
          collateralSeat,
          reserveFunds,
          { Collateral: collateralLeft },
          { [keyword]: collateralLeft },
        ]);
        atomicRearrange(zcf, harden(transfers));

        for (const { seat } of depositsForBrand) {
          seat.exit();
        }
      }
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
      currentDiscountRateBP,
      brands.Currency,
      BASIS_POINTS,
    );

    [...books.entries()].forEach(([_collateralBrand, book]) => {
      book.settleAtNewRate(discountRatio);
    });
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
      [...books.entries()].forEach(([_collateralBrand, book]) => {
        book.lockOraclePriceForRound();
        book.setStartingRate(
          makeBPRatio(currentDiscountRateBP, brands.Currency),
        );
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
        FullProposalShape,
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
      zcf.assertUniqueKeyword(kwd);
      !baggage.has(kwd) ||
        Fail`cannot add brand with keyword ${kwd}. it's in use`;

      zcf.saveIssuer(issuer, kwd);
      baggage.init(kwd, makeScalarBigMapStore(kwd, { durable: true }));
      const newBook = await makeAuctionBook(
        baggage.get(kwd),
        zcf,
        brands.Currency,
        collateralBrand,
        priceAuthority,
      );
      deposits.init(collateralBrand, harden([]));
      books.init(collateralBrand, newBook);
      brandToKeyword.init(collateralBrand, kwd);
    },
    // XXX if it's in public, doesn't also need to be in creatorFacet.
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

export const AuctionPFShape = M.remotable('Auction Public Facet');
