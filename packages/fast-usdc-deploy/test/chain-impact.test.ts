/**
 * @file chain impact testing
 *
 * Test to ensure the contract has flat usage of swingset kernel resources:
 *  - Exported objects
 *  - Pending work - kernel promises
 *  - vstorage
 *  - computrons
 *  - heap
 *
 * Fast USDC specific aspects are relegated to fu-sim-iter.ts.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import type { TestFn } from 'ava';

import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '@aglocal/boot/test/bootstrapTests/walletFactory.js';
import { makeSwingsetHarness } from '@aglocal/boot/tools/supports.js';
import type { SnapStoreDebug } from '@agoric/swing-store';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import { makeSlogSender } from '@agoric/telemetry';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { keyEQ } from '@endo/patterns';
import { makeSimulation } from './fu-sim-iter.js';

const { resolve: resolvePath } = createRequire(import.meta.url);

const test: TestFn<
  WalletFactoryTestContext & {
    doCoreEval: (specifier: string) => Promise<void>;
    harness: ReturnType<typeof makeSwingsetHarness>;
    observations: Array<{ id: unknown } & Record<string, unknown>>;
    sim: ReturnType<typeof makeSimulation>;
    simulatedIterations: number;
    slogSender?: ReturnType<typeof makeSlogSender>;
    writeStats?: (txt: string) => Promise<void>;
  }
> = anyTest;

const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';

/**
 * Contracts such as Fast USDC may delay cleanup of some state.
 * We only observe heap size after a periodic cleanup and a kernel GC.
 */
const REAP_PERIOD = 4;
/**
 * REAP_PERIOD * 2 + 1 might be enough to observe stable results:
 * the 1st might still lazily initialize a few things after setup steps,
 * and the final cleanup for some reason ends up freeing some things.
 *
 * Since running iterations is fairly cheap (the setup is the most expensive),
 * we do about 16 reaps to get plenty of data for visualization.
 */
const SUFFICIENT_ITERATIONS = REAP_PERIOD * 16 - 1;

test.before(async t => {
  const { env } = globalThis.process;
  const {
    SIM_ITERS = `${SUFFICIENT_ITERATIONS}`,
    SLOGFILE: slogFile,
    SNAPSHOT_DIR: snapshotDir,
    STATS_FILE,
  } = env;
  const harness = makeSwingsetHarness({
    // let the largest step in the simulation fit in a block
    blockComputeLimit: 65_000_000n * 100n * 1000n,
  });
  const slogSender = slogFile
    ? makeSlogSender({
        env: {
          ...env,
          SLOGFILE: slogFile,
          SLOGSENDER: '',
        },
        stateDir: '.',
      })
    : undefined;
  const context = await makeWalletFactoryContext({
    configSpecifier: config,
    fixupConfig: _config => ({
      ..._config,
      defaultReapGCKrefs: 'never',
      defaultReapInterval: 'never',
      snapshotInterval: Number.MAX_SAFE_INTEGER,
      vatTranscriptArchiveDir: snapshotDir,
    }),
    harness,
    slogSender,
  });

  const { evaluateProposal } = context;

  const writeStats = STATS_FILE
    ? (txt: string) => writeFile(STATS_FILE, txt)
    : undefined;
  const sim = makeSimulation(context);

  const doCoreEval = async (specifier: string) => {
    const script = await readFile(resolvePath(specifier), 'utf-8');
    console.log(`executing proposal '${specifier}'`);
    await evaluateProposal({
      bundles: [],
      evals: [{ js_code: script, json_permits: 'true' }],
    });
    console.log(`proposal '${specifier}' executed`);
  };

  t.context = {
    ...context,
    doCoreEval,
    harness,
    observations: [],
    simulatedIterations: Number(SIM_ITERS),
    sim,
    slogSender,
    writeStats,
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

const getResourceUsageStats = (
  controller: SwingsetController,
  data: Map<string, string>,
) => {
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;

  const { size: vstorageEntries } = data;
  const { length: vstorageTotalSize } = JSON.stringify([...data.entries()]);
  const { length: vstorageFusdcSize } = JSON.stringify(
    [...data.entries()].filter(e => e[0].startsWith('published.fastUsdc')),
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
    vstorageFusdcSize,
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

  if (writeStats)
    await writeFile(
      'kernel-0.json',
      JSON.stringify(controller.dump(), null, 2),
    );

  harness.useRunPolicy(true); // start tracking computrons
  harness.resetRunPolicy(); // never mind computrons from bootstrap
  const snapStore = swingStore.internal.snapStore as unknown as SnapStoreDebug;

  let previousReapPos = harden({}) as Record<string, number>;

  async function doCleanupAndSnapshot(id) {
    slogSender?.({ type: 'cleanup-begin', id });
    await sim.cleanup(t.context.doCoreEval);
    while (true) {
      const beforeReapPos = previousReapPos;
      previousReapPos = controller.reapAllVats(beforeReapPos);
      await controller.run(); // clear any reactions
      if (keyEQ(beforeReapPos, previousReapPos)) {
        break;
      }
    }
    const snapshotted = new Set(await controller.snapshotAllVats());
    await controller.run(); // clear any reactions
    const { kernelTable } = controller.dump();
    const snapshots = [...snapStore.listAllSnapshots()].filter(
      s => s.inUse && snapshotted.has(s.vatID),
    );

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
    // force GC and prune vstorage at regular intervals
    if (ix % REAP_PERIOD === 0) await doCleanupAndSnapshot(ix);

    slogSender?.({ type: 'iteration-begin', ix });

    updateNewCellBlockHeight(); // look at only the latest value written
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

    harness.resetRunPolicy(); // stay under block budget
  }

  await doCleanupAndSnapshot('final');

  if (writeStats) {
    await writeFile(
      'kernel-1.json',
      JSON.stringify(controller.dump(), null, 2),
    );
  }
});

// TODO: automate checking of observations
// currently, we inspect $STATS_FILE somewhat manually
test.todo('check that Exported object usage is flat');
test.todo('check that Pending work (kernel promises) is flat');
test.todo('check that vstorage usage is flat');
test.todo('check that computron usage is flat');
test.todo('check that heap usage is flat');
