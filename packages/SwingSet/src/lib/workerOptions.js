/**
 * @param {import("../types-external").KernelKeeper} kernelKeeper
 * @param {string} [managerType]
 * @returns {Promise<import("../types-internal").WorkerOptions>}
 */
export async function makeWorkerOptions(kernelKeeper, managerType) {
  managerType = managerType || kernelKeeper.getDefaultManagerType();
  if (managerType === 'local') {
    return harden({ type: 'local' });
  } else if (managerType === 'xs-worker') {
    return harden({ type: 'xsnap' });
  }
  throw Error(`unknown managerType '${managerType}'`);
}

/**
 * @param {import("../types-internal").WorkerOptions} origWorkerOptions
 * @returns {Promise<import("../types-internal").WorkerOptions>}
 */
export async function updateWorkerOptions(origWorkerOptions) {
  const { type } = origWorkerOptions;
  if (type === 'local') {
    return origWorkerOptions;
  } else if (type === 'xsnap') {
    return harden({ ...origWorkerOptions });
  }
  throw Error(`unknown worker type '${type}'`);
}
