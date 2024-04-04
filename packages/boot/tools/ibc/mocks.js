/**
 * mock bridgeInbound events for ICA (ICS-27) flow
 * see [./ics27-1.md](./ics27-1.md) for more details
 *
 * sourced from [@agoric/vats/test/test-network.js](https://github.com/Agoric/agoric-sdk/blob/4601a1ab65a0c36fbfbfcc1fa59e83ee10a1c996/packages/vats/test/test-network.js)
 * and end e2e testing with sim chains (v16: IBC fromBridge logs)
 */
export const icaMocks = {
  startChannelOpenInit: {
    // ICA Channel Creation
    channelOpenAck: obj => ({
      type: 'IBC_EVENT',
      blockHeight: 99,
      blockTime: 1711571357,
      event: 'channelOpenAck',
      portID: obj.packet.source_port,
      channelID: 'channel-0',
      counterparty: {
        port_id: obj.packet.destination_port,
        channel_id: 'channel-1',
      },
      counterpartyVersion:
        '{"version":"ics27-1","controllerConnectionId":"connection-0","hostConnectionId":"connection-0","address":"osmo1234","encoding":"proto3","txType":"sdk_multi_msg"}',
      connectionHops: obj.hops,
    }),
    // XXX channelOpenAckFailure
  },
};
