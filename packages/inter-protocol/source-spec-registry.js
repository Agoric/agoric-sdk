import { fileURLToPath } from 'url';

/** @param {string} packagePath */
const resolveSourceSpec = packagePath =>
  fileURLToPath(import.meta.resolve(packagePath));

/**
 * Stable registry of bundleable source entries.
 *
 * Keys are logical contract IDs; values carry both the canonical bundle name
 * and source spec so consumers don't need to pair these manually.
 */
export const interProtocolBundleSpecs = {
  psm: {
    bundleName: 'psm',
    packagePath: '@agoric/inter-protocol/src/psm/psm.js',
    sourceSpec: resolveSourceSpec('@agoric/inter-protocol/src/psm/psm.js'),
  },
  econCommitteeCharter: {
    bundleName: 'econCommitteeCharter',
    packagePath: '@agoric/inter-protocol/src/econCommitteeCharter.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/econCommitteeCharter.js',
    ),
  },
  provisionPool: {
    bundleName: 'provisionPool',
    packagePath: '@agoric/inter-protocol/src/provisionPool.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/provisionPool.js',
    ),
  },
  priceAggregator: {
    bundleName: 'priceAggregator',
    packagePath: '@agoric/inter-protocol/src/price/fluxAggregatorContract.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/price/fluxAggregatorContract.js',
    ),
  },
  vaultFactory: {
    bundleName: 'vaultFactory',
    packagePath: '@agoric/inter-protocol/src/vaultFactory/vaultFactory.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/vaultFactory/vaultFactory.js',
    ),
  },
  feeDistributor: {
    bundleName: 'feeDistributor',
    packagePath: '@agoric/inter-protocol/src/feeDistributor.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/feeDistributor.js',
    ),
  },
  reserve: {
    bundleName: 'reserve',
    packagePath: '@agoric/inter-protocol/src/reserve/assetReserve.js',
    sourceSpec: resolveSourceSpec(
      '@agoric/inter-protocol/src/reserve/assetReserve.js',
    ),
  },
};

/**
 * @param {keyof typeof interProtocolBundleSpecs} name
 */
export const getInterProtocolBundleSpec = name =>
  interProtocolBundleSpecs[name];
