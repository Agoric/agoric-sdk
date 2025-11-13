import { Fail } from '@endo/errors';

/**
 * @import {BundleHandler} from '../controller/bundle-handler.js';
 * @import {WorkerOptions} from '../types-internal.js';
 */

/**
 * @param {string} managerType
 * @param {BundleHandler} bundleHandler
 * @param {string[]} [nodeOptions]
 * @returns {Promise<WorkerOptions>}
 */
export async function makeWorkerOptions(
  managerType,
  bundleHandler,
  nodeOptions,
) {
  await null;
  if (nodeOptions && managerType !== 'node-subprocess') {
    Fail`nodeOptions requires managerType 'node-subprocess'`;
  }
  if (managerType === 'local') {
    return harden({ type: 'local' });
  } else if (managerType === 'xsnap' || managerType === 'xs-worker') {
    const bundleIDs = await bundleHandler.getCurrentBundleIDs();
    return harden({ type: 'xsnap', bundleIDs });
  } else if (managerType === 'node-subprocess') {
    return harden({ type: 'node-subprocess', nodeOptions });
  }
  throw Fail`unknown managerType '${managerType}'`;
}

/**
 * @param {WorkerOptions} origWorkerOptions
 * @param {{bundleHandler: BundleHandler}} options
 * @returns {Promise<WorkerOptions>}
 */
export async function updateWorkerOptions(
  origWorkerOptions,
  { bundleHandler },
) {
  const { type } = origWorkerOptions;
  await null;
  if (type === 'local') {
    return origWorkerOptions;
  } else if (type === 'node-subprocess') {
    return origWorkerOptions;
  } else if (type === 'xsnap') {
    const bundleIDs = await bundleHandler.getCurrentBundleIDs();
    return harden({ ...origWorkerOptions, bundleIDs });
  }
  throw Fail`unknown worker type '${type}'`;
}
