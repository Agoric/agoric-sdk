/**
 * @param {import("../types-external").KernelKeeper} kernelKeeper
 * @param {import("../controller/bundle-handler").BundleHandler} bundleHandler
 * @param {string} [managerType]
 * @returns {Promise<import("../types-internal").WorkerOptions>}
 */
export async function makeWorkerOptions(
  kernelKeeper,
  bundleHandler,
  managerType,
) {
  managerType = managerType || kernelKeeper.getDefaultManagerType();
  if (managerType === 'local') {
    return harden({ type: 'local' });
  } else if (managerType === 'xs-worker') {
    // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
    const bundleIDs = await bundleHandler.getCurrentBundleIDs();
    return harden({ type: 'xsnap', bundleIDs });
  }
  throw Error(`unknown managerType '${managerType}'`);
}

/**
 * @param {import("../controller/bundle-handler").BundleHandler} bundleHandler
 * @param {import("../types-internal").WorkerOptions} origWorkerOptions
 * @returns {Promise<import("../types-internal").WorkerOptions>}
 */
export async function updateWorkerOptions(bundleHandler, origWorkerOptions) {
  const { type } = origWorkerOptions;
  if (type === 'local') {
    return origWorkerOptions;
  } else if (type === 'xsnap') {
    // eslint-disable-next-line @jessie.js/no-nested-await, no-await-in-loop
    const bundleIDs = await bundleHandler.getCurrentBundleIDs();
    return harden({ ...origWorkerOptions, bundleIDs });
  }
  throw Error(`unknown worker type '${type}'`);
}
