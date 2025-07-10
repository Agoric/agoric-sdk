/**
 * @file chain impact testing for portfolio contract
 *
 * Test to ensure the contract has flat usage of swingset kernel resources:
 *  - Exported objects
 *  - Pending work - kernel promises
 *  - vstorage
 *  - computrons
 *  - heap
 *
 * Portfolio contract specific aspects are relegated to portfolio-sim-iter.ts.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { makeSwingsetHarness } from '@aglocal/boot/tools/supports.js';
import { makeSimulation } from './portfolio-sim-iter.ts';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.ts';

const test: TestFn<
  WalletFactoryTestContext & {
    harness: ReturnType<typeof makeSwingsetHarness>;
    observations: Array<{ id: unknown } & Record<string, unknown>>;
    writeStats?: (txt: string) => Promise<void>;
    doCoreEval: (specifier: string) => Promise<void>;
    simulatedIterations: number;
    sim: ReturnType<typeof makeSimulation>;
  }
> = anyTest;

const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
const REAP_PERIOD = 2;
const SUFFICIENT_ITERATIONS = REAP_PERIOD * 2 - 1;

test.before(async t => {
  const { env } = globalThis.process;
  const fs = await import('node:fs');
  const path = await import('node:path');
  const tmp = await import('tmp');
  const { writeFile } = await import('node:fs/promises');
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'xs-worker',
    STATS_FILE,
    SNAPSHOT_DIR: snapshotDir,
    SIM_ITERS = `${SUFFICIENT_ITERATIONS}`,
  } = env;
  const harness = makeSwingsetHarness({
    blockComputeLimit: 65_000_000n * 100n * 1000n,
  });
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
    harness,
    configOverrides: {
      defaultReapInterval: 'never',
      defaultReapGCKrefs: 'never',
      snapshotInterval: Number.MAX_SAFE_INTEGER,
    },
    ...(snapshotDir
      ? {
        archiveSnapshot: (
          await import('@agoric/swing-store')
        ).makeArchiveSnapshot(snapshotDir, { fs, path, tmp }),
      }
      : {}),
  });

  const writeStats = STATS_FILE
    ? (txt: string) => writeFile(STATS_FILE, txt)
    : undefined;
  const sim = makeSimulation(ctx);

  const { log } = console;
  const doCoreEval = async (specifier: string) => {
    const { EV } = ctx.runUtils;
    const script = await (
      await import('node:fs/promises')
    ).readFile(require.resolve(specifier), 'utf-8');
    const eval0 = { js_code: script, json_permits: 'true' };
    log('executing proposal');
    const bridgeMessage = { type: 'CORE_EVAL', evals: [eval0] };
    const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
      'coreEvalBridgeHandler',
    );
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
    log(`proposal executed`);
  };

  t.context = {
    ...ctx,
    harness,
    observations: [],
    writeStats,
    doCoreEval,
    simulatedIterations: Number(SIM_ITERS),
    sim,
  };
});
const stringifyBigint = (_p, v) => (typeof v === 'bigint' ? `${v}` : v);
test.after.always(async t => {
  await t.context.shutdown?.();

  const { observations, writeStats } = t.context;
  if (writeStats) {
    const lines = observations.map((o, ix) =>
      JSON.stringify({ ix, ...o }, stringifyBigint),
    );
    await writeStats(lines.join('\n'));
  }
});

const getResourceUsageStats = (controller, data) => {
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;

  const { size: vstorageEntries } = data;
  const { length: vstorageTotalSize } = JSON.stringify([...data.entries()]);
  const { length: vstoragePortfolioSize } = JSON.stringify(
    [...data.entries()].filter(e => e[0].startsWith('published.ymax0')),
  );
  const { length: vstorageWalletSize } = JSON.stringify(
    [...data.entries()].filter(e => e[0].startsWith('published.wallet')),
  );

  return harden({
    promiseQueuesLength,
    kernelPromises,
    kernelObjects,
    clistEntries,
    vstorageEntries,
    vstorageTotalSize,
    vstoragePortfolioSize,
    vstorageWalletSize,
  });
};

test.serial('access relevant kernel stats after bootstrap', async t => {
  const { controller, observations, storage } = t.context;
  const relevant = getResourceUsageStats(controller, storage.data);
  t.log('relevant kernel stats', relevant);
  t.truthy(relevant);
  observations.push({ id: 'post-boot', ...relevant });
});

test.serial('prep for contract deployment', async t => {
  const { sim } = t.context;
  await t.notThrowsAsync(sim.beforeDeploy(t));

  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'deploy-prep',
    ...getResourceUsageStats(controller, storage.data),
  });
});

test.serial('deploy contract', async t => {
  const { sim } = t.context;
  const instance = await sim.deployContract(t.context);
  t.truthy(instance);
  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'post-start-contract',
    ...getResourceUsageStats(controller, storage.data),
  });
});

test.serial('post-deploy / pre iteration', async t => {
  const { sim } = t.context;
  await t.notThrowsAsync(sim.beforeIterations(t));

  const { controller, observations, storage } = t.context;
  observations.push({
    id: 'post-deploy',
    ...getResourceUsageStats(controller, storage.data),
  });
});

const range = (n: number) => Array.from(Array(n).keys());

test.serial('iterate simulation several times', async t => {
  const { controller, observations, storage, sim } = t.context;
  const { harness, swingStore, slogSender, writeStats } = t.context;
  const { updateNewCellBlockHeight } = storage;

  if (writeStats) {
    await writeStats(JSON.stringify(controller.dump(), null, 2));
  }

  harness.useRunPolicy(true);
  harness.resetRunPolicy();
  const snapStore = swingStore.internal.snapStore;

  let previousReapPos = harden({});

  async function doCleanupAndSnapshot(id) {
    slogSender?.({ type: 'cleanup-begin', id });
    await sim.cleanup(t.context.doCoreEval);
    while (true) {
      const beforeReapPos = previousReapPos;
      previousReapPos = controller.reapAllVats(beforeReapPos);
      await controller.run();
      if (JSON.stringify(beforeReapPos) === JSON.stringify(previousReapPos)) {
        break;
      }
    }
    const snapshotted = new Set(await controller.snapshotAllVats());
    await controller.run();
    const { kernelTable } = controller.dump();
    let snapshots: any[] = [];
    const snapStoreAny = snapStore as any;
    if (typeof snapStoreAny.listAllSnapshots === 'function') {
      snapshots = [...snapStoreAny.listAllSnapshots()].filter(
        (s: any) => s.inUse && snapshotted.has(s.vatID),
      );
    } else if (
      snapStoreAny.snapshots &&
      typeof snapStoreAny.snapshots.values === 'function'
    ) {
      snapshots = Array.from(snapStoreAny.snapshots.values()).filter(
        (s: any) => s.inUse && snapshotted.has(s.vatID),
      );
    }

    const observation = {
      id: `post-prune-${id}`,
      time: Date.now(),
      kernelTable,
      snapshots,
      ...getResourceUsageStats(controller, storage.data),
    };
    observations.push(observation);
    slogSender?.({ type: 'cleanup-finish', id, observation });
    await slogSender?.forceFlush?.();
  }

  const { simulatedIterations } = t.context;
  for (const ix of range(simulatedIterations)) {
    if (ix % REAP_PERIOD === 0) {
      await doCleanupAndSnapshot(ix);
    }

    slogSender?.({ type: 'iteration-begin', ix });

    updateNewCellBlockHeight();
    await sim.iteration(t, ix);

    const computrons = harness.totalComputronCount();
    const observation = {
      id: `iter-${ix}`,
      time: Date.now(),
      computrons,
      ...getResourceUsageStats(controller, storage.data),
    };
    observations.push(observation);
    slogSender?.({ type: 'iteration-finish', ix, observation });

    harness.resetRunPolicy();
  }

  await doCleanupAndSnapshot('final');

  if (writeStats) {
    await writeStats(JSON.stringify(controller.dump(), null, 2));
  }
});

test.todo('check that Exported object usage is flat');
test.todo('check that Pending work (kernel promises) is flat');
test.todo('check that vstorage usage is flat');
test.todo('check that computron usage is flat');
test.todo('check that heap usage is flat');
