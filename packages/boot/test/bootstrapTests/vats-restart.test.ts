/** @file Bootstrap test of restarting (almost) all vats */
import { createRequire } from 'node:module';

import type { TestFn } from 'ava';

import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { NonNullish } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import type { ScopedBridgeManager } from '@agoric/vats';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Fail } from '@endo/errors';

const { resolve: resolvePath } = createRequire(import.meta.url);

// main/production config doesn't have initialPrice, upon which 'open vaults' depends
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';

export const makeTestContext = async () => {
  console.time('DefaultTestContext');
  const storage = makeFakeStorageKit('bootstrapTests');
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configOverrides: NonNullish(
      await loadSwingsetConfigFile(resolvePath(PLATFORM_CONFIG)),
    ),
    mockBridgeReceiver: makeMockBridgeKit({ storageKit: storage }),
  });

  const { runNextBlock, runUtils } = swingsetTestKit;

  await runNextBlock();

  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  await eventLoopIteration();

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  const shared = { ibcCallbacks: undefined };

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    shared,
    storage,
    walletFactoryDriver,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

test.before(async t => (t.context = await makeTestContext()));
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

test.serial('make IBC callbacks before upgrade', async t => {
  const { EV } = t.context.runUtils;
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  t.log('E(ibc).makeCallbacks(m1)');
  const dummyBridgeManager = null as unknown as ScopedBridgeManager<any>;
  const callbacks = await EV(ibc).makeCallbacks(dummyBridgeManager);
  t.truthy(callbacks);
  t.context.shared.ibcCallbacks = callbacks;
});

test.serial('run restart-vats proposal', async t => {
  const { evaluateProposal } = t.context;

  t.log('building proposal');
  await evaluateProposal(
    await buildProposal('@agoric/builders/scripts/vats/restart-vats.js'),
  );

  t.pass(); // reached here without throws
});

test.serial('use IBC callbacks after upgrade', async t => {
  const { EV } = t.context.runUtils;
  const { ibcCallbacks } = t.context.shared;

  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  t.log('E(ibc).createHandlers(...)');

  const h = await EV(ibc).createHandlers(ibcCallbacks);
  t.log(h);
  t.truthy(h.protocolHandler, 'protocolHandler');
  t.truthy(h.bridgeHandler, 'bridgeHandler');
});

test.serial('read metrics', async t => {
  const { EV } = t.context.runUtils;

  const vaultFactoryKit =
    await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  const vfTopics = await EV(vaultFactoryKit.publicFacet).getPublicTopics();

  const vfMetricsPath = await EV.get(vfTopics.metrics).storagePath;
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');

  // TODO: fixme
  // await t.throwsAsync(
  //   EV(vfTopics.metrics.subscriber).getUpdateSince(),
  //   undefined,
  //   'reconnecting subscriber not expected to work',
  // );
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
