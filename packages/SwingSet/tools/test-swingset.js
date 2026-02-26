/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { provideBundleCache } from './bundleTool.js';
import {
  buildSwingsetKernelConfig,
  initializeSwingsetKernel,
} from '../src/controller/initializeSwingset.js';
import { parseBundleSpec } from '../src/controller/bundle-spec.js';

/**
 * @import {SwingSetConfig} from '../src/types-external.js';
 * @import {SwingStoreKernelStorage} from '../src/types-external.js';
 * @import {InitializationOptions} from '../src/controller/initializeSwingset.js';
 * @import {InitializeSwingsetRuntimeOptions} from '../src/controller/initializeSwingset.js';
 */

/**
 * @param {string} bundleSpecPath
 */
const readBundleSpecFile = bundleSpecPath =>
  parseBundleSpec(filePath => fs.readFileSync(filePath, 'utf-8'), bundleSpecPath);

const sharedBundleCachePath = new URL('../../../bundles', import.meta.url)
  .pathname;

/**
 * Test-only wrapper that supplies ambient-powered bundleSpec loading.
 *
 * @param {SwingSetConfig} config
 * @param {unknown} bootstrapArgs
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {InitializationOptions} initializationOptions
 * @param {InitializeSwingsetRuntimeOptions} runtimeOptions
 */
export const initializeTestSwingset = async (
  config,
  bootstrapArgs,
  kernelStorage,
  initializationOptions = {},
  runtimeOptions = {},
) => {
  const {
    bundleCachePath = sharedBundleCachePath,
    includeDevDependencies,
    bundleFormat,
  } = config;
  const cache = await provideBundleCache(
    path.resolve(bundleCachePath),
    {
      dev: includeDevDependencies,
      format: bundleFormat,
      byteLimit: Infinity,
    },
    spec => import(spec),
  );

  const kernelConfig = await buildSwingsetKernelConfig(
    config,
    bootstrapArgs,
    initializationOptions,
    {
      ...runtimeOptions,
      readBundleSpec: runtimeOptions.readBundleSpec || readBundleSpecFile,
      bundleFromSourceSpec: (sourceSpec, _options) => cache.load(sourceSpec),
    },
  );
  return initializeSwingsetKernel(kernelConfig, kernelStorage, runtimeOptions);
};
