import { registerChain } from './utils/chainHub.js';

// Refresh with scripts/refresh-chain-info.ts
import fetchedChainInfo from './fetched-chain-info.js';

/** @import {CosmosChainInfo, EthChainInfo} from './types.js'; */

/** @typedef {CosmosChainInfo | EthChainInfo} ChainInfo */

const knownChains = /** @satisfies {Record<string, ChainInfo>} */ (
  harden({
    ...fetchedChainInfo,
    agoric: {
      chainId: 'agoriclocal',
      connections: {
        'cosmoshub-4': {
          id: 'connection-1',
          client_id: '07-tendermint-3',
          counterparty: {
            client_id: '07-tendermint-2',
            connection_id: 'connection-1',
            prefix: {
              key_prefix: '',
            },
          },
          state: 3 /* IBCConnectionState.STATE_OPEN */,
          transferChannel: {
            portId: 'transfer',
            channelId: 'channel-1',
            counterPartyChannelId: 'channel-1',
            counterPartyPortId: 'transfer',
            ordering: 1 /* Order.ORDER_UNORDERED */,
            state: 3 /* IBCConnectionState.STATE_OPEN */,
            version: 'ics20-1',
          },
          versions: [{ identifier: '', features: ['', ''] }],
          delay_period: 0n,
        },
        osmosislocal: {
          id: 'connection-0',
          client_id: '07-tendermint-2',
          counterparty: {
            client_id: '07-tendermint-2',
            connection_id: 'connection-1',
            prefix: {
              key_prefix: '',
            },
          },
          state: 3 /* IBCConnectionState.STATE_OPEN */,
          transferChannel: {
            portId: 'transfer',
            channelId: 'channel-0',
            counterPartyChannelId: 'channel-1',
            counterPartyPortId: 'transfer',
            ordering: 1 /* Order.ORDER_UNORDERED */,
            state: 3 /* IBCConnectionState.STATE_OPEN */,
            version: 'ics20-1',
          },
          versions: [{ identifier: '', features: ['', ''] }],
          delay_period: 0n,
        },
      },
    },
  })
);

/** @typedef {typeof knownChains} KnownChains */

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {(...messages: string[]) => void} log
 */
export const registerChainNamespace = async (agoricNamesAdmin, log) => {
  for await (const [name, info] of Object.entries(knownChains)) {
    log(`registering agoricNames chain.${name}`);
    await registerChain(agoricNamesAdmin, name, info);
  }
};
