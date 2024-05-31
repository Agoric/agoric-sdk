/**
 * @file Mocked Chain Info object until #8879
 */
import {
  Order,
  State as IBCChannelState,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import { State as IBCConnectionState } from '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api.js';
 */

/**
 * currently keyed by ChainId, as this is what we have available in ChainAddress
 * to determine the correct IBCChannelID's for a .transfer() msg.
 *
 * @type {Record<string, IBCConnectionInfo>}
 */
const connectionEntries = harden({
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
    state: IBCConnectionState.STATE_OPEN,
    transferChannel: {
      portId: 'transfer',
      channelId: 'channel-1',
      counterPartyChannelId: 'channel-1',
      counterPartyPortId: 'transfer',
      ordering: Order.ORDER_UNORDERED,
      state: IBCChannelState.STATE_OPEN,
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
    state: IBCConnectionState.STATE_OPEN,
    transferChannel: {
      portId: 'transfer',
      channelId: 'channel-0',
      counterPartyChannelId: 'channel-1',
      counterPartyPortId: 'transfer',
      ordering: Order.ORDER_UNORDERED,
      state: IBCChannelState.STATE_OPEN,
      version: 'ics20-1',
    },
    versions: [{ identifier: '', features: ['', ''] }],
    delay_period: 0n,
  },
});

/**
 * @param {Zone} zone
 * @returns {Pick<CosmosChainInfo, 'connections' | 'chainId'>}
 */
export const prepareMockChainInfo = zone => {
  const agoricConnections =
    /** @type {import('@agoric/store').MapStore<string, IBCConnectionInfo>} */ (
      zone.mapStore('ibcConnections')
    );

  agoricConnections.addAll(Object.entries(connectionEntries));

  return harden({
    chainId: 'agoriclocal',
    connections: agoricConnections,
  });
};
