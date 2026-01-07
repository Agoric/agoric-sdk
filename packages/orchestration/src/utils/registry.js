import {
  State as IBCChannelState,
  Order,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import { State as IBCConnectionState } from '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js';
import assert from 'node:assert';

/**
 * @import {IBCChannelID, IBCConnectionID} from '@agoric/vats';
 * @import {Chain, IBCData} from '@chain-registry/types';
 * @import {ChainRegistryClient} from '@chain-registry/client';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api.js';
 */

/**
 * @param {IBCData} ibcInfo
 * @param {string} name
 * @param {Record<string, CosmosChainInfo>} chainInfo
 * @returns {[string, IBCConnectionInfo] | []}
 */
function toConnectionEntry(ibcInfo, name, chainInfo) {
  // IbcInfo encodes the undirected edge as a tuple of (chain1, chain2) in alphabetical order
  const fromChain1 = ibcInfo.chain1.chainName === name;
  const [from, to] = fromChain1
    ? [ibcInfo.chain1, ibcInfo.chain2]
    : [ibcInfo.chain2, ibcInfo.chain1];
  assert.equal(from.chainName, name);
  const transferChannels = ibcInfo.channels.filter(
    c => c.chain1.portId === 'transfer' && c.tags?.preferred,
  );
  if (transferChannels.length === 0) {
    console.warn(
      'no transfer channel for [',
      from.chainName,
      to.chainName,
      ']',
      '(skipping)',
    );
    return [];
  }
  if (transferChannels.length > 1) {
    console.warn(
      'multiple preferred transfer channels [',
      from.chainName,
      to.chainName,
      ']:',
      transferChannels,
      '(choosing first)',
    );
  }
  const [channel] = transferChannels;
  const [channelFrom, channelTo] = fromChain1
    ? [channel.chain1, channel.chain2]
    : [channel.chain2, channel.chain1];
  const record = {
    id: /** @type {IBCConnectionID} */ (from.connectionId),
    client_id: from.clientId,
    counterparty: {
      client_id: to.clientId,
      connection_id: /** @type {IBCConnectionID} */ (to.connectionId),
    },
    state: IBCConnectionState.STATE_OPEN, // XXX presumably
    transferChannel: {
      channelId: /** @type {IBCChannelID} */ (channelFrom.channelId),
      portId: channelFrom.portId,
      counterPartyChannelId: /** @type {IBCChannelID} */ (channelTo.channelId),
      counterPartyPortId: channelTo.portId,
      // FIXME mapping, our guard expects a numerical enum
      ordering: Order.ORDER_NONE_UNSPECIFIED,
      state: IBCChannelState.STATE_OPEN, // XXX presumably
      version: channel.version,
    },
  };
  const destChainId = chainInfo[to.chainName].chainId;
  return [destChainId, record];
}

/**
 * Converts the given cosmos chain info to our local config format
 *
 * @param {Pick<ChainRegistryClient, 'chains' | 'ibcData'>} registry
 */
export const convertChainInfo = async registry => {
  /** @type {Record<string, CosmosChainInfo>} */
  const chainInfo = {};

  for (const chain of registry.chains) {
    console.log('processing info', chain.chainName);
    chainInfo[chain.chainName] = {
      // @ts-expect-error possibly undefined
      bech32Prefix: chain.bech32Prefix,
      // @ts-expect-error possibly undefined
      chainId: chain.chainId,
      // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
      icqEnabled: chain.chainName === 'osmosis',
      namespace: 'cosmos',
      // @ts-expect-error possibly undefined
      reference: chain.chainId,
      stakingTokens: chain.staking?.stakingTokens,
    };
  }

  // XXX probably easier to keep ibc separate
  const ibcLookup = {};
  for (const ibc of registry.ibcData) {
    ibcLookup[ibc.chain1.chainName] ||= [];
    ibcLookup[ibc.chain2.chainName] ||= [];

    ibcLookup[ibc.chain1.chainName].push(ibc);
    ibcLookup[ibc.chain2.chainName].push(ibc);
  }

  const chainNames = registry.chains.map(c => c.chainName).sort();

  // iterate this after chainInfo is filled out
  for (const name of chainNames) {
    console.log('processing connections', name);

    const ibcData = ibcLookup[name];
    const connections = Object.fromEntries(
      ibcData
        .map(datum => toConnectionEntry(datum, name, chainInfo))
        .filter(entry => entry.length > 0)
        // sort alphabetically for consistency
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    chainInfo[name] = { ...chainInfo[name], connections };
  }

  // return object with insertion in alphabetical order of chain name
  return Object.fromEntries(chainNames.map(name => [name, chainInfo[name]]));
};
