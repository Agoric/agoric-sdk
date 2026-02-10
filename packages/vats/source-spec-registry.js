import { fileURLToPath } from 'url';

/** @param {string} packagePath */
const resolveSourceSpec = packagePath =>
  fileURLToPath(import.meta.resolve(packagePath));

/**
 * Stable registry of `@agoric/vats` source specs used by configs and tests.
 *
 * The `packagePath` field is intended for static config validation.
 */
export const vatsSourceSpecRegistry = {
  bootChain: {
    packagePath: '@agoric/vats/src/core/boot-chain.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/core/boot-chain.js'),
  },
  bootSim: {
    packagePath: '@agoric/vats/src/core/boot-sim.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/core/boot-sim.js'),
  },
  vatAgoricNames: {
    packagePath: '@agoric/vats/src/vat-agoricNames.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-agoricNames.js'),
  },
  vatBank: {
    packagePath: '@agoric/vats/src/vat-bank.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-bank.js'),
  },
  vatBoard: {
    packagePath: '@agoric/vats/src/vat-board.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-board.js'),
  },
  vatBridge: {
    packagePath: '@agoric/vats/src/vat-bridge.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-bridge.js'),
  },
  centralSupply: {
    bundleName: 'centralSupply',
    packagePath: '@agoric/vats/src/centralSupply.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/centralSupply.js'),
  },
  mintHolder: {
    bundleName: 'mintHolder',
    packagePath: '@agoric/vats/src/mintHolder.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/mintHolder.js'),
  },
  vatMints: {
    packagePath: '@agoric/vats/src/vat-mints.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-mints.js'),
  },
  vatPriceAuthority: {
    packagePath: '@agoric/vats/src/vat-priceAuthority.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-priceAuthority.js'),
  },
  vatProvisioning: {
    packagePath: '@agoric/vats/src/vat-provisioning.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-provisioning.js'),
  },
  vatZoe: {
    packagePath: '@agoric/vats/src/vat-zoe.js',
    sourceSpec: resolveSourceSpec('@agoric/vats/src/vat-zoe.js'),
  },
};

/** @param {keyof typeof vatsSourceSpecRegistry} name */
export const getVatsSourceSpec = name => vatsSourceSpecRegistry[name];
