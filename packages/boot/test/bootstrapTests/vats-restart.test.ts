/** @file Bootstrap test of restarting (almost) all vats */
import type { TestFn } from 'ava';

import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import type { ScopedBridgeManager } from '@agoric/vats';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Fail } from '@endo/errors';

export const makeTestContext = async () => {
  console.time('DefaultTestContext');
  const storage = makeFakeStorageKit('bootstrapTests');

  const { handleBridgeSend } = makeMockBridgeKit({ storageKit: storage });
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
    fixupConfig: config => ({
      ...config,
      defaultManagerType: 'local', // FIXME: fix for xs-worker
    }),
    handleBridgeSend,
  });

  const { EV, queueAndRun } = swingsetTestKit;

  console.timeLog('DefaultTestContext', 'swingsetTestKit');

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    { EV, queueAndRun },
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

test.before(async t => {
  t.context = await makeTestContext();
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

test.serial('make IBC callbacks before upgrade', async t => {
  const { EV } = t.context;
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  console.log('E(ibc).makeCallbacks(m1)');
  const dummyBridgeManager = null as unknown as ScopedBridgeManager<any>;
  const callbacks = await EV(ibc).makeCallbacks(dummyBridgeManager);
  t.truthy(callbacks);
  t.context.shared.ibcCallbacks = callbacks;
});

test.serial('run restart-vats proposal', async t => {
  const { evaluateCoreProposal } = t.context;

  console.log('building proposal');
  await evaluateCoreProposal(
    await buildProposal('@agoric/builders/scripts/vats/restart-vats.js'),
  );

  t.pass(); // reached here without throws
});

test.serial('use IBC callbacks after upgrade', async t => {
  const {
    EV,
    shared: { ibcCallbacks },
  } = t.context;

  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  console.log('E(ibc).createHandlers(...)');

  const h = await EV(ibc).createHandlers(ibcCallbacks);
  console.log(h);
  t.truthy(h.protocolHandler, 'protocolHandler');
  t.truthy(h.bridgeHandler, 'bridgeHandler');
});

test.serial('read metrics', async t => {
  const { EV } = t.context;

  const vaultFactoryKit =
    await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

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
