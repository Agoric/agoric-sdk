// @ts-check
import anyTest from 'ava';

// Use ambient authority only in test.before()
import type { TestFn, Macro, ExecutionContext } from 'ava';
import { spawn as ambientSpawn, type StdioOptions } from 'child_process';
import * as ambientPath from 'path';

import {
  prometheusSampleRegExp,
  prometheusNumberValue,
} from '../tools/prometheus.js';
import { makeScenario2, makeWalletTool, pspawn } from './scenario2.js';

type TestContext = Awaited<ReturnType<typeof makeTestContext>>;

const test = anyTest as TestFn<TestContext>;

const defaultFDs: StdioOptions = ['ignore', 'ignore', 'ignore'];
const debugFDs: StdioOptions = ['ignore', 'inherit', 'inherit'];
const fdList: StdioOptions = process.env.DEBUG ? debugFDs : defaultFDs;

const makeTestContext = async (t: ExecutionContext<unknown>) => {
  const filename = new URL(import.meta.url).pathname;
  const dirname = ambientPath.dirname(filename);
  const makefileDir = ambientPath.join(dirname, '..');

  const io = { spawn: ambientSpawn, cwd: makefileDir };
  const pspawnMake = pspawn('make', io);
  const pspawnAgd = pspawn('../../bin/agd', io);
  const scenario2 = makeScenario2({
    pspawnMake,
    pspawnAgd,
    log: t.log,
    stdio: process.env.DEBUG ? fdList : undefined, // propagate stdout and stderr for DEBUG
  });
  const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));
  const walletTool = makeWalletTool({
    pspawnAgd,
    runMake: scenario2.runMake,
    log: t.log,
    delay,
  });
  return { scenario2, pspawnAgd, pspawnMake, walletTool };
};

test.before(async t => {
  t.context = await makeTestContext(t);
  if (process.env.SKIP_SETUP) {
    t.log('Skipping make scenario2-setup');
    return;
  }
  await t.context.scenario2.setup();
  t.log('run chain to halt');
  t.is(
    await t.context.scenario2.runToHalt({ BLOCKS_TO_RUN: 3 }),
    0,
    'make scenario2-run-chain-to-halt is successful',
  );
});

test.serial('make and exec', async t => {
  // Note: the test harness discards the (voluminous) log messages
  // emitted by the kernel and vats. You can run `make scenario2-setup
  // scenario2-run-chain-to-halt` manually, to see them all.
  const { pspawnAgd, scenario2 } = t.context;
  t.log('exec agd');
  t.is(await pspawnAgd([]).exit, 0, 'exec agd exits successfully');
  t.log('resume chain and halt');
  t.is(
    await scenario2.runToHalt({ BLOCKS_TO_RUN: 6 }),
    0,
    'make scenario2-run-chain-to-halt succeeds again',
  );
  t.log('export');
  const exportExitCode = await scenario2.export();
  t.log('export exit code:', exportExitCode);
  // TODO: check exit code? It varies.
});

test.serial('integration test: rosetta CI', async t => {
  // Resume the chain... and concurrently, start a faucet AND run the rosetta-cli tests
  const { scenario2 } = t.context;

  // Run the chain until error or rosetta-cli exits.
  const chain = scenario2.spawnMake(['scenario2-run-chain'], { stdio: fdList });
  const rosetta = scenario2.spawnMake(['scenario2-run-rosetta-ci'], {
    stdio: fdList,
  });
  const cleanup = async () => {
    chain.kill();
    rosetta.kill();
    await Promise.allSettled([chain.exit, rosetta.exit]);
  };
  t.teardown(cleanup);

  const code = await Promise.race([
    rosetta.exit,
    // Don't leave behind an unhandled rejection, but still treat winning this
    // race as a failure.
    chain.exit.then(c => `chain exited unexpectedly with code ${c}`),
  ]);
  t.is(code, 0, 'make scenario2-run-rosetta-ci is successful');
});

interface Verifier {
  start: (t: ExecutionContext<TestContext>) => Promise<void>;
  stop: (t: ExecutionContext<TestContext>) => Promise<void>;
}

const walletProvisioning: Macro<
  [title: string, verifier?: Verifier],
  TestContext
