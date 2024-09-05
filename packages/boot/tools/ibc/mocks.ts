// @ts-check
import { createMockAckMap } from '@agoric/orchestration/tools/ibc-mocks.js';

/** @import { IBCChannelID, IBCMethod, IBCEvent } from '@agoric/vats'; */

const responses = {
  // {"result":"+/cosmos.staking.v1beta1.MsgDelegateResponse"}
  delegate:
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  // '{"result":{"data":{"balance":{"amount":"0","denom":"uatom"}}}}'
  queryBalance:
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmMwZVVSQmIwdERaMVl4V1ZoU2RtSlNTVUpOUVQwOUluMD0ifQ==',
  // {"result":{"data":[{"balance":{"amount":"0","denom":"uatom"}},{"balance":{"amount":"0","denom":"uatom"}}]}}
  queryBalanceMulti:
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmMwZVVSQmIwdERaMVl4V1ZoU2RtSlNTVUpOUVc5UFRXZDNTME5uYjBaa1YwWXdZakl3VTBGVVFUMGlmUT09In0=',
  // '{"result":{"data":{"balance":{"amount":"0","denom":"some-invalid-denom"}}}}' (does not result in an error)
  // eyJkYXRhIjoiQ2hzeUdRb1hDaEp6YjIxbExXbHVkbUZzYVdRdFpHVnViMjBTQVRBPSJ9
  queryBalanceUnknownDenom:
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmh6ZVVkUmIxaERhRXA2WWpJeGJFeFhiSFZrYlVaellWZFJkRnBIVm5WaU1qQlRRVlJCUFNKOSJ9',
  // /ibc.applications.transfer.v1.MsgTransferResponse - sequence 0n
  ibcTransfer:
    'eyJyZXN1bHQiOiJFak1LTVM5cFltTXVZWEJ3YkdsallYUnBiMjV6TG5SeVlXNXpabVZ5TG5ZeExrMXpaMVJ5WVc1elptVnlVbVZ6Y0c5dWMyVT0ifQ==',
  // {"error":"ABCI code: 4: error handling packet: see events for details"}
  error4:
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNDogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
  // XXX what does code 5 mean? are there other codes? I have observed 1, 4, 5, 7
  // {"error":"ABCI code: 5: error handling packet: see events for details"}
  error5:
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
};

export const protoMsgMocks = {
  // MsgDelegate 10uatom from cosmos1test to cosmosvaloper1test
  delegate: {
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
    ack: responses.delegate,
  },
  // QueryBalanceRequest (/cosmos.bank.v1beta1.Query/Balance) of uatom for cosmos1test
  queryBalance: {
    msg: 'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmwiLCJtZW1vIjoiIn0=',
    ack: responses.queryBalance,
  },
  // QueryBalanceRequest of uatom for cosmos1test, repeated twice
  queryBalanceMulti: {
    msg: 'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmxDam9LRkFvTFkyOXpiVzl6TVhSbGMzUVNCWFZoZEc5dEVpSXZZMjl6Ylc5ekxtSmhibXN1ZGpGaVpYUmhNUzVSZFdWeWVTOUNZV3hoYm1ObCIsIm1lbW8iOiIifQ==',
    ack: responses.queryBalanceMulti,
  },
  // QueryBalanceRequest of 'some-invalid-denom' for cosmos1test
  queryBalanceUnknownDenom: {
    msg: 'eyJkYXRhIjoiQ2tjS0lRb0xZMjl6Ylc5ek1YUmxjM1FTRW5OdmJXVXRhVzUyWVd4cFpDMWtaVzV2YlJJaUwyTnZjMjF2Y3k1aVlXNXJMbll4WW1WMFlURXVVWFZsY25rdlFtRnNZVzVqWlE9PSIsIm1lbW8iOiIifQ==',
    ack: responses.queryBalanceUnknownDenom,
  },
  // Query for /cosmos.bank.v1beta1.QueryBalanceRequest
  queryUnknownPath: {
    msg: 'eyJkYXRhIjoiQ2tBS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaWd2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllVUpoYkdGdVkyVlNaWEYxWlhOMCIsIm1lbW8iOiIifQ==',
    ack: responses.error4,
  },
  // MsgDelegate 10uatom from cosmos1test to cosmosvaloper1test with memo: 'TESTING' and timeoutHeight: 1_000_000_000n
  delegateWithOpts: {
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXdFZ2RVUlZOVVNVNUhHSUNVNjl3RCIsIm1lbW8iOiIifQ==',
    ack: responses.delegate,
  },
  // MsgTransfer 10 ibc/uusdchash from cosmos1test to noble1test through channel-536
  ibcTransfer: {
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ25zS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWs0S0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUVXpOaG9UQ2cxcFltTXZkWFZ6WkdOb1lYTm9FZ0l4TUNJTFkyOXpiVzl6TVhSbGMzUXFDbTV2WW14bE1YUmxjM1F5QURpQThKTEwzUWc9IiwibWVtbyI6IiJ9',
    ack: responses.ibcTransfer,
  },
  error: {
    msg: '',
    ack: responses.error5,
  },
};

export const protoMsgMockMap = createMockAckMap(protoMsgMocks);

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
   * @param {IBCMethod<'startChannelOpenInit'>} obj
   * @returns {IBCEvent<'channelOpenAck'>}
   */
  channelOpenAck: obj => {
    // Fake a channel IDs from port suffixes. _Ports have no relation to channels, and hosts
    // and controllers will likely have different channel IDs for the same channel._
    const mocklID = Number(obj.packet.source_port.split('-').at(-1));
    /** @type {IBCChannelID} */
    const mockLocalChannelID = `channel-${mocklID}`;
    /** @type {IBCChannelID} */
    const mockRemoteChannelID = `channel-${mocklID}`;

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
  ackPacketEvent: (obj, sequence = 1, acknowledgement) => {
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
