/* eslint-env node */
import fs from 'fs';
import { initializeSwingset } from '../src/controller/initializeSwingset.js';
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
  parseBundleSpec(path => fs.readFileSync(path, 'utf-8'), bundleSpecPath);

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
) =>
  initializeSwingset(
    config,
    bootstrapArgs,
    kernelStorage,
    initializationOptions,
    {
      ...runtimeOptions,
      readBundleSpec: runtimeOptions.readBundleSpec || readBundleSpecFile,
    },
  );
