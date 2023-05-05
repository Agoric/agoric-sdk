// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/vaults');

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  const { readLatest } = swingsetTestKit;
  const readRewardPoolBalance = () => {
    return readLatest('published.vaultFactory.metrics').rewardPoolAllocation
      .Minted?.value;
  };
  const readCollateralMetrics = vaultManagerIndex =>
    readLatest(
      `published.vaultFactory.managers.manager${vaultManagerIndex}.metrics`,
    );

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    readCollateralMetrics,
    readRewardPoolBalance,
    walletFactoryDriver,
  };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

test.serial('open vault', async t => {
  console.time('open vault');

  t.falsy(t.context.readRewardPoolBalance());

  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });
  console.timeLog('open vault', 'executed offer');

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });

  t.is(t.context.readRewardPoolBalance(), 25000n);
  t.like(t.context.readCollateralMetrics(0), {
    numActiveVaults: 1,
    totalCollateral: { value: 9000000n },
    totalDebt: { value: 5025000n },
  });
  console.timeEnd('open vault');
});

test.serial('restart', async t => {
  const { EV } = t.context.runUtils;
  /** @type {Awaited<import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']>} */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  // @ts-expect-error cast XXX missing from type
  const { privateArgs } = vaultFactoryKit;
  console.log('reused privateArgs', privateArgs, vaultFactoryKit);

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  const keyMetrics = {
    numActiveVaults: 1,
    totalCollateral: { value: 9000000n },
    totalDebt: { value: 5025000n },
  };
  t.like(t.context.readCollateralMetrics(0), keyMetrics);
  t.log('awaiting restartContract');
  const upgradeResult = await EV(vfAdminFacet).restartContract(privateArgs);
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
  t.like(t.context.readCollateralMetrics(0), keyMetrics); // unchanged
});

test.serial('open vault 2', async t => {
  t.is(t.context.readRewardPoolBalance(), 25000n);

  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open2',
    collateralBrandKey,
    // small, won't be liquidated
    wantMinted: 5.0,
    giveCollateral: 100.0,
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'open2',
      numWantsSatisfied: 1,
    },
  });

  // balance goes up as before restart (doubles because same wantMinted)
  t.is(t.context.readRewardPoolBalance(), 50000n);
});

test.serial('adjust balance of vault opened before restart', async t => {
  const { walletFactoryDriver } = t.context;
  t.is(t.context.readRewardPoolBalance(), 50000n);

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1a');

  // unchanged since before restart
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open2', numWantsSatisfied: 1 },
  });

  t.log('adjust to brink of liquidation');
  await wd.executeOfferMaker(
    Offers.vaults.AdjustBalances,
    {
      offerId: 'adjust1',
      collateralBrandKey,
      // collateralization ratio allows: 63462857n
      wantMinted: 63.0 - 5.0,
    },
    'open1',
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'adjust1',
      numWantsSatisfied: 1,
    },
  });
  // sanity check
  t.like(t.context.readCollateralMetrics(0), {
    numActiveVaults: 2,
    numLiquidatingVaults: 0,
  });
});

// charge interest to force a liquidation and verify the shortfall is transferred
test.serial('force liquidation', async t => {
  const { advanceTime } = t.context;

  // advance a year to drive interest charges
  advanceTime(365, 'days');
  t.is(t.context.readRewardPoolBalance(), 340000n);
  t.like(t.context.readCollateralMetrics(0), {
    totalDebt: { value: 68340000n },
  });

  // liquidation will have been skipped because time skipped ahead
  // so now advance slowly
  await advanceTime(1, 'hours');
  await advanceTime(1, 'hours');
  // wait for it...
  t.like(t.context.readCollateralMetrics(0), {
    liquidatingCollateral: { value: 0n },
    liquidatingDebt: { value: 0n },
    numLiquidatingVaults: 0,
  });

  // POW
  await advanceTime(1, 'hours');
  t.like(t.context.readCollateralMetrics(0), {
    liquidatingCollateral: { value: 9000000n },
    liquidatingDebt: { value: 696421994n },
    numLiquidatingVaults: 1,
  });
});

// Will be part of https://github.com/Agoric/agoric-sdk/issues/5200
// For now upon restart the values are reset to the terms under which the contract started.
// When it comes time to upgrade the vaultFactory contract we'll have at least these options:
// 1. Make the new version allow some privateArgs to specify the parameter state.
// 2. Have EC disable offers until they can update parameters as needed.
test.todo('governance changes maintained after restart');
