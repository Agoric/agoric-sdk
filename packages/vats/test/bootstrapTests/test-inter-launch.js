// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import * as processAmbient from 'child_process';
import * as fsAmbient from 'fs';
import { Fail } from '@agoric/assert';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>}
 */
const test = anyTest;

const PLATFORM_CONFIG = '@agoric/vats/decentral-devnet-config.json';

/**
 * @param {object} powers
 * @param {Pick<typeof import('node:child_process'), 'execFileSync' >} powers.childProcess
 * @param {typeof import('node:fs/promises')} powers.fs
 */
const makeProposalExtractor = ({ childProcess, fs }) => {
  const getPkgPath = (pkg, fileName = '') =>
    new URL(`../../../${pkg}/${fileName}`, import.meta.url).pathname;

  const runPackageScript = async (pkg, name) => {
    console.warn(pkg, 'running package script:', name);
    const pkgPath = getPkgPath(pkg);
    return childProcess.execFileSync('yarn', ['run', name], { cwd: pkgPath });
  };

  const loadJSON = async filePath =>
    harden(JSON.parse(await fs.readFile(filePath, 'utf8')));

  // XXX alternatively: just look at output files
  /** @param {string} txt */
  const parseProposalParts = txt => {
    const m = txt.match(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/);
    if (!m || !m.groups) throw Fail`Invalid proposal output ${txt}`;
    const { permit, script } = m.groups;

    const bundles = [];
    for (const mm of txt.matchAll(/swingset install-bundle @([^\n]+)/gm)) {
      const [, bundle] = mm;
      bundles.push(bundle);
    }
    return { permit, script, bundles };
  };

  /**
   * @param {object} options
   * @param {string} options.package
   * @param {string} options.packageScriptName
   */
  const buildAndExtract = async ({
    package: packageName,
    packageScriptName,
  }) => {
    // XXX use '@agoric/inter-protocol'?
    const out = await runPackageScript(packageName, packageScriptName);
    const built = parseProposalParts(out.toString());

    built.bundles.length > 0 || Fail`No bundles generated`;

    const loadAndRmPkgFile = async fileName => {
      const filePath = getPkgPath(packageName, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.rm(filePath);
      return content;
    };

    const permitsP = loadAndRmPkgFile(built.permit);
    const codeP = loadAndRmPkgFile(built.script);

    const bundlesP = Promise.all(
      built.bundles.map(
        async bundleFile =>
          /** @type {Promise<EndoZipBase64Bundle>} */ (loadJSON(bundleFile)),
      ),
    );
    return Promise.all([permitsP, codeP, bundlesP]).then(
      ([permits, code, bundles]) => ({ permits, code, bundles }),
    );
  };
  return buildAndExtract;
};

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

  const buildProposal = makeProposalExtractor({
    childProcess: processAmbient,
    fs: fsAmbient.promises,
  });

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    buildProposal,
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

test.serial('make vaults launch proposal', async t => {
  const { controller, buildProposal } = t.context;

  t.log('building proposal');
  // XXX use '@agoric/inter-protocol'?
  const proposal = await buildProposal({
    package: 'inter-protocol',
    packageScriptName: 'build:proposal-vaults',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: [
      {
        json_permits: proposal.permits,
        js_code: proposal.code,
      },
    ],
  };
  t.log({ bridgeMessage });
  const { EV } = t.context.runUtils;
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);
  t.log('proposal executed');

  t.log('check for working vaults system');
  const reserveKit = await EV.vat('bootstrap').consumeItem('reserveKit');
  t.truthy(reserveKit);
});
