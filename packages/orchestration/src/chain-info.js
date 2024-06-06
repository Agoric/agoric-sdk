// UNTIL https://github.com/Agoric/agoric-sdk/issues/8879

/** @file temporary static lookup of chain info */

import { E } from '@endo/far';

/**
 * @import {CosmosChainInfo, EthChainInfo} from './types.js';
 */

/** @typedef {CosmosChainInfo | EthChainInfo} ChainInfo */

// TODO generate this automatically with a build script drawing on data sources such as https://github.com/cosmos/chain-registry

// XXX inlines the enum values to save the import (entraining cosmic-proto which is megabytes)

export const wellKnownChainInfo =
  /** @satisfies {Record<string, ChainInfo>} */ (
    harden({
      agoric: {
        chainId: 'agoriclocal',
        connections: {
          cosmoslocal: {
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
        ibcHooksEnabled: true,
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
      },
      // https://github.com/cosmos/chain-registry/blob/master/stride/chain.json
      stride: {
        chainId: 'stride-1',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'ustride' }],
      },
      cosmos: {
        chainId: 'cosmoshub-4',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'uatom' }],
      },
      celestia: {
        chainId: 'celestia',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'utia' }],
      },
      osmosis: {
        chainId: 'osmosis-1',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'uosmo' }],
      },
    })
  );

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {(...messages: string[]) => void} log
 */
export const registerChainNamespace = async (agoricNamesAdmin, log) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild('chain');

  const registrationPromises = Object.entries(wellKnownChainInfo).map(
    async ([name, info]) => {
      log(`registering chain ${name}`);
      return E(nameAdmin).update(name, info);
    },
  );

  await Promise.all(registrationPromises);
};
