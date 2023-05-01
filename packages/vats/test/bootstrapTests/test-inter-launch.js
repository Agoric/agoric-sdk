// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import * as processAmbient from 'child_process';
import * as pathAmbient from 'path';
import * as fsAmbient from 'fs';
import * as osAmbient from 'os';
import { E } from '@endo/far';
import { Fail } from '@agoric/assert';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeCoreProposalBehavior } from '@agoric/deploy-script-support/src/coreProposalBehavior.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>}
 */
const test = anyTest;

const PLATFORM_CONFIG = '@agoric/vats/decentral-devnet-config.json';

const makeTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(
    t,
    'bundles/vaults',
    PLATFORM_CONFIG,
  );

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for USD to make it into oracleBrands
  const hub = await EV.vat('bootstrap').consumeItem('agoricNames');
  await EV(hub).lookup('oracleBrand', 'USD');
  console.timeLog('DefaultTestContext', 'oracleBrand', 'USD');

  await eventLoopIteration();

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.oracleBrand.USD || Fail`USD missing from oracleBrand`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  const { execFileSync } = processAmbient;
  const runPackageScript = (pkg, name) => {
    console.warn(pkg, 'running package script:', name);
    return execFileSync('yarn', ['run', name], { cwd: `../${pkg}` });
  };

  const { resolve: pathResolve } = pathAmbient;
  // TODO: set HOME to a test temp write space
  const cacheDir = pathResolve(osAmbient.homedir(), '.agoric/cache');

  const loadJSON = async fname =>
    harden(JSON.parse(await fsAmbient.promises.readFile(fname, 'utf8')));

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    runPackageScript,
    cacheDir,
    loadJSON,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});
test.after.always(t => t.context.shutdown());

test.serial('launch chain without vaults', async t => {
  const { EV } = t.context.runUtils;
  // example of awaitVatObject
  const provisionPoolStartResult = await EV.vat('bootstrap').consumeItem(
    'provisionPoolStartResult',
  );
  const istBrand = await EV(
    await EV.vat('bootstrap').consumeItem('agoricNames'),
  ).lookup('brand', 'IST');

  const paramValue = await EV(provisionPoolStartResult.publicFacet).getAmount(
    'PerAccountInitialAmount',
  );
  t.deepEqual(paramValue, {
    brand: istBrand,
    value: 250_000n,
  });
});

// XXX alternatively: just look at output files
const parseProposalParts = txt => {
  const m = txt.match(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/);
  if (!m) throw Error('@@TODO: handle errors');
  const { permit, script } = m.groups;

  const bundles = [];
  for (const mm of txt.matchAll(/swingset install-bundle @([^\n]+)/gm)) {
    const [_, bundle] = mm;
    bundles.push(bundle);
  }
  return { permit, script, bundles };
};

test.serial('make vaults launch proposal', async t => {
  const { runPackageScript, cacheDir } = t.context;

  t.log('@@test writes to', cacheDir);
  const out = await runPackageScript('inter-protocol', 'build:proposal-vaults');
  const built = parseProposalParts(out.toString());
  t.log(built);
  t.true(built.bundles.length > 0);

  const { controller, loadJSON } = t.context;
  for await (const bundlef of built.bundles) {
    const bundle = await loadJSON(bundlef);
    await controller.validateAndInstallBundle(bundle);
  }
  t.fail('todo');
});
