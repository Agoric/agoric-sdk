import { composeSmartWalletUtils } from './smart-wallet-utils.js';
import { makeVstorageKit } from './vstorage-kit.js';

export * from './smart-wallet-utils.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {MinimalNetworkConfig} from './network-config.js';
 */
/**
 * Augment VstorageKit with addtional convenience methods for working with
 * Agoric smart wallets. This use of "kit" is unfortunate because it does not
 * pertain to a single smart wallet. (Whereas VstorageKit pertains to a single
 * vstorage tree.) It was once called WalletUtils, which is more accurate.
 *
 * @param {object} root0
 * @param {typeof globalThis.fetch} root0.fetch
 * @param {(ms: number) => Promise<void>} root0.delay
 * @param {boolean} [root0.names]
 * @param {MinimalNetworkConfig} networkConfig
 */
export const makeSmartWalletKit = async (
  {
    fetch,
    // eslint-disable-next-line no-unused-vars -- keep for removing ambient authority
    delay,
    names = true,
  },
  networkConfig,
) => {
  const vsk = makeVstorageKit({ fetch }, networkConfig);

  return composeSmartWalletUtils(vsk, { names });
};
/** @typedef {EReturn<typeof makeSmartWalletKit>} SmartWalletKit */
