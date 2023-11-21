// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/notifier/tools/testSupports.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeWalletFactoryDriver } from './drivers.js';
import { makeSwingsetTestKit } from './supports.js';

const { Fail } = assert;

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeTestContext>>
 * >}
 */
const test = anyTest;

// main/production config doesn't have initialPrice, upon which 'open vaults' depends
const PLATFORM_CONFIG = '@agoric/vats/decentral-itest-vaults-config.json';

const makeTestContext = async t => {
  const swingsetTestKit = await makeSwingsetTestKit(t, 'bundles/wallet', {
    configSpecifier: PLATFORM_CONFIG,
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // vaultFactoryKit is one of the last things produced in bootstrap.
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  await eventLoopIteration();
  // wait for bootstrap to settle before looking in storage for brands etc.
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  return {
    walletFactoryDriver,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('update purse balance across upgrade', async t => {
  const oraAddr = 'agoric1oracle-operator';
  const { walletFactoryDriver } = t.context;
  t.log('provision a smartWallet for an oracle operator');
  const oraWallet = await walletFactoryDriver.provideSmartWallet(oraAddr);
  t.log(oraWallet);
  t.truthy(oraWallet);

  t.log('upgrade zoe');
  t.log(
    'start a new fluxAggregator for something like stATOM, using the address from 1 as one of the oracleAddresses',
  );
  t.log('oracle operator is not notified of new invitation');
  t.pass();
});
