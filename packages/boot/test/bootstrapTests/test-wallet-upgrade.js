// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
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
    runUtils,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

const upgradeZoeScript = () => {
  /**
   * @param {VatAdminSvc} vatAdminSvc
   * @param {any} adminNode
   * @param {string} bundleCapName
   * @param {unknown} vatParameters
   */
  const upgradeVat = async (
    vatAdminSvc,
    adminNode,
    bundleCapName,
    vatParameters = {},
  ) => {
    const bcap = await E(vatAdminSvc).getNamedBundleCap(bundleCapName);
    const options = { vatParameters };
    const incarnationNumber = await E(adminNode).upgrade(bcap, options);
    console.log('upgraded', bundleCapName, 'to', incarnationNumber);
  };

  const upgradeZoe = async powers => {
    const { vatStore, vatAdminSvc } = powers.consume;
    const { adminNode } = await E(vatStore).get('zoe');
    console.log('zoe admin node', adminNode);
    await upgradeVat(vatAdminSvc, adminNode, 'zoe');
  };
  return upgradeZoe;
};

test('update purse balance across upgrade', async t => {
  const oraAddr = 'agoric1oracle-operator';
  const { walletFactoryDriver } = t.context;
  t.log('provision a smartWallet for an oracle operator');
  const oraWallet = await walletFactoryDriver.provideSmartWallet(oraAddr);
  t.log(oraWallet);
  t.truthy(oraWallet);

  t.log('upgrade zoe');
  t.log('launching proposal');
  const proposal = {
    evals: [
      {
        json_permits: JSON.stringify({
          consume: { vatStore: true, vatAdminSvc: true },
        }),
        js_code: `(${upgradeZoeScript})()`,
      },
    ],
  };
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
  };
  t.log({ bridgeMessage });
  const { EV } = t.context.runUtils;
  /** @type {ERef<import('../../src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  // XXX can we test the messages that went to the vat console?
  // agoric1oracle-operator failed updateState observer (RemoteError#1)
  // RemoteError#1: vat terminated

  t.log(
    'start a new fluxAggregator for something like stATOM, using the address from 1 as one of the oracleAddresses',
  );
  t.log('oracle operator is not notified of new invitation');
  t.pass();
});
