// @ts-check
import anyTest from 'ava';
import fs from 'fs/promises';
// Use ambient authority only in test.before()
import { spawn as ambientSpawn } from 'child_process';
import * as ambientPath from 'path';

import { makeScenario2, makeWalletTool, pspawn } from './scenario2.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const defaultFDs = ['ignore', 'ignore', 'ignore'];
const debugFDs = ['ignore', 'inherit', 'inherit'];
const fdList = process.env.DEBUG ? debugFDs : defaultFDs;

const makeTestContext = async t => {
  const filename = new URL(import.meta.url).pathname;
  const dirname = ambientPath.dirname(filename);
  const makefileDir = ambientPath.join(dirname, '..');

  const io = { spawn: ambientSpawn, cwd: makefileDir };
  const pspawnMake = pspawn('make', io);
  const pspawnAgd = pspawn('../../bin/agd', io);
  const scenario2 = makeScenario2({ pspawnMake, pspawnAgd, log: t.log });
  return { scenario2, pspawnAgd, pspawnMake };
};

test.before(async t => {
  t.context = await makeTestContext(t);
  await t.context.scenario2.setup();
});

test.serial('make and exec', async t => {
  // Note: the test harness discards the (voluminous) log messages
  // emitted by the kernel and vats. You can run `make scenario2-setup
  // scenario2-run-chain-to-halt` manually, to see them all.
  const { pspawnAgd, scenario2 } = t.context;
  t.log('exec agd');
  t.is(await pspawnAgd([]).exit, 0, 'exec agd exits successfully');
  t.log('run chain to halt');
  t.is(
    await scenario2.runToHalt(),
    0,
    'make scenario2-run-chain-to-halt is successful',
  );
  t.log('resume chain and halt');
  t.is(
    await scenario2.runToHalt(),
    0,
    'make scenario2-run-chain-to-halt succeeds again',
  );
  t.log('export');
  t.is(await scenario2.export(), 0, 'export exits successfully');
});

test.serial('integration test: rosetta CI', async t => {
  // Resume the chain... and concurrently, start a faucet AND run the rosetta-cli tests
  const { scenario2 } = t.context;

  // Run the chain until error or rosetta-cli exits.
  const chain = scenario2.spawnMake(['scenario2-run-chain'], {
    stdio: fdList,
  });
  const rosetta = scenario2.spawnMake(['scenario2-run-rosetta-ci']);
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

/** @type {import('ava').Macro<[title: string, verifier?: any], any>} */
const walletProvisioning = test.macro({
  title(_, title, _verifier) {
    return title;
  },
  async exec(t, _title, verifier) {
    const retryCountMax = 5;
    // Resume the chain... and concurrently, start a faucet AND run the rosetta-cli tests
    const { pspawnAgd, scenario2 } = t.context;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const { query, waitForBlock } = makeWalletTool({
      pspawnAgd,
      runMake: scenario2.runMake,
      log: t.log,
      delay,
    });

    // Run the chain until error or rosetta-cli exits.
    const chain = scenario2.spawnMake(['scenario2-run-chain'], {
      stdio: fdList,
    });

    await waitForBlock('chain bootstrap', 1);

    const fundPool = scenario2.spawnMake(['fund-provision-pool']);
    const cleanup = async () => {
      chain.kill();
      fundPool.kill();
      await Promise.allSettled([chain.exit, fundPool.exit]);
    };
    t.teardown(cleanup);

    const fundPoolExitCode = await Promise.race([
      fundPool.exit,
      // Don't leave behind an unhandled rejection, but still treat winning this
      // race as a failure.
      chain.exit.then(c => `chain exited unexpectedly with code ${c}`),
    ]);

    t.is(fundPoolExitCode, 0, 'make fund-provision-pool is successful');

    const soloAddr = (
      await fs.readFile('t1/8000/ag-cosmos-helper-address', 'utf-8')
    ).trimEnd();

    const checkWalletExists = async address => {
      try {
        const { value } = await query([
          '--output=json',
          'vstorage',
          'path',
          `published.wallet.${address}`,
        ]);
        t.log('query vstorage path published.wallet exits successfully');
        return !!value;
      } catch (e) {
        t.log(e);
        return false;
      }
    };

    t.false(
      await checkWalletExists(soloAddr),
      `${soloAddr} wallet doesn't exist yet`,
    );

    await waitForBlock('after funding', 1, true);
    await verifier?.start(t);
    const provisionAcct = scenario2.spawnMake(
      ['provision-acct', `ACCT_ADDR=${soloAddr}`],
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

    // Wait for the wallet to be published
    // XXX: This is a temporary solution to wait for the wallet to be published
    // until we have a better way to do it.
    let retryCount = 0;
    while (retryCount < retryCountMax) {
      if (await checkWalletExists(soloAddr)) {
        t.log(`provisioned wallet ${soloAddr} is published`);
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

const makeMetricsVerifier = (url, metricNames) => {
  /** @type {Promise<void>} */
  let finished;
  let metricStartValues;

  const getMetricValues = async () => {
    const metricValues = {};
    const metricsResponse = await fetch(url);
    if (!metricsResponse.ok) {
      throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
    }

    const metricsText = await metricsResponse.text();

    for (const metricName of metricNames) {
      const regex = new RegExp(`${metricName}\\{storeKey="vstorage"\\} (\\d+)`);
      const match = metricsText.match(regex);
      if (!match) {
        throw new Error(
          `Fetch response text does not contain required line for ${metricName}`,
        );
      }
      const value = parseInt(match[1], 10);
      if (value <= 0) {
        throw new Error(`${metricName} should be greater than zero`);
      }
      metricValues[metricName] = value;
    }
    return metricValues;
  };

  const start = async t => {
    try {
      metricStartValues = await getMetricValues();
      t.log('metric start values:', metricStartValues);
    } catch (error) {
      t.fail(error.message);
      return;
    }

    finished = new Promise((resolve, reject) => {
      t.teardown(() =>
        reject(
          new Error('test finished without calling stop() on metrics verifier'),
        ),
      );
      resolve();
    });
  };

  const stop = async t => {
    let metricEndValues;
    try {
      metricEndValues = await getMetricValues();
      t.log('metric end values:', metricEndValues);
    } catch (error) {
      t.fail(error.message);
      return;
    }
    for (const metricName of metricNames) {
      const startValue = metricStartValues[metricName];
      const endValue = metricEndValues[metricName];
      if (endValue <= startValue) {
        t.fail(
          `${metricName} end value ${endValue} should be greater than start value ${startValue}`,
        );
      }
    }
    return finished;
  };

  return { start, stop };
};

test.serial(
  walletProvisioning,
  'vstorage metrics',
  makeMetricsVerifier('http://localhost:26660/metrics', [
    'store_size_decrease',
    'store_size_increase',
  ]),
);
