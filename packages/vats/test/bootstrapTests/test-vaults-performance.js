// @ts-check
/**
 * @file Bootstrap stress test of vaults
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import v8 from 'node:v8';
import process from 'node:process';

import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import engineGC from '@agoric/swingset-vat/src/lib-nodejs/engine-gc.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

let snapshotNum = 0;
const snapshotHeap = async step => {
  console.log(`Snapshotting heap at step ${step}...`);
  await eventLoopIteration();
  try {
    const t0 = performance.now();
    engineGC();
    const t1 = performance.now();
    const memoryUsage = process.memoryUsage();
    const t2 = performance.now();
    const heapStats = v8.getHeapStatistics();
    const t3 = performance.now();

    // process.pid increments so these will be lexically sorted pathnames.
    const heapSnapshot = `Heap-${process.pid}-${snapshotNum}-${step}.heapsnapshot`;
    snapshotNum += 1;

    v8.writeHeapSnapshot(heapSnapshot);
    const heapSnapshotTime = performance.now() - t3;

    console.log(`HEAP DETAILS at step${step} vaults: `, {
      memoryUsage,
      heapStats,
      heapSnapshot,
      statsTime: {
        forcedGc: t1 - t0,
        memoryUsage: t2 - t1,
        heapStats: t3 - t2,
        heapSnapshot: heapSnapshotTime,
      },
    });
  } catch (err) {
    console.warn('Failed to gather memory stats', err);
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
test.after.always(t => t.context.shutdown());

const rows = [];
const perfObserver = new PerformanceObserver(items => {
  items.getEntries().forEach(entry => {
    // @ts-expect-error cast
    const { vaultsOpened, round } = entry.detail;
    rows.push({
      name: `${round}:${vaultsOpened}`,
      duration: entry.duration,
      avgPerVault: entry.duration / vaultsOpened,
    });
  });
});
perfObserver.observe({ entryTypes: ['measure'] });

// NB: keep skipped in master because this is too long for CI
// UNTIL: https://github.com/Agoric/agoric-sdk/issues/7279
test.skip('stress vaults', async t => {
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

    const offerId = `open-vault-${i}-of-${n}-round-${r}`;
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
  await snapshotHeap('start');
  // 10 is enough to compare retention in heaps
  await openN(10, 1);
  await snapshotHeap('round1');
  await openN(10, 2);
  await snapshotHeap('round2');

  // let perfObserver get the last measurement
  await eventLoopIteration();

  console.table(rows);
});
