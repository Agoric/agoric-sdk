/** @file Bootstrap test integration vaults with smart-wallet */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { SECONDS_PER_DAY } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeMarshal } from '@endo/marshal';
import {
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import type { TestFn } from 'ava';
import { ParamChangesOfferArgs } from '@agoric/inter-protocol/src/econCommitteeCharter.js';
import { makeWalletFactoryDriver } from './drivers.ts';
import { makeSwingsetTestKit } from './supports.ts';

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const likePayouts = (collateral, minted) => ({
  Collateral: {
    value: BigInt(collateral * 1_000_000),
  },
  Minted: {
    value: BigInt(minted * 1_000_000),
  },
});

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(
    t.log,
    'bundles/crowdfunding',
    {
      configSpecifier: '@agoric/vm-config/demo-crowdfunding-config.json',
    },
  );

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

  return { ...swingsetTestKit, agoricNamesRemotes, walletFactoryDriver };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test('metrics path', async t => {
  const { EV } = t.context.runUtils;
  const vaultFactoryKit =
    await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  const vfTopics = await EV(vaultFactoryKit.publicFacet).getPublicTopics();
  const vfMetricsPath = await EV.get(vfTopics.metrics).storagePath;
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');
});
