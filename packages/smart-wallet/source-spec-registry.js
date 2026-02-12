import { fileURLToPath } from 'url';

/** @param {string} packagePath */
const resolveSourceSpec = packagePath =>
  fileURLToPath(import.meta.resolve(packagePath));

export const smartWalletSourceSpecRegistry = {
  walletFactory: {
    bundleName: 'walletFactory',
    packagePath: '@agoric/smart-wallet/src/walletFactory.js',
    sourceSpec: resolveSourceSpec('@agoric/smart-wallet/src/walletFactory.js'),
  },
};

/** @param {keyof typeof smartWalletSourceSpecRegistry} name */
export const getSmartWalletSourceSpec = name =>
  smartWalletSourceSpecRegistry[name];
