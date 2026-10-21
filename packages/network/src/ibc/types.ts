import type {
  State as IBCChannelState,
  Order,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import type { State as IBCConnectionState } from '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js';

export type RemoteIbcAddress =
  `/${string}ibc-port/${string}/${'ordered' | 'unordered'}/${string}`;
export type LocalIbcAddress = `/ibc-port/${string}`;

export type IBCConnectionID = `connection-${number}`;
export type IBCChannelOrdering = 'ORDERED' | 'UNORDERED';
export type IBCPortID = string;
export type IBCChannelID = `channel-${number}`;

export interface IBCEndpoint {
  hops: IBCConnectionID[];
  portID: IBCPortID;
  order?: IBCChannelOrdering;
  version?: string;
  channelID?: IBCChannelID;
}

export interface IBCTransferChannelInfo {
  portId: string;
  channelId: IBCChannelID;
  counterPartyPortId: string;
  counterPartyChannelId: IBCChannelID;
  ordering: Order;
  state: IBCChannelState;
  version: string; // e.eg. 'ics20-1'
}

/** Represents an IBC Connection between two chains, which can contain multiple Channels. */
export interface IBCConnectionInfo {
  id: IBCConnectionID; // e.g. connection-0
  client_id: string; // '07-tendermint-0'
  state: IBCConnectionState;
  counterparty: {
    client_id: string;
    connection_id: IBCConnectionID;
  };
  transferChannel: IBCTransferChannelInfo;
}
