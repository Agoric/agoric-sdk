import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { ExecutionContext, TestFn } from 'ava';
import { ScheduleNotification } from '@agoric/inter-protocol/src/auction/scheduler.js';
import { NonNullish } from '@agoric/assert/src/assert.js';
import { TimeMath } from '@agoric/time/src/timeMath.js';
import { TimestampRecord } from '@agoric/time/src/types';
import { EconomyBootstrapSpace } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import {
  ensureVaultCollateral,
  LiquidationSetup,
  LiquidationTestContext,
  makeLiquidationTestContext,
  scale6,
} from '../../tools/liquidation.ts';

export type LiquidationOutcome = {
  reserve: {
    allocations: Record<string, number>;
    shortfall: number;
  };
  vaults: {
    locked: number;
  }[];
};

const test = anyTest as TestFn<LiquidationTestContext>;

type AnyFunction = (...args: any[]) => any;

//#region Product spec
const setup: LiquidationSetup = {
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
};

const outcome: LiquidationOutcome = {
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
};
//#endregion

const runAuction = async (runUtils, advanceTimeBy) => {
  const { EV } = runUtils;
  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const { liveAuctionSchedule } = await EV(
    auctioneerKit.publicFacet,
  ).getSchedules();

  await advanceTimeBy(3 * Number(liveAuctionSchedule.steps), 'minutes');

  return liveAuctionSchedule;
};

const startAuction = async (t: ExecutionContext<LiquidationTestContext>) => {
  const { readLatest, advanceTimeTo } = t.context;

  const scheduleNotification: ScheduleNotification = readLatest(
    'published.auction.schedule',
  );

  await advanceTimeTo(NonNullish(scheduleNotification.nextStartTime));
};

const addNewVaults = async ({
  t,
  collateralBrandKey,
  base,
}: {
  t: ExecutionContext<LiquidationTestContext>;
  collateralBrandKey: string;
  base: number;
}) => {
  const { walletFactoryDriver, priceFeedDrivers, placeBids } = t.context;

  await priceFeedDrivers[collateralBrandKey].setPrice(setup.price.starting);
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

  await placeBids(collateralBrandKey, 'agoric1buyer', setup, base);
  await priceFeedDrivers[collateralBrandKey].setPrice(setup.price.trigger);
  await startAuction(t);
};

const initVaults = async ({
  t,
  collateralBrandKey,
  managerIndex,
}: {
  t: ExecutionContext<LiquidationTestContext>;
  collateralBrandKey: string;
  managerIndex: number;
}) => {
  const { setupVaults, placeBids, priceFeedDrivers, readLatest } = t.context;

  const metricsPath = `published.vaultFactory.managers.manager${managerIndex}.metrics`;

  await setupVaults(collateralBrandKey, managerIndex, setup);
  await placeBids(collateralBrandKey, 'agoric1buyer', setup);

  await priceFeedDrivers[collateralBrandKey].setPrice(setup.price.trigger);
  await startAuction(t);

  t.like(readLatest(metricsPath), {
    numActiveVaults: 0,
    numLiquidatingVaults: setup.vaults.length,
    liquidatingCollateral: {
      value: scale6(setup.auction.start.collateral),
    },
    liquidatingDebt: { value: scale6(setup.auction.start.debt) },
    lockedQuote: null,
  });
};

test.before(async t => {
  t.context = await makeLiquidationTestContext(t);
});

const checkVisibility = async ({
  t,
  managerIndex,
  setupCallback,
  base = 0,
}: {
  t: ExecutionContext<LiquidationTestContext>;
  managerIndex: number;
  setupCallback: AnyFunction;
  base?: number;
}) => {
  const { readLatest, advanceTimeBy, runUtils } = t.context;

  await setupCallback();

  const { startTime, startDelay, endTime } = await runAuction(
    runUtils,
    advanceTimeBy,
  );
  const nominalStart: Timestamp = TimeMath.subtractAbsRel(
    startTime,
    startDelay,
  ) as TimestampRecord;
  t.log(nominalStart);

  const visibilityPath = `published.vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart.absValue.toString()}`;
  const preAuction = readLatest(`${visibilityPath}.vaults.preAuction`);
  const postAuction = readLatest(`${visibilityPath}.vaults.postAuction`);
  const auctionResult = readLatest(`${visibilityPath}.auctionResult`);

  const expectedPreAuction: [
    string,
    {
      collateralAmount: { value: bigint };
      debtAmount: { value: bigint };
    },
  ][] = [];
  for (let i = 0; i < setup.vaults.length; i += 1) {
    expectedPreAuction.push([
      `vault${base + i}`,
      {
        collateralAmount: { value: scale6(setup.vaults[i].atom) },
        debtAmount: { value: scale6(setup.vaults[i].debt) },
      },
    ]);
  }
  t.like(preAuction, expectedPreAuction);

  const expectedPostAuction: [
    string,
    { Collateral?: { value: bigint }; Minted?: { value: bigint } },
  ][] = [];
  // Iterate from the end because we expect the post auction vaults
  // in best to worst order.
  for (let i = outcome.vaults.length - 1; i >= 0; i -= 1) {
    expectedPostAuction.push([
      `vault${base + i}`,
      { Collateral: { value: scale6(outcome.vaults[i].locked) } },
    ]);
  }
  t.like(postAuction, expectedPostAuction);

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
  });

  t.log('preAuction', preAuction);
  t.log('postAuction', postAuction);
  t.log('auctionResult', auctionResult);
};

