/* eslint-env node */
import { makeReadJsonFile } from '@agoric/internal/src/node/read-json.js';
import fs from 'node:fs';
import {
  buildSwingsetKernelConfig,
  initializeSwingsetKernel,
} from '../src/controller/initializeSwingset.js';
import { unsafeSharedBundleCache } from './bundleTool.js';

/**
 * @import {SwingSetConfig} from '../src/types-external.js';
 * @import {SwingStoreKernelStorage} from '../src/types-external.js';
 * @import {InitializationOptions} from '../src/controller/initializeSwingset.js';
 * @import {InitializeSwingsetRuntimeOptions} from '../src/controller/initializeSwingset.js';
 */

const readBundleSpecFile = makeReadJsonFile(fs.promises);

/**
 * Test-only wrapper that supplies ambient-powered bundleSpec loading.
 *
 * @param {Omit<SwingSetConfig, 'bundleCachePath' | 'bundleFormat' | 'includeDevDependencies'>} config
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
  const cache = await unsafeSharedBundleCache;

  const kernelConfig = await buildSwingsetKernelConfig(
    config,
    bootstrapArgs,
    initializationOptions,
    {
      ...runtimeOptions,
      bundleFromPath: runtimeOptions.bundleFromPath || readBundleSpecFile,
      bundleFromSourceSpec: (sourceSpec, _options) => cache.load(sourceSpec),
    },
  );
  return initializeSwingsetKernel(kernelConfig, kernelStorage, runtimeOptions);
};
