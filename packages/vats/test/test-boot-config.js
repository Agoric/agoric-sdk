// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { spawn as ambientSpawn } from 'child_process';
import { promises as fsPromises } from 'fs';
import path from 'path';

import { mustMatch } from '@agoric/store';
import { loadSwingsetConfigFile, shape as ssShape } from '@agoric/swingset-vat';
import { makeNodeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { ParametersShape as BootParametersShape } from '../src/core/boot-psm.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const CONFIG_FILES = [
  'decentral-core-config.json',
  'decentral-demo-config.json',
  'decentral-devnet-config.json',
  'decentral-main-psm-config.json',
  'decentral-psm-config.json',
  'decentral-test-psm-config.json',
  'decentral-test-vaults-config.json',
];

const PROD_CONFIG_FILES = [
  'decentral-main-psm-config.json',
  'decentral-psm-config.json',
  'decentral-test-vaults-config.json',
];

const NON_UPGRADEABLE_VATS = [
  // TODO: move vat-network to a CoreEval proposal
  // 'vat-network',
  // 'vat-ibc',
  // TODO: prune centralSupply from prod config
  // 'centralSupply',
  'mints',
  'sharing',
];

/**
 * @param {string} bin
 * @param {{ spawn: typeof import('child_process').spawn }} io
 */
export const pspawn =
  (bin, { spawn }) =>
  (args = [], opts = {}) => {
    /** @type {ReturnType<typeof import('child_process').spawn> | undefined } */
    let child;
    const exit = new Promise((resolve, reject) => {
      // console.debug('spawn', bin, args, { cwd: makefileDir, ...opts });
      child = spawn(bin, args, opts);
      child.addListener('exit', code => {
        if (code !== 0) {
          reject(Error(`exit ${code} from: ${bin} ${args}`));
          return;
        }
        resolve(0);
      });
    });
    return { child: child || assert.fail(), exit };
  };

// #region NOTE: confine ambient authority to test.before
const makeTestContext = async () => {
  const pathname = new URL(import.meta.url).pathname;
  const dirname = path.dirname(pathname);
  const resolve = (...ps) => path.join(dirname, ...ps);
  const asset = (...ps) => fsPromises.readFile(resolve(...ps), 'utf-8');

  const cacheDir = resolve('..', 'bundles');
  const bundleCache = await makeNodeBundleCache(cacheDir, {}, s => import(s));

  const vizTool = resolve('..', 'tools', 'authorityViz.js');
  const runViz = pspawn(vizTool, { spawn: ambientSpawn });

  return {
    asset,
    bundleCache,
    cacheDir,
    resolve,
    basename: path.basename,
    runViz,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});
// #endregion

test('Bootstrap SwingSet config file syntax', async t => {
  const { asset } = t.context;

  await Promise.all(
    CONFIG_FILES.map(async f => {
      const txt = await asset('..', f);
      const config = harden(JSON.parse(txt));
      t.notThrows(() => mustMatch(config, ssShape.SwingSetConfig), f);
      const parameters = config?.vats?.bootstrap?.parameters;
      t.log('syntax check:', f, parameters ? 'and parameters' : '');
      parameters &&
        t.notThrows(() => mustMatch(parameters, BootParametersShape), f);
    }),
  );
});

test('no test-only code is in production configs', async t => {
  const { basename, bundleCache, resolve } = t.context;
  const { entries } = Object;

  const seen = new Set();

  const noLog = () => {};

  for await (const configSpec of PROD_CONFIG_FILES) {
    t.log('checking config', configSpec);
    const fullPath = resolve('..', configSpec);
    const config = await loadSwingsetConfigFile(fullPath);
    if (!config) throw t.truthy(config, configSpec); // if/throw refines type
    const { bundles } = config;
    if (!bundles) throw t.truthy(bundles, configSpec);

    for await (const [name, spec] of entries(bundles)) {
      if (!('sourceSpec' in spec)) throw t.fail();

      // t.log('checking bundle path', name, spec.sourceSpec);
      for (const vatName of NON_UPGRADEABLE_VATS) {
        if (spec.sourceSpec.includes(vatName)) {
          t.fail(`${configSpec} bundle ${spec.sourceSpec} not upgradeable`);
        }
      }

      await bundleCache.load(spec.sourceSpec, undefined, noLog);
      const targetName = basename(spec.sourceSpec, '.js');

      if (!seen.has(targetName)) {
        seen.add(targetName);
        t.log('checking bundle', targetName);
        const meta = await bundleCache.validate(targetName);
        t.truthy(meta, name);

        for (const item of meta.contents) {
          if (item.relativePath.includes('magic-cookie-test-only')) {
            t.fail(`${configSpec} bundle ${name}: ${item.relativePath}`);
          }
        }
      }
    }
  }
});

test('bootstrap permit visualization snapshot', async t => {
  const { runViz } = t.context;

  const cmd = runViz(['@agoric/vats/decentral-test-vaults-config.json']);
  const output = async () => {
    const parts = [];
    cmd.child.stdout?.on('data', chunk => parts.push(chunk));
    await cmd.exit;
    return parts.join('');
  };
  const diagram = await output();
  t.snapshot(diagram);
});
