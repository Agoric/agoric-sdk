// @ts-check
import anyTest from 'ava';

// Use ambient authority only in test.before()
import { spawn as ambientSpawn } from 'child_process';
import * as ambientPath from 'path';

import { makeScenario2, makeWalletTool, pspawn } from './scenario2.js';

/**
 * @import {TestFn} from 'ava';
 * @import {StdioOptions} from 'child_process';
 */

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */

/** @type {TestFn<TestContext>} */
const test = anyTest;

/** @type {StdioOptions} */
const defaultFDs = ['ignore', 'ignore', 'ignore'];
/** @type {StdioOptions} */
const debugFDs = ['ignore', 'inherit', 'inherit'];
const fdList = process.env.DEBUG ? debugFDs : defaultFDs;

const makeTestContext = async t => {
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
    stdio: process.env.DEBUG ? fdList : undefined,
  });
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
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
});

test.serial('integration test: rosetta CI', async t => {
  // Resume the chain... and concurrently, start a faucet AND run the rosetta-cli tests
  const { scenario2 } = t.context;

  // Run the chain until error or rosetta-cli exits.
  const chain = scenario2.spawnMake(['scenario2-run-chain'], {
    stdio: ['ignore', 'ignore', 'ignore'],
  });
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

/** @type {import('ava').Macro<[title: string, verifier?: any], TestContext>} */
const walletProvisioning = test.macro({
  title(_, title, _verifier) {
    return title;
  },
  async exec(t, _title, verifier) {
    const retryCountMax = 5;
    // Resume the chain...
    const { scenario2, walletTool } = t.context;
    const { agd, query, waitForBlock } = walletTool;

    // Run the chain until error or this test exits.
    const chain = scenario2.spawnMake(['scenario2-run-chain'], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    t.teardown(async () => {
      chain.kill();
      await Promise.allSettled([chain.exit]);
    });

    await waitForBlock('chain bootstrap', 1);

    // Create a new account under the fresh key's name.  Effectively
    // anonymous, but still accessible if we later need it.
    const { address: freshAddr } = await agd([
      'keys',
      'add',
      'doNotStore',
      '--dry-run',
      '--output=json',
    ]);

    const checkWalletExists = async address => {
      try {
        const { value } = await query([
          '--output=json',
          'vstorage',
          'path',
          `published.wallet.${address}`,
        ]);
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
