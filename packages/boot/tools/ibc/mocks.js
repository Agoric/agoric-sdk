/** @import { ChannelId, ChannelOrdering, ConnectionId, DestinationPort, SourcePort } from '@agoric/orchestration'; */

/**
 * based on BridgeId.DIBC events
 * @typedef {{
 *  hops: ConnectionId[];
 *  method: 'startChannelOpenInit';
 *  order: ChannelOrdering;
 *  packet: {
 *    destination_port: DestinationPort;
 *    source_port: SourcePort;
 *  };
 *  type: 'IBC_METHOD';
 *  version: string;
 * }} ChannelOpenInitMethod
 */

/**
 * based on BridgeId.DIBC events
 * @typedef {{
 *  method: 'sendPacket';
 *  packet: {
 *    data: string;
 *    destination_channel: ChannelId;
 *    destination_port: DestinationPort;
 *    source_channel: ChannelId;
 *    source_port: SourcePort;
 *  };
 *  relativeTimeoutNs: string;
 *  type: 'IBC_METHOD';
 * }} SendPacketMethod
 */

/**
 * @param {string} versionString version string
 * @param {{ address: string; }} [params]
 * @returns {string}
 */
const addParamsToVersion = (versionString, params) => {
  return JSON.stringify({
    ...JSON.parse(versionString),
    ...params,
  });
};

/**
 * mock bridgeInbound events for ICA (ICS-27) flow
 * see [./ics27-1.md](./ics27-1.md) for more details
 *
 * sourced from [@agoric/vats/test/test-network.js](https://github.com/Agoric/agoric-sdk/blob/4601a1ab65a0c36fbfbfcc1fa59e83ee10a1c996/packages/vats/test/test-network.js)
 * and end e2e testing with sim chains (v16: IBC fromBridge logs)
 */
export const icaMocks = {
  startChannelOpenInit: {
    /**
     * ICA Channel Creation
     * @param {ChannelOpenInitMethod} obj
     */
    channelOpenAck: obj => {
      const icaControllerNonce = obj?.packet?.source_port?.split('-')?.[1];
      return {
        type: 'IBC_EVENT',
        blockHeight: 99,
        blockTime: 1711571357,
        event: 'channelOpenAck',
        portID: obj.packet.source_port,
        channelID: `channel-${icaControllerNonce}`,
        counterparty: {
          port_id: obj.packet.destination_port,
          channel_id: `channel-${icaControllerNonce}`,
        },
        counterpartyVersion: addParamsToVersion(obj.version, {
          address: 'osmo12345',
        }),
        connectionHops: obj.hops,
      };
    },
    // XXX channelOpenAckFailure
  },
  sendPacket: {
    /**
     * ICA Send Packet (Transaction) - MsgDelegate success
     * @param {SendPacketMethod} obj
     */
    msgDelegateResponse: obj => {
      return {
        // {"result":"+/cosmos.staking.v1beta1.MsgDelegateResponse"}
        acknowledgement:
          'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
        blockHeight: 289,
        blockTime: 1712180320,
        event: 'acknowledgementPacket',
        packet: {
          data: obj.packet.data,
          destination_channel: obj.packet.destination_channel,
          destination_port: obj.packet.destination_port,
          sequence: 1, // TODO improve
          source_channel: obj.packet.source_channel,
          source_port: obj.packet.source_port,
          timeout_height: {},
          timeout_timestamp: 1712183910866313000,
        },
        relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
        type: 'IBC_EVENT',
      };
    },
    /**
     * ICA Send Packet (Transaction) - (generic?) error
     * @param {SendPacketMethod} obj
     */
    acknowledgementPacketFailure: obj => {
      return {
        // {"error":"ABCI code: 5: error handling packet: see events for details"} (ErrPacketTimeout?)
        acknowledgement:
          'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
        blockHeight: 163,
        blockTime: 1712179686,
        event: 'acknowledgementPacket',
        packet: {
          data: 'fail',
          destination_channel: obj.packet.destination_channel,
          destination_port: obj.packet.destination_port,
          sequence: 3, // TODO improve
          source_channel: obj.packet.source_channel,
          source_port: obj.packet.source_port,
          timeout_height: {},
          timeout_timestamp: 1712183276274624000,
        },
        relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
        type: 'IBC_EVENT',
      };
    },
  },
};
