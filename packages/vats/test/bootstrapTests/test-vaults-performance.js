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
import { E } from '@endo/captp';
import engineGC from '@agoric/swingset-vat/src/lib-nodejs/engine-gc.js';

import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

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

    const heapSnapshot = `Heap-${
      process.pid
    }-${Date.now()}-${step}.heapsnapshot`;
    // TODO write to a gitignored path
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
test.after(async t => {
  // not strictly necessary but conveys that we keep the controller around for the whole test file
  await E(t.context.controller).shutdown();
});

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
perfObserver.observe({ entryTypes: ['measure'], buffered: true });

test('stress vaults', async t => {
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
  await openN(100, 1);
  await snapshotHeap('round1');
  await openN(100, 2);
  await snapshotHeap('round2');

  // let perfObserver get the last measurement
  await eventLoopIteration();

  console.table(rows);
  /*
# runs with Far invitationMakers

defaultManagerType=local
┌─────────┬──────────────┬────────────────────┬────────────────────┐
│ (index) │ vaultsOpened │      duration      │    avgPerVault     │
├─────────┼──────────────┼────────────────────┼────────────────────┤
│    0    │      1       │ 205.27995777130127 │ 205.27995777130127 │
│    1    │      10      │ 2573.005709171295  │ 257.3005709171295  │
│    2    │     100      │ 28077.323541641235 │ 280.7732354164124  │
│    3    │     1000     │ 469665.9919581413  │ 469.6659919581413  │
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

# runs with durable invitationMakers

defaultManagerType=local with durable invitationMakers
┌─────────┬──────────────┬────────────────────┬────────────────────┐
│ (index) │ vaultsOpened │      duration      │    avgPerVault     │
├─────────┼──────────────┼────────────────────┼────────────────────┤
│    0    │      1       │ 218.26958300173283 │ 218.26958300173283 │
│    1    │      10      │  2438.05716599524  │ 243.80571659952403 │
│    2    │     100      │  28943.4425829947  │  289.434425829947  │
│    3    │     1000     │ 499310.2537910044  │ 499.3102537910044  │
└─────────┴──────────────┴────────────────────┴────────────────────┘

defaultManagerType=xs-worker
┌─────────┬──────────────┬────────────────────┬────────────────────┐
│ (index) │ vaultsOpened │      duration      │    avgPerVault     │
├─────────┼──────────────┼────────────────────┼────────────────────┤
│    0    │      1       │ 685.1244170069695  │ 685.1244170069695  │
│    1    │      10      │  7544.30787499249  │ 754.4307874992489  │
│    2    │     100      │ 98065.45445799828  │ 980.6545445799827  │
│    3    │     1000     │ 2297403.3330419958 │ 2297.4033330419957 │
└─────────┴──────────────┴────────────────────┴────────────────────┘


*/
});
