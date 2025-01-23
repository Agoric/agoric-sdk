/**
 * @import {IBCConnectionInfo, ChainAddress, ChainInfo} from '../types.js';
 */

/**
 * @typedef {{
 *   evmChains: Record<string, ChainInfo>;
 *   ibcConnections: Record<
 *     string,
 *     { transferChannel: Partial<IBCConnectionInfo['transferChannel']> }
 *   >;
 * }} AxelarConfig
 */

/**
 * https://docs.axelar.dev/resources/contract-addresses/testnet/
 *
 * @satisfies {AxelarConfig}
 */
export const AxelarTestNet = /** @type {const} */ ({
  evmChains: {
    avalanche: { chainId: '43113' },
    base: { chainId: '84532' },
    // ... etc.
  },
  ibcConnections: {
    osmosis: {
      transferChannel: {
        counterPartyChannelId: 'channel-4118',
      },
    },
    // ... etc.
  },
});
