// @ts-nocheck
/**
 * @file Shared swingset setup for the zoe contract-scenario suites.
 *
 * Extracted from zoe.test.js so the scenarios can be split across several test
 * files. AVA runs one worker per file, so splitting lets the independent
 * per-scenario kernels boot on separate cores instead of one at a time. Each
 * scenario builds its own `buildVatController`; the only shared state is the
 * read-only bundles/config produced here.
 */
import path from 'node:path';
import { buildVatController, buildKernelBundles } from '@agoric/swingset-vat';
import { unsafeSharedBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { zoeSourceSpecRegistry } from '../../../source-spec-registry.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const CONTRACT_FILES = [
  'automaticRefund',
  'autoswap',
  'coveredCall',
  {
    contractPath: 'auction/index',
    bundleName: 'secondPriceAuction',
  },
  'atomicSwap',
  'simpleExchange',
  'sellItems',
  'mintAndSellNFT',
  'otcDesk',
];

/**
 * Build the kernel/contract/vat bundles and swingset config shared by all zoe
 * scenarios. Call once per test file (in `test.before`).
 *
 * @returns {Promise<{ kernelBundles: unknown, config: object }>}
 */
export const buildZoeSwingsetData = async () => {
  const start = performance.now();
  const kernelBundles = await buildKernelBundles();
  const bundleCache = await unsafeSharedBundleCache;
  const { zcfBundle } = await bundleCache.loadRegistry(zoeSourceSpecRegistry);
  const step2 = performance.now();
  const contractBundles = {};
  const contractNames = [];
  await Promise.all(
    CONTRACT_FILES.map(async settings => {
      let bundleName;
      let contractPath;
      if (typeof settings === 'string') {
        bundleName = settings;
        contractPath = settings;
      } else {
        ({ bundleName, contractPath } = settings);
      }
      const source = `${dirname}/../../../src/contracts/${contractPath}.js`;
      const bundle = await bundleCache.load(source, bundleName);
      contractBundles[bundleName] = { bundle };
      contractNames.push(bundleName);
    }),
  );
  const bundles = { zcf: { bundle: zcfBundle }, ...contractBundles };
  const step3 = performance.now();

  const vats = {};
  await Promise.all(
    ['alice', 'bob', 'carol', 'dave'].map(async name => {
      const source = `${dirname}/vat-${name}.js`;
      const bundle = await bundleCache.load(source, `vat-${name}`);
      vats[name] = { bundle };
    }),
  );
  vats.zoe = {
    sourceSpec: `${dirname}/../../../../vats/src/vat-zoe.js`,
  };
  const bootstrapSource = `${dirname}/bootstrap.js`;
  vats.bootstrap = {
    bundle: await bundleCache.load(bootstrapSource, 'bootstrap'),
    parameters: { contractNames }, // argv will be added to this
  };
  const config = { bootstrap: 'bootstrap', vats, bundles };
  config.defaultManagerType = 'xs-worker';
  config.relaxDurabilityRules = true;

  const step4 = performance.now();
  const ktime = `${(step2 - start) / 1000}s kernel`;
  const ctime = `${(step3 - step2) / 1000}s contracts`;
  const vtime = `${(step4 - step3) / 1000}s vats`;
  const ttime = `${(step4 - start) / 1000}s total`;
  console.log(`bundling: ${ktime}, ${ctime}, ${vtime}, ${ttime}`);

  return { kernelBundles, config };
};

/**
 * Run one zoe bootstrap scenario in its own swingset kernel and return the
 * kernel dump for assertion/snapshotting.
 *
 * @param t ava execution context with `t.context.data` from
 *   {@link buildZoeSwingsetData}
 * @param argv passed to the bootstrap vat
 */
export const runZoeScenario = async (t, argv) => {
  const { kernelBundles, config } = t.context.data;
  const controller = await buildVatController(config, argv, { kernelBundles });
  t.teardown(controller.shutdown);
  await controller.run();
  return controller.dump();
};
