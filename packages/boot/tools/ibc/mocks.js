// @ts-check

/** @import { IBCChannelID, IBCMethod, IBCEvent } from '@agoric/vats'; */

const responses = {
  // {"result":"+/cosmos.staking.v1beta1.MsgDelegateResponse"}
  delegate:
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  // XXX what does code 5 mean? are there other codes?
  // {"error":"ABCI code: 5: error handling packet: see events for details"}
  error:
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
};

export const protoMsgMocks = {
  // MsgDelegate 10uatom from cosmos1test to cosmosvaloper1test
  delegate: {
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
    ack: responses.delegate,
  },
  // MsgDelegate 10uatom from cosmos1test to cosmosvaloper1test with memo: 'TESTING' and timeoutHeight: 1_000_000_000n
  delegateWithOpts: {
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXdFZ2RVUlZOVVNVNUhHSUNVNjl3RCIsIm1lbW8iOiIifQ==',
    ack: responses.delegate,
  },
  error: {
    ack: responses.error,
  },
};

/**
 * Adds parameters to IBC version string if it's JSON
 * @param {string} version version or JSON version string
 * @param {{ address: string; }} params
 * @returns {string}
 */
export const addParamsIfJsonVersion = (version, params) => {
  try {
    const parsed = JSON.parse(version);
    return JSON.stringify({
      ...parsed,
      ...params,
    });
  } catch {
    return version;
  }
};

/**
 * mock bridgeInbound events for ICA (ICS-27) flow
 * see [./ics27-1.md](./ics27-1.md) for more details
 *
 * sourced from [@agoric/vats/test/test-network.js](https://github.com/Agoric/agoric-sdk/blob/4601a1ab65a0c36fbfbfcc1fa59e83ee10a1c996/packages/vats/test/test-network.js)
 * and end e2e testing with sim chains (v16: IBC fromBridge logs)
 */
export const icaMocks = {
  /**
   * ICA Channel Creation
   * @param {IBCMethod<'initOpenExecuted'>} obj
   * @returns {IBCEvent<'channelOpenAck'>}
   */
  channelOpenAck: obj => {
    // Fake a channel IDs from port suffixes. _Ports have no relation to channels._
    /** @type {IBCChannelID} */
    const mockLocalChannelID = `channel-${Number(
      obj?.packet?.source_port?.split('-')?.at(-1),
    )}`;
    /** @type {IBCChannelID} */
    const mockRemoteChannelID = `channel-${Number(
      obj?.packet?.destination_port?.split('-')?.at(-1),
    )}`;

    return {
      type: 'IBC_EVENT',
      blockHeight: 99,
      blockTime: 1711571357,
      event: 'channelOpenAck',
      portID: obj.packet.source_port,
      channelID: mockLocalChannelID,
      counterparty: {
        port_id: obj.packet.destination_port,
        channel_id: mockRemoteChannelID,
      },
      counterpartyVersion: addParamsIfJsonVersion(obj.version, {
        // TODO, parameterize
        address: 'cosmos1test',
      }),
      connectionHops: obj.hops,
      order: obj.order,
      version: obj.version,
    };
  },
  // TODO channelOpenAckFailure

  /**
   * ICA Send Packet (Transaction) - MsgDelegate success
   * @param {IBCMethod<'sendPacket'>} obj
   * @param {number} sequence transaction sequence number
   * @param {string} acknowledgement acknowledgement response as base64 encoded bytes
   * @returns {IBCEvent<'acknowledgementPacket'>}
   */
  ackPacket: (obj, sequence = 1, acknowledgement) => {
    return {
      acknowledgement,
      blockHeight: 289,
      blockTime: 1712180320,
      event: 'acknowledgementPacket',
      packet: {
        data: obj.packet.data,
        destination_channel: obj.packet.destination_channel,
        destination_port: obj.packet.destination_port,
        sequence,
        source_channel: obj.packet.source_channel,
        source_port: obj.packet.source_port,
        timeout_height: 0,
        timeout_timestamp: 1712183910866313000,
      },
      relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
      type: 'IBC_EVENT',
    };
  },
};