> = test.macro({
  title: (_provided, title, _verifier) => title,
  async exec(t, _title, verifier) {
    const retryCountMax = 5;
    // Resume the chain...
    const { scenario2, walletTool } = t.context;
    const { agd, query, waitForBlock } = walletTool;

    // Run the chain until error or this test exits.
    const chain = scenario2.spawnMake(['scenario2-run-chain'], {
      stdio: fdList,
    });
    t.teardown(async () => {
      chain.kill();
      await Promise.allSettled([chain.exit]);
    });

    await waitForBlock('chain bootstrap', 1);

    // Create a new account under the fresh key's name.  Effectively
    // anonymous, but still accessible if we later need it.
    const { address: freshAddr } = (await agd([
      'keys',
      'add',
      'doNotStore',
      '--dry-run',
      '--output=json',
    ])) as { address: string };

    const checkWalletExists = async (address: string) => {
      try {
        const { value } = (await query([
          '--output=json',
          'vstorage',
          'path',
          `published.wallet.${address}`,
        ])) as { value: string };
        t.log(
          `query vstorage path published.wallet.${address} exits successfully`,
        );
        return !!value;
      } catch (e) {
        t.log(e);
        return false;
      }
    };

    t.false(
      await checkWalletExists(freshAddr),
      `${freshAddr} wallet doesn't exist yet`,
    );

    const fundPool = scenario2.spawnMake(['fund-provision-pool']);
    const cleanup = async () => {
      fundPool.kill();
      await fundPool.exit;
    };
    t.teardown(cleanup);

    const fundPoolExitCode = await fundPool.exit;

    t.is(fundPoolExitCode, 0, 'make fund-provision-pool is successful');
    await waitForBlock('after funding', 1, true);

    await verifier?.start(t);

    const provisionAcct = scenario2.spawnMake(
      ['provision-acct', `ACCT_ADDR=${freshAddr}`],
      { stdio: fdList },
    );

    const cleanupProvisionAcct = async () => {
      provisionAcct.kill();
      await provisionAcct.exit;
    };
    t.teardown(cleanupProvisionAcct);

    const provisionExitCode = await Promise.race([
      provisionAcct.exit,
      // Don't leave behind an unhandled rejection, but still treat winning this
      // race as a failure.
      chain.exit.then(c => `chain exited unexpectedly with code ${c}`),
    ]);

    t.is(provisionExitCode, 0, 'make provision-acct is successful');

    await waitForBlock('after provisioning', 1, true);

    // Wait for the wallet to be published
    // XXX: This is a temporary solution to wait for the wallet to be published
    // until we have a better way to do it.
    let retryCount = 0;
    while (retryCount < retryCountMax) {
      if (await checkWalletExists(freshAddr)) {
        t.log(`provisioned wallet ${freshAddr} is published`);
        break;
      }
      retryCount += 1;
      await waitForBlock(
        `${retryCount}/${retryCountMax} waiting for wallet provisioning`,
        1,
        true,
      );
    }
    t.true(
      retryCount < retryCountMax,
      `wallet is provisioned within ${retryCount} retries out of ${retryCountMax}`,
    );
    await verifier?.stop(t);
  },
});

test.serial(walletProvisioning, 'wallet provisioning');

/**
 * getMetrics reads data from the Prometheus URL and returns the selected
 * metrics as an object.
 *
 * @param url          Prometheus URL
 * @param metricNames  Selected metric names
 */
const getMetrics = async (
  url: string,
  metricNames: string[],
): Promise<Record<string, number>> => {
  const metricsResponse = await fetch(url);
  if (!metricsResponse.ok) {
    throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
  }

  const metricsText = await metricsResponse.text();

  const allMetricsEntries: Array<[string, number]> = [
    ...metricsText.matchAll(prometheusSampleRegExp),
  ].map(([_substring, nameAndLabels, _name, value]) => [
    nameAndLabels,
    prometheusNumberValue(value),
  ]);
  const allMetrics = new Map(allMetricsEntries);
  const metricsEntries = metricNames.map(metricName => {
    const value = allMetrics.get(metricName);
    // Prometheus does not publish counter values that are zero.
    return [metricName, value ?? 0];
  });
  return Object.fromEntries(metricsEntries);
};

{
  const prometheusUrl = 'http://localhost:26660/metrics';
  const testMetricNames = [
    'store_size_decrease{storeKey="vstorage"}',
    'store_size_increase{storeKey="vstorage"}',
  ];
  let startMetrics: Record<string, number> | undefined;
  test.serial(walletProvisioning, 'vstorage metrics', {
    start: async t => {
      // Assert that all values in an initial metrics snapshot are positive.
      startMetrics = await getMetrics(prometheusUrl, testMetricNames);
      t.log('metric start values:', startMetrics);
      t.deepEqual(Object.keys(startMetrics), testMetricNames);
      for (const [metricName, value] of Object.entries(startMetrics)) {
        t.true(value > 0, `${metricName} must be positive, not ${value}`);
      }
      // Require a corresponding stop() call to clear the initial snapshot.
      t.teardown(() => {
        if (!startMetrics) return;
        throw Error('metrics verifier stop() must be called before test end');
      });
    },
    stop: async t => {
      if (!startMetrics) {
        throw Error('metrics verifier start() must be called before stop()');
      }
      // Assert that all values have increased.
      const metrics = await getMetrics(prometheusUrl, testMetricNames);
      t.log('metric stop values:', metrics);
      t.deepEqual(Object.keys(metrics), testMetricNames);
      for (const [metricName, value] of Object.entries(metrics)) {
        const startValue = startMetrics[metricName];
        t.true(
          value > startValue,
          `${metricName} ${value} failed to increase from ${startValue}`,
        );
      }

      startMetrics = undefined;
    },
  });
}
