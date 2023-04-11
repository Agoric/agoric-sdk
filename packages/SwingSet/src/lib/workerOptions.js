/**
 * @param {string} managerType
 * @param {import("../controller/bundle-handler").BundleHandler} bundleHandler
 * @returns {Promise<import("../types-internal").WorkerOptions>}
 */
export async function makeWorkerOptions(managerType, bundleHandler) {
  await null;
  if (managerType === 'local') {
    return harden({ type: 'local' });
  } else if (managerType === 'xsnap' || managerType === 'xs-worker') {
    const bundleIDs = await bundleHandler.getCurrentBundleIDs();
    return harden({ type: 'xsnap', bundleIDs });
  } else if (managerType === 'node-subprocess') {
    return harden({ type: 'node-subprocess' });
  }
  throw Error(`unknown managerType '${managerType}'`);
}

/**
 * @param {import("../types-internal").WorkerOptions} origWorkerOptions
 * @param {{bundleHandler: import("../controller/bundle-handler").BundleHandler}} options
 * @returns {Promise<import("../types-internal").WorkerOptions>}
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
  throw Error(`unknown worker type '${type}'`);
}
