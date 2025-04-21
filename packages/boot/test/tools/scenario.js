import { resolve as importMetaResolve } from 'import-meta-resolve';

import { buildVatController } from '@agoric/swingset-vat';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';

/**
 * @param {string} spec
 */
export const importSpec = async spec =>
  new URL(importMetaResolve(spec, import.meta.url)).pathname;

/**
 * @param {object} params
 * @param {Record<string, unknown>} [params.deviceEndowments]
 * @param {Partial<SwingSetConfig>} [params.kernelConfigOverrides]
 * @param {import('ava').ExecutionContext<unknown>} params.testContext
 * @param {SwingSetConfig['vats']} [params.vats]
 */
export const makeScenario = async ({
  deviceEndowments,
  kernelConfigOverrides,
  testContext,
  vats,
}) => {
  await Promise.resolve();
  const config = /** @type {SwingSetConfig} */ ({
    bootstrap: 'bootstrap',
    bundleCachePath: 'bundles',
    defaultReapInterval: 'never',
    includeDevDependencies: true, // for vat-data
    vats: {
      ...vats,
      bootstrap: {
        sourceSpec: await importSpec(
          '@agoric/vats/tools/bootstrap-chain-reflective.js',
        ),
      },
    },
    ...kernelConfigOverrides,
  });

  const c = await buildVatController(
    config,
    undefined,
    undefined,
    deviceEndowments,
  );
  testContext.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  await c.run();
  const runUtils = makeRunUtils(c);
  return runUtils;
};
