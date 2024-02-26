/* eslint-disable no-lone-blocks, no-await-in-loop */
// @ts-check
/**
 * @file Bootstrap test vaults liquidation visibility
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeLiquidationTestContext } from '../liquidation.js';
import { checkVisibility, startAuction } from './liquidation-test-utils.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeLiquidationTestContext>>>}
 */
const test = anyTest;

test.before(async t => {
  t.context = await makeLiquidationTestContext(
    t,
    '@agoric/vats/decentral-liq-visibility-vaults-config.json',
  );
});

test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test.serial('visibility-before-upgrade', async t => {
  await checkVisibility({
    t,
    collateralBrandKey: 'ATOM',
    managerIndex: 0,
  });
});

test.serial('restart-vault-factory', async t => {
  const {
    runUtils: { EV },
  } = t.context;
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

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
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const { governorAdminFacet } = vaultFactoryKit;
  // has no privateArgs of its own. the privateArgs.governed is only for the
  // contract startInstance. any changes to those privateArgs have to happen
  // through a restart or upgrade using the governed contract's adminFacet
  const privateArgs = undefined;

  t.log('awaiting CG restartContract');
  const upgradeResult = await EV(governorAdminFacet).restartContract(
    privateArgs,
  );
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
    collateralBrandKey: 'ATOM',
    base: 3,
  });

  t.pass();
});

test.serial('snapshot-storage', async t => {
  const { readLatest } = t.context;

  const buildSnapshotItem = (paths, managerIndex, auctionTime) => {
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
});
