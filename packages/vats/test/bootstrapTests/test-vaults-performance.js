// @ts-check
/**
 * @file Bootstrap stress test of vaults
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import v8 from 'node:v8';
import process from 'node:process';
import util from 'node:util';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { E } from '@endo/captp';
import engineGC from '@agoric/swingset-vat/src/lib-nodejs/engine-gc.js';

import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

const snapshotHeap = async () => {
  console.log('Snapshotting heap...');
  await eventLoopIteration();
  try {
    const t0 = performance.now();
    engineGC();
    const t1 = performance.now();
    const memoryUsage = process.memoryUsage();
    const t2 = performance.now();
    const heapStats = v8.getHeapStatistics();
    const t3 = performance.now();

    const heapSnapshot = `Heap-${process.pid}-${Date.now()}.heapsnapshot`;
    // TODO write to a gitignored path
    v8.writeHeapSnapshot(heapSnapshot);
    const heapSnapshotTime = performance.now() - t3;

    return {
      memoryUsage,
      heapStats,
      heapSnapshot,
      statsTime: {
        forcedGc: t1 - t0,
        memoryUsage: t2 - t1,
        heapStats: t3 - t2,
        heapSnapshot: heapSnapshotTime,
      },
    };
  } catch (err) {
    console.warn('Failed to gather memory stats', err);
    return {};
  }
};

// presently all these tests use one collateral manager
const collateralBrandKey = 'IbcATOM';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t);

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for IbcATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.IbcATOM || Fail`IbcATOM missing from agoricNames`;
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

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after(async t => {
  // not strictly necessary but conveys that we keep the controller around for the whole test file
  await E(t.context.controller).shutdown();
});

const rows = [];
const perfObserver = new PerformanceObserver(items => {
  items.getEntries().forEach(entry => {
    // @ts-expect-error cast
    const { vaultsOpened, ...heapDetails } = entry.detail;
    console.log(`HEAP DETAILS at ${vaultsOpened} vaults: `, heapDetails);
    rows.push({
      vaultsOpened,
      duration: entry.duration,
      avgPerVault: entry.duration / vaultsOpened,
    });
  });
});
perfObserver.observe({ entryTypes: ['measure'], buffered: true });

test('stress vaults', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');

  /**
   * @param {number} i
   * @param {number} n
   */
  const openVault = async (i, n) => {
    assert.typeof(i, 'number');

    const offerId = `open-vault-${i}-of-${n}`;
    await wd.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: 0.5,
      giveCollateral: 1.0,
    });

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  };

  /** @param {number} n */
  const openN = async n => {
    t.log(`opening ${n} vaults`);
    const range = [...Array(n)].map((_, i) => i + 1);
    performance.mark(`start-open`);
    await Promise.all(range.map(i => openVault(i, n)));
    performance.mark(`end-open`);
    const snapshotDetails = await snapshotHeap();
    performance.measure(`open-${n}`, {
      start: 'start-open',
      end: 'end-open',
      detail: { ...snapshotDetails, vaultsOpened: n },
    });
  };

  // clear out for a baseline
  await snapshotHeap();
  await openN(1);
  await openN(10);
  // await openN(100);
  // await openN(1000);

  // let perfObserver get the last measurement
  await eventLoopIteration();

  t.is(rows.length, 4);

  console.table(rows);
  /* recent runs
defaultManagerType=local
┌─────────┬──────────────┬────────────────────┬────────────────────┐
│ (index) │ vaultsOpened │      duration      │    avgPerVault     │
├─────────┼──────────────┼────────────────────┼────────────────────┤
│    0    │      1       │ 205.27995777130127 │ 205.27995777130127 │
│    1    │      10      │ 2573.005709171295  │ 257.3005709171295  │
│    2    │     100      │ 28077.323541641235 │ 280.7732354164124  │
│    3    │     1000     │ 469665.9919581413  │ 469.6659919581413  │
└─────────┴──────────────┴────────────────────┴────────────────────┘

defaultManagerType=local
┌─────────┬──────────────┬────────────────────┬────────────────────┐
│ (index) │ vaultsOpened │      duration      │    avgPerVault     │
├─────────┼──────────────┼────────────────────┼────────────────────┤
│    0    │      1       │ 205.07262516021729 │ 205.07262516021729 │
│    1    │      10      │ 2340.7778749465942 │ 234.07778749465942 │
│    2    │     100      │ 28595.91691684723  │ 285.9591691684723  │
│    3    │     1000     │ 483244.96612501144 │ 483.24496612501144 │
└─────────┴──────────────┴────────────────────┴────────────────────┘

defaultManagerType=xs-worker
┌─────────┬──────────────┬───────────────────┬────────────────────┐
│ (index) │ vaultsOpened │     duration      │    avgPerVault     │
├─────────┼──────────────┼───────────────────┼────────────────────┤
│    0    │      1       │ 612.6521253585815 │ 612.6521253585815  │
│    1    │      10      │ 7219.540999889374 │ 721.9540999889374  │
│    2    │     100      │ 93713.79333305359 │ 937.1379333305359  │
│    3    │     1000     │ 2373681.821790695 │ 2373.6818217906953 │
└─────────┴──────────────┴───────────────────┴────────────────────┘
*/
});
