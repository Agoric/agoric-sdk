// @ts-check
// eslint-disable-next-line import/order
import { test as anyTest } from '../../../../tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import type { TestFn } from 'ava';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { makeSwingsetTestKit } from '@agoric/boot/test/bootstrapTests/supports';
import { makeWalletFactoryDriver } from '@agoric/boot/test/bootstrapTests/drivers';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { createRequire } from 'module';

import {
  oneScript as startPostalSvcScript,
  manifest as psManifest,
} from '../../../../src/contracts/gimix/start-postalSvc.js';
import {
  hideImportExpr,
  omitExportKewords,
  redactImportDecls,
} from './module-to-script.js';

const { Fail } = assert;
const myRequire = createRequire(import.meta.url);

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

// const PLATFORM_CONFIG = '@agoric/vm-config/decentral-core-config.json';
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';

const makeTestContext = async t => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));

  console.time('TestContext', 'swingsetTestKit');
  const swingsetTestKit = await makeSwingsetTestKit(t.log, 'bundles/', {
    configSpecifier: PLATFORM_CONFIG,
  });
  const { controller, runUtils, storage } = swingsetTestKit;
  console.timeLog('TestContext', 'swingsetTestKit');

  const { EV } = runUtils;

  // vaultFactoryKit is one of the last things produced in bootstrap.
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  await eventLoopIteration();
  // wait for bootstrap to settle before looking in storage for brands etc.
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  // agoricNamesRemotes.brand.ATOM || Fail`ATOM brand not yet defined`;

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  return {
    controller,
    walletFactoryDriver,
    runUtils,
    agoricNamesRemotes,
    env: process.env,
    bundleCache,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

/**
 * @param {import('ava').ExecutionContext<Awaited<ReturnType<typeof makeTestContext>>>} t
 */
const makeScenario = async t => {
  const { agoricNamesRemotes } = t.context;

  const findPurse = (current, _brand = agoricNamesRemotes.brand.Invitation) => {
    // getCurrentWalletRecord and agoricNamesRemotes
    // aren't using the same marshal context. hmm.
    //     return (
    //       current.purses.find(p => p.brand === brand) ||
    //       Fail`brand ${brand} not found`
    //     );
    return current.purses[0];
  };

  const { EV } = t.context.runUtils;
  /** @type {ERef<import('@agoric/vats/src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );

  const runCoreEval = async evals => {
    const bridgeMessage = {
      type: 'CORE_EVAL',
      evals,
    };
    await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
  };

  return { findPurse, runCoreEval };
};

test('terminate a contract by upgrading to one that shuts down', async t => {
  const { walletFactoryDriver, env, bundleCache, controller } = t.context;
  const { findPurse, runCoreEval } = await makeScenario(t);

  t.log('provision a smartWallet for an oracle operator');
  const oraAddr = 'agoric1oracle-operator';
  const oraWallet = await walletFactoryDriver.provideSmartWallet(oraAddr);

  const bundles = {
    postalSvc: await bundleCache.load(
      myRequire.resolve(`../../../../src/contracts/gimix/postalSvc.js`),
      'postalSvc',
    ),
    // myRequire.resolve(`../../../../src/contracts/gimix/terminalIncarnation.js`);
  };

  const { values } = Object;
  for await (const bundle of values(bundles)) {
    await controller.validateAndInstallBundle(bundle);
  }

  t.log('installed', values(bundles).length, 'bundles');

  const { postalSvc: bundle } = bundles;

  let script = hideImportExpr(
    redactImportDecls(omitExportKewords(`${startPostalSvcScript}`)),
  );

  script = script.replace(
    /bundleID = fail.*/,
    `bundleID = ${JSON.stringify(`b1-${bundle.endoZipBase64Sha512}`)},`,
  );

  t.log('start postalSvc');
  await runCoreEval([
    {
      json_permits: JSON.stringify(psManifest.startPostalSvc),
      js_code: script,
    },
  ]);

  t.fail('TODO');
});
