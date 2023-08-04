// @ts-check
/** @file Bootstrap stress test of vaults */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import v8 from 'node:v8';
import process from 'node:process';
import fs from 'node:fs';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { makeSwingsetTestKit } from './supports.js';
import { makeWalletFactoryDriver } from './drivers.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeDefaultTestContext>>
 * >}
 */
const test = anyTest;

let snapshotNum = 0;
const collectStats = async (step, dumpHeap) => {
  await eventLoopIteration();
  try {
    const t0 = performance.now();
    engineGC();
    const t1 = performance.now();
    const memoryUsage = process.memoryUsage();
    const t2 = performance.now();
    const heapStats = v8.getHeapStatistics();
    const t3 = performance.now();

    const memStats = {
      memoryUsage,
      heapStats,
      statsTime: {
        forcedGcMs: t1 - t0,
        memoryUsageMs: t2 - t1,
        heapStatsMs: t3 - t2,
      },
    };

    if (dumpHeap) {
      console.log(`Snapshotting heap at step ${step}...`);

      // process.pid increments so these will be lexically sorted pathnames.
      const heapSnapshot = `Heap-${process.pid}-${snapshotNum}-${step}.heapsnapshot`;
      snapshotNum += 1;

      v8.writeHeapSnapshot(heapSnapshot);
      const heapSnapshotTime = performance.now() - t3;
      memStats.heapSnapshot = heapSnapshot;
      memStats.statsTime.heapSnapshot = heapSnapshotTime;
    }

    console.log(`Heap details at step ${step} vaults: `, memStats);
    return memStats;
  } catch (err) {
    console.warn('Failed to gather memory stats', err);
    return undefined;
  }
};

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t);

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

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => t.context.shutdown());

const rows = [];
const perfObserver = new PerformanceObserver(items => {
  for (const entry of items.getEntries()) {
    // @ts-expect-error cast
    const { vaultsOpened, round } = entry.detail;
    rows.push({
      name: `${round}:${vaultsOpened}`,
      durationMs: entry.duration,
      avgPerVaultMs: entry.duration / vaultsOpened,
    });
  }
});
perfObserver.observe({ entryTypes: ['measure'] });

const whereUrl = import.meta.url;
const sdkPathStart = whereUrl.lastIndexOf('agoric-sdk/');
const where = sdkPathStart > 0 ? whereUrl.substring(sdkPathStart) : whereUrl;

async function stressVaults(t, dumpHeap) {
  rows.length = 0;
  const dumpTag = dumpHeap ? '-with-dump' : '';
  const name = `stress-vaults${dumpTag}`;

  const { walletFactoryDriver } = t.context;
  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');

  /**
   * @param {number} i
   * @param {number} n
   * @param {number} r
   */
  const openVault = async (i, n, r) => {
    assert.typeof(i, 'number');
    assert.typeof(n, 'number');
    assert.typeof(r, 'number');

    const offerId = `open-vault-${i}-of-${n}-round-${r}${dumpTag}`;
    await wd.executeOfferMaker(Offers.vaults.OpenVault, {
      offerId,
      collateralBrandKey,
      wantMinted: 5,
      giveCollateral: 1.0,
    });

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: { id: offerId, numWantsSatisfied: 1 },
    });
  };

  /**
   * @param {number} n
   * @param {number} r
   */
  const openN = async (n, r) => {
    t.log(`opening ${n} vaults`);
    const range = [...Array(n)].map((_, i) => i + 1);
    performance.mark(`start-open`);
    await Promise.all(range.map(i => openVault(i, n, r)));
    performance.mark(`end-open`);
    performance.measure(`open-${n}-round-${r}`, {
      start: 'start-open',
      end: 'end-open',
      detail: { vaultsOpened: n, round: r },
    });
  };

  // clear out for a baseline
  await collectStats('start', dumpHeap);
  // 10 is enough to compare retention in heaps
  await openN(10, 1);
  await collectStats('round1', dumpHeap);
  await openN(10, 2);
  const memStats = await collectStats('round2', dumpHeap);

  // let perfObserver get the last measurement
  await eventLoopIteration();

  const benchmarkReport = {
    ...rows[1],
    memStats,
    name,
    test: t.title,
    where,
  };
  fs.writeFileSync(
    `benchmark-${name}.json`,
    JSON.stringify(benchmarkReport, null, 2),
  );

  console.table(rows);
}

// Note: it is probably not useful to enable both of the two following benchmark
// tests at the same time.  Nothing bad per se will happen if you do, but it
// will take longer to run with no particular benefit resulting.  However, if you run
// both you *must* run them serially, so that their executions don't get
// comingled and mess up the numbers.

test.skip('stress vaults with heap snapshots', async t => {
  await stressVaults(t, true);
});

test.serial('stress vaults', async t => {
  await stressVaults(t, false);
});
