import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn, ExecutionContext } from 'ava';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { execCmd, checkPodsRunning } from '../scripts/shell.ts';
import childProcess from 'node:child_process';
import { createRequire } from 'node:module';
import fsp from 'node:fs/promises';
import { commonSetup, ensureAccounts } from './support.js';
import { makeContainer } from '../tools/agd-lib.js';

const nodeRequire = createRequire(import.meta.url);
const configFile = nodeRequire.resolve(
  '../../../multichain-testing/config.ymax.yaml',
);

const contractName = 'ymax0';
const chainInfoBuilder = './src/chain-info.build.js';
const portfolioBuilder = './src/portfolio.build.js';

interface TestContext {
  tools: {
    deployBuilder: (...args: any[]) => Promise<any>;
    retryUntilCondition: (...args: any[]) => Promise<any>;
    vstorageClient: {
      queryData: (path: string) => Promise<any>;
    };
    agd?: any;
  };
  deployBuilder: (...args: any[]) => Promise<any>;
  retryUntilCondition: (...args: any[]) => Promise<any>;
  wallets: any;
}

const test: TestFn<TestContext> = anyTest;

const fundWallets = async (t: ExecutionContext, wallets: any) => {
  const addr = wallets.agoric;
  console.log('Funding wallet:', addr);
  try {
    console.log('\n🔄 Initiating USDC IBC transfer from Noble → Agoric...');
    const usdcTransferCmd = [
      `kubectl exec -i noblelocal-genesis-0 -- nobled tx ibc-transfer transfer transfer channel-0`,
      `${addr}`,
      `10000000uusdc`,
      `--from test1`,
      `--keyring-backend test`,
      `--chain-id noblelocal`,
      `--fees 2000uusdc`,
      `--gas auto`,
      `--gas-adjustment 1.3`,
      `-y`,
    ].join(' ');

    const usdcResult = await execCmd(usdcTransferCmd);
    console.log('✅ USDC transfer command output:\n', usdcResult);
    t.assert(
      usdcResult.includes('code: 0') || usdcResult.includes('txhash'),
      'USDC transfer failed',
    );

    console.log('\n💸 Sending BLD + IST from Agoric genesis...');
    const bankSendCmd = [
      `kubectl exec -i agoriclocal-genesis-0 -- agd tx bank send`,
      `genesis`,
      `${addr}`,
      `500000000000ubld,500000000000uist`,
      `--keyring-backend=test`,
      `--chain-id=agoriclocal`,
      `--fees=2000ubld`,
      `--gas=auto`,
      `--gas-adjustment=1.3`,
      `-y`,
    ].join(' ');

    const bankResult = await execCmd(bankSendCmd);
    console.log('✅ BLD/IST bank send output:\n', bankResult);
    t.assert(
      bankResult.includes('code: 0') || bankResult.includes('txhash'),
      'Bank send failed',
    );

    console.log('\n⏳ Waiting for transactions to finalize...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('\n🔍 Querying balances from agoriclocal...');
    const queryCmd = `kubectl exec -i agoriclocal-genesis-0 -- agd query bank balances ${addr} --output json`;
    const queryOutput = await execCmd(queryCmd);
    console.log('✅ Raw balance query result:\n', queryOutput);

    const parsed = JSON.parse(queryOutput);
    const balances: Record<string, number> = {};
    for (const coin of parsed.balances) {
      balances[coin.denom] = parseInt(coin.amount, 10);
    }

    console.log('\n📊 Parsed balances:', balances);

    const hasUSDC = Object.keys(balances).some(
      denom => denom.startsWith('ibc/') && balances[denom] >= 10_000_000,
    );
    t.true(hasUSDC, 'USDC balance missing or too low');
    t.true((balances.ubld ?? 0) >= 500_000_000_000, 'BLD balance too low');
    t.true((balances.uist ?? 0) >= 500_000_000_000, 'IST balance too low');

    console.log('✅ Balance verification passed!\n');
  } catch (err) {
    console.error('❌ Error during fund and balance check:', err);
    t.fail(`Funding or balance verification failed: ${(err as Error).message}`);
  }
};

const makeTestContext = async (t: ExecutionContext): Promise<TestContext> => {
  t.log('configuration for starship regisry', configFile);

  const podsOk = await checkPodsRunning();

  if (!podsOk) {
    // XXX: maybe give them an option to run it for them here?
    t.fail(
      'Multichain-testing env is not running. Please start it before running any tests.',
    );
    return {} as TestContext; // Return empty context to avoid further errors
  }

  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  const container = makeContainer({ execFileSync: childProcess.execFileSync });

  const { deployBuilder, retryUntilCondition, ...tools } = commonSetup(t, {
    execFile: childProcess.execFile,
    container,
    bundleCache,
    readFile: fsp.readFile,
    fetch,
    setTimeout: globalThis.setTimeout,
    log: console.log,
  });

  // TODO: this is flaky - add them manually if this fails
  const wallets = await ensureAccounts(tools.agd.keys);

  t.log('Install contract', contractName);
  await deployBuilder(chainInfoBuilder, [
    `net=local`,
    `peer=noblelocal:connection-0:channel-0:uusdc`,
  ]);
  await deployBuilder(portfolioBuilder, [
    `net=local`,
    `peer=noblelocal:connection-0:channel-0:uusdc`,
  ]);

  await fundWallets(t, wallets);

  return {
    tools: {
      ...tools,
      deployBuilder,
      retryUntilCondition,
    },
    deployBuilder,
    retryUntilCondition,
    wallets,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

// test.skip('Ensure multichain env is running or start it', async t => {
//   try {
//     const podsOk = await checkPodsRunning();

//     if (!podsOk) {
//       // Navigate to multichain-testing dir and start env
//       await execCmd(`cd ../../multichain-testing && make clean setup start`);
//       const retryPodsOk = await checkPodsRunning();
//       t.true(retryPodsOk, 'Multichain pods failed to start after setup');
//     } else {
//       t.pass('Multichain pods are already running');
//     }
//   } catch (err) {
//     t.fail(`Multichain setup failed: ${(err as Error).message}`);
//   }
// });

test('Ymax Contract is registered in vstorage', async t => {
  const { tools } = t.context;
  const { retryUntilCondition, vstorageClient } = tools;

  try {
    await retryUntilCondition(
      () => vstorageClient.queryData(`published.agoricNames.instance`),
      res => contractName in Object.fromEntries(res),
      `${contractName} instance is available`,
    );
    t.pass(`${contractName} was found in vstorage`);
  } catch (err) {
    t.fail(`${contractName} was NOT found in vstorage ${err instanceof Error ? err.message : err}`);
  }
});
