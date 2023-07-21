// @ts-check
/** @file Bootstrap test of restarting (almost) all vats */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeWalletFactoryDriver } from './drivers.js';
import { makeSwingsetTestKit } from './supports.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeTestContext>>
 * >}
 */
const test = anyTest;

// main/production config doesn't have initialPrice, upon which 'open vaults' depends
const PLATFORM_CONFIG = '@agoric/vats/decentral-itest-vaults-config.json';

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/vaults', {
    configSpecifier: PLATFORM_CONFIG,
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  await eventLoopIteration();

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

const walletAddr = 'agoric1a';

test.serial('open vault', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet(walletAddr);
  t.true(wd.isNew);

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open1',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open1', numWantsSatisfied: 1 },
  });
});

test.serial('run restart-vats proposal', async t => {
  const { controller, buildProposal } = t.context;

  t.log('building proposal');
  const proposal = await buildProposal({
    package: 'vats',
    packageScriptName: 'build:restart-vats-proposal',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
  };
  t.log({ bridgeMessage });
  const { EV } = t.context.runUtils;
  /** @type {ERef<import('../../src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  t.log('restart-vats proposal executed');
  t.pass(); // reached here without throws
});

test.serial('read metrics', async t => {
  const { EV } = t.context.runUtils;

  /**
   * @type {Awaited<
   *   import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']
   * >}
   */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const vfTopics = await EV(vaultFactoryKit.publicFacet).getPublicTopics();

  const vfMetricsPath = await EV.get(vfTopics.metrics).storagePath;
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');

  await t.throwsAsync(
    EV(vfTopics.metrics.subscriber).getUpdateSince(),
    undefined,
    'reconnecting subscriber not expected to work',
  );
});

test.serial('open second vault', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet(walletAddr);
  t.false(wd.isNew);

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open2',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open2', numWantsSatisfied: 1 },
  });
});
