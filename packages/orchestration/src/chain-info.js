import { E } from '@endo/far';
import { mustMatch } from '@endo/patterns';
import { connectionKey } from './exos/chain-hub.js';
import fetchedChainInfo from './fetched-chain-info.js'; // Refresh with scripts/refresh-chain-info.ts
import { CosmosChainInfoShape } from './typeGuards.js';

/** @import {CosmosChainInfo, EthChainInfo} from './types.js'; */

/** @typedef {CosmosChainInfo | EthChainInfo} ChainInfo */

const knownChains = /** @satisfies {Record<string, ChainInfo>} */ (
  harden({
    ...fetchedChainInfo,
    // FIXME does not have useful connections
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/9492
    agoriclocal: {
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
        },
      },
    },
  })
);

/** @typedef {typeof knownChains} KnownChains */

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {string} name
 * @param {CosmosChainInfo} chainInfo
 * @param {(...messages: string[]) => void} [log]
 */
export const registerChain = async (
  agoricNamesAdmin,
  name,
  chainInfo,
  log = () => {},
) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild('chain');
  const { nameAdmin: connAdmin } =
    await E(agoricNamesAdmin).provideChild('chainConnection');

  mustMatch(chainInfo, CosmosChainInfoShape);
  const { connections = {}, ...vertex } = chainInfo;

  const promises = [
    E(nameAdmin)
      .update(name, vertex)
      .then(() => log(`registered agoricNames chain.${name}`)),
  ];

  // FIXME updates redundantly, twice per edge
  for (const [counterChainId, connInfo] of Object.entries(connections)) {
    const key = connectionKey(chainInfo.chainId, counterChainId);
    promises.push(
      E(connAdmin)
        .update(key, connInfo)
        .then(() => log(`registering agoricNames chainConnection.${key}`)),
    );
  }
  // Bundle to pipeline IO
  await Promise.all(promises);
};

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {(...messages: string[]) => void} [log]
 */
export const registerChainNamespace = async (agoricNamesAdmin, log) => {
  for await (const [name, info] of Object.entries(knownChains)) {
    await registerChain(agoricNamesAdmin, name, info, log);
  }
};