/**
 * @file In this file we test the below scenario:
 * - Alice opens a vault
 * - Alice gets liquidated
 * - Visibility data correctly observed in storage
 * - Vault factory gets restarted
 * - An auction starts with no vaults to liquidate
 * - No unnecessary storage node is created when `liquidateVaults` is invoked with no vaults to liquidate
 * - Bob opens a vault
 * - Bob gets liquidated
 * - Visibility data correctly observed in storage
 */
test.serial('visibility-before-upgrade', async t => {
  await checkVisibility({
    t,
    managerIndex: 0,
    setupCallback: () =>
      initVaults({
        t,
        collateralBrandKey: 'ATOM',
        managerIndex: 0,
      }),
  });
});

test.serial('add-STARS-collateral', async t => {
  await ensureVaultCollateral('STARS', t);
  await t.context.setupStartingState({
    collateralBrandKey: 'STARS',
    managerIndex: 1,
    price: setup.price.starting,
  });
  t.pass(); // reached here without throws
});

test.serial('restart-vault-factory', async t => {
  const {
    runUtils: { EV },
  } = t.context;
  const vaultFactoryKit = await (EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  ) as EconomyBootstrapSpace['consume']['vaultFactoryKit']);

  // @ts-expect-error cast XXX missing from type
  const { privateArgs } = vaultFactoryKit;
  console.log('reused privateArgs', privateArgs, vaultFactoryKit);

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  t.log('awaiting VaultFactory restartContract');
  const upgradeResult = await EV(vfAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
});

test.serial('restart contractGovernor', async t => {
  const { EV } = t.context.runUtils;
  const vaultFactoryKit = await (EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  ) as EconomyBootstrapSpace['consume']['vaultFactoryKit']);

  const { governorAdminFacet } = vaultFactoryKit;
  // has no privateArgs of its own. the privateArgs.governed is only for the
  // contract startInstance. any changes to those privateArgs have to happen
  // through a restart or upgrade using the governed contract's adminFacet
  const privateArgs = undefined;

  t.log('awaiting CG restartContract');
  const upgradeResult =
    await EV(governorAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
});

test.serial('no-unnecessary-storage-nodes', async t => {
  const {
    runUtils: { EV },
    readLatest,
  } = t.context;
  const auctioneerKit = await EV.vat('bootstrap').consumeItem('auctioneerKit');
  const { nextAuctionSchedule } = await EV(
    auctioneerKit.publicFacet,
  ).getSchedules();
  t.log('nextAuctionSchedule', nextAuctionSchedule);
  await startAuction(t);

  const scheduleNotification = readLatest('published.auction.schedule');
  t.log('scheduleNotification', scheduleNotification);

  // Make sure the auction started properly
  t.is(
    nextAuctionSchedule.startTime.absValue,
    scheduleNotification.activeStartTime.absValue,
  );

  t.throws(
    () =>
      readLatest(
        `published.vaultFactory.managers.manager0.liquidations.${scheduleNotification.activeStartTime.absValue.toString()}`,
      ),
    {
      message: `no data for "published.vaultFactory.managers.manager0.liquidations.${scheduleNotification.activeStartTime.absValue.toString()}"`,
    },
  );
});

test.serial('visibility-after-upgrade', async t => {
  await checkVisibility({
    t,
    managerIndex: 0,
    setupCallback: () =>
      addNewVaults({
        t,
        collateralBrandKey: 'ATOM',
        base: setup.vaults.length,
      }),
    base: 3,
  });
});

test.serial('here-check-STARS-visibility', async t => {
  await checkVisibility({
    t,
    managerIndex: 1,
    setupCallback: () =>
      addNewVaults({
        t,
        collateralBrandKey: 'STARS',
        base: 0,
      }),
  });
});

test.serial('snapshot-storage', async t => {
  const { readLatest } = t.context;

  const buildSnapshotItem = (
    paths: string[],
    managerIndex: number,
    auctionTime: bigint,
  ) => {
    const basePath = `published.vaultFactory.managers.manager${managerIndex}.liquidations.${auctionTime}`;
    const item = {};
    for (const path of paths) {
      const exactPath = `${basePath}.${path}`;
      item[exactPath] = readLatest(exactPath);
    }
    t.snapshot(Object.entries(item));
  };

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    0,
    3600n,
  );

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    0,
    10800n,
  );

  buildSnapshotItem(
    ['vaults.preAuction', 'vaults.postAuction', 'auctionResult'],
    1,
    14400n,
  );
});
