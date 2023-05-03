/* global process */
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

  const runPackageScript = async (pkg, name, env) => {
    console.warn(pkg, 'running package script:', name);
    const pkgPath = getPkgPath(pkg);
    return childProcess.execFileSync('yarn', ['run', name], {
      cwd: pkgPath,
      env,
    });
  };

  const loadJSON = async filePath =>
    harden(JSON.parse(await fs.readFile(filePath, 'utf8')));

  // XXX alternatively: just look at output files
  /** @param {string} txt */
  const parseProposalParts = txt => {
    const evals = [
      ...txt.matchAll(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/g),
    ].map(m => {
      if (!m.groups) throw Fail`Invalid proposal output ${m[0]}`;
      const { permit, script } = m.groups;
      return { permit, script };
    });
    evals.length ||
      Fail`No swingset-core-eval found in proposal output: ${txt}`;

    const bundles = [
      ...txt.matchAll(/swingset install-bundle @([^\n]+)/gm),
    ].map(([, bundle]) => bundle);
    bundles.length || Fail`No bundles found in proposal output: ${txt}`;

    return { evals, bundles };
  };

  /**
   * @param {object} options
   * @param {string} options.package
   * @param {string} options.packageScriptName
   * @param {Record<string, string>} [options.env]
   */
  const buildAndExtract = async ({
    package: packageName,
    packageScriptName,
    env = {},
  }) => {
    const scriptEnv = Object.assign(Object.create(process.env), env);
    // XXX use '@agoric/inter-protocol'?
    const out = await runPackageScript(
      packageName,
      packageScriptName,
      scriptEnv,
    );
    const built = parseProposalParts(out.toString());

    const loadAndRmPkgFile = async fileName => {
      const filePath = getPkgPath(packageName, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      await fs.rm(filePath);
      return content;
    };

    const evalsP = Promise.all(
      built.evals.map(async ({ permit, script }) => {
        const [permits, code] = await Promise.all([
          loadAndRmPkgFile(permit),
          loadAndRmPkgFile(script),
        ]);
        return { json_permits: permits, js_code: code };
      }),
    );

    const bundlesP = Promise.all(
      built.bundles.map(
        async bundleFile =>
          /** @type {Promise<EndoZipBase64Bundle>} */ (loadJSON(bundleFile)),
      ),
    );
    return Promise.all([evalsP, bundlesP]).then(([evals, bundles]) => ({
      evals,
      bundles,
    }));
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
    env: {
      INTERCHAIN_DENOM: 'ibc/toyatom',
    },
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
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

  /** @type {Awaited<import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']>} */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const vaultPublicTopics = await EV(
    vaultFactoryKit.publicFacet,
  ).getPublicTopics();

  const metricsUpdate = await EV(
    vaultPublicTopics.metrics.subscriber,
  ).getUpdateSince();

  const collateralNames = await Promise.all(
    metricsUpdate.value.collaterals.map(collateral =>
      EV(collateral).getAllegedName(),
    ),
  );
  t.deepEqual(collateralNames, ['ATOM']);
});
