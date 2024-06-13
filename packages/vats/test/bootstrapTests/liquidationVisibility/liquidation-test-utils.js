/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test vaults liquidation visibility
 */
import { NonNullish } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { TimeMath } from '@agoric/time';
import { scale6 } from '../liquidation.js';

//#region Product spec
const setup = /** @type {const} */ ({
  // Vaults are sorted in the worst debt/col ratio to the best
  vaults: [
    {
      atom: 15,
      ist: 105,
      debt: 105.525,
    },
    {
      atom: 15,
      ist: 103,
      debt: 103.515,
    },
    {
      atom: 15,
      ist: 100,
      debt: 100.5,
    },
  ],
  bids: [
    {
      give: '80IST',
      discount: 0.1,
    },
    {
      give: '90IST',
      price: 9.0,
    },
    {
      give: '150IST',
      discount: 0.15,
    },
  ],
  price: {
    starting: 12.34,
    trigger: 9.99,
  },
  auction: {
    start: {
      collateral: 45,
      debt: 309.54,
    },
    end: {
      collateral: 9.659301,
      debt: 0,
    },
  },
});

const outcome = /** @type {const} */ ({
  reserve: {
    allocations: {
      ATOM: 0.309852,
      STARS: 0.309852,
    },
    shortfall: 0,
  },
  // The order in the setup preserved
  vaults: [
    {
      locked: 2.846403,
    },
    {
      locked: 3.0779,
    },
    {
      locked: 3.425146,
    },
  ],
});
//#endregion

const placeBids = async (
  t,
  collateralBrandKey,
  buyerWalletAddress,
  base = 0, // number of bids made before
) => {
  const { agoricNamesRemotes, walletFactoryDriver, readLatest } = t.context;

  const buyer = await walletFactoryDriver.provideSmartWallet(
    buyerWalletAddress,
  );

  await buyer.sendOffer(
    Offers.psm.swap(
      agoricNamesRemotes,
      agoricNamesRemotes.instance['psm-IST-USDC_axl'],
      {
        offerId: `print-${collateralBrandKey}-ist`,
        wantMinted: 1_000,
        pair: ['IST', 'USDC_axl'],
      },
    ),
  );

  const maxBuy = `10000${collateralBrandKey}`;

  for (let i = 0; i < setup.bids.length; i += 1) {
    const offerId = `${collateralBrandKey}-bid${i + 1 + base}`;
    // bids are long-lasting offers so we can't wait here for completion
    await buyer.sendOfferMaker(Offers.auction.Bid, {
      offerId,
      ...setup.bids[i],
      maxBuy,
    });
    t.like(readLatest(`published.wallet.${buyerWalletAddress}`), {
      status: {
        id: offerId,
        result: 'Your bid has been accepted',
        payouts: undefined,
      },
    });
  }
};

const runAuction = async (runUtils, advanceTimeBy) => {
  const { EV } = runUtils;
  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const { liveAuctionSchedule } = await EV(
    auctioneerKit.publicFacet,
  ).getSchedules();

  await advanceTimeBy(3 * Number(liveAuctionSchedule.steps), 'minutes');

  return liveAuctionSchedule;
};

export const startAuction = async t => {
  const { readLatest, advanceTimeTo } = t.context;

  const scheduleNotification = readLatest('published.auction.schedule');

  await advanceTimeTo(NonNullish(scheduleNotification.nextStartTime));
};

const addNewVaults = async ({ t, collateralBrandKey, base = 0 }) => {
  const { walletFactoryDriver, priceFeedDriver, advanceTimeBy } = t.context;
  await advanceTimeBy(1, 'seconds');

  await priceFeedDriver.setPrice(setup.price.starting);
  const minter = await walletFactoryDriver.provideSmartWallet('agoric1minter');

  for (let i = 0; i < setup.vaults.length; i += 1) {
    const offerId = `open-${collateralBrandKey}-vault${base + i}`;
    await minter.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: setup.vaults[i].ist,
      giveCollateral: setup.vaults[i].atom,
    });
    t.like(minter.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  }

  await placeBids(t, collateralBrandKey, 'agoric1buyer', base);
  await priceFeedDriver.setPrice(setup.price.trigger);
  await startAuction(t);
};

export const checkVisibility = async ({
  t,
  managerIndex,
  collateralBrandKey,
  base = 0,
}) => {
  const { readLatest, advanceTimeBy, runUtils } = t.context;

  await addNewVaults({ t, collateralBrandKey, base });

  const { startTime, startDelay, endTime } = await runAuction(
    runUtils,
    advanceTimeBy,
  );

  const nominalStart = TimeMath.subtractAbsRel(
    startTime.absValue,
    startDelay.relValue,
  );
  t.log(nominalStart);

  const visibilityPath = `published.vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart.toString()}`;
  const preAuction = readLatest(`${visibilityPath}.vaults.preAuction`);
  const postAuction = readLatest(`${visibilityPath}.vaults.postAuction`);
  const auctionResult = readLatest(`${visibilityPath}.auctionResult`);

  const expectedPreAuction = [];
  for (let i = 0; i < setup.vaults.length; i += 1) {
    expectedPreAuction.push([
      `vault${base + i}`,
      {
        collateralAmount: { value: scale6(setup.vaults[i].atom) },
        debtAmount: { value: scale6(setup.vaults[i].debt) },
      },
    ]);
  }
  t.like(
    Object.fromEntries(preAuction),
    Object.fromEntries(expectedPreAuction),
  );

  const expectedPostAuction = [];
  // Iterate from the end because we expect the post auction vaults
  // in best to worst order.
  for (let i = outcome.vaults.length - 1; i >= 0; i -= 1) {
    expectedPostAuction.push([
      `vault${base + i}`,
      { Collateral: { value: scale6(outcome.vaults[i].locked) } },
    ]);
  }
  t.like(
    Object.fromEntries(postAuction),
    Object.fromEntries(expectedPostAuction),
  );

  t.like(auctionResult, {
    collateralOffered: { value: scale6(setup.auction.start.collateral) },
    istTarget: { value: scale6(setup.auction.start.debt) },
    collateralForReserve: { value: scale6(outcome.reserve.allocations.ATOM) },
    shortfallToReserve: { value: 0n },
    mintedProceeds: { value: scale6(setup.auction.start.debt) },
    collateralSold: {
      value:
        scale6(setup.auction.start.collateral) -
        scale6(setup.auction.end.collateral),
    },
    collateralRemaining: { value: 0n },
    endTime: { absValue: endTime.absValue },
    startTime: { absValue: startTime.absValue },
  });

  t.log('preAuction', preAuction);
  t.log('postAuction', postAuction);
  t.log('auctionResult', auctionResult);
};
