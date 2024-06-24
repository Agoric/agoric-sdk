import { QueryBalanceResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { CosmosResponse } from '@agoric/cosmic-proto/icq/v1/packet.js';
import { ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { encodeBase64, btoa } from '@endo/base64';

interface EncoderI<T> {
  encode: (message: T) => {
    finish: () => Uint8Array;
  };
  fromPartial: (partial: Partial<T>) => T;
  typeUrl: string;
}

const toPacket = (obj: Record<string, any>): string =>
  btoa(JSON.stringify(obj));

/**
 * Build a response "packet bytes string" we'd expect to see from a Msg
 * Response
 *
 * XXX support multiple responses in a single message
 *
 * @param Encoder
 * @param message
 */
export function buildMsgResponseString<T>(
  Encoder: EncoderI<T>,
  message: Partial<T>,
): string {
  const encodedMsg = Encoder.encode(Encoder.fromPartial(message)).finish();

  // cosmos-sdk double Any encodes 🤷‍♂️
  const encodedAny = Any.encode(
    Any.fromPartial({
      value: Any.encode(
        Any.fromPartial({
          typeUrl: Encoder.typeUrl,
          value: encodedMsg,
        }),
      ).finish(),
    }),
  ).finish();

  return toPacket({
    result: encodeBase64(encodedAny),
  });
}

/**
 * Build an example error packet for a failed Tx Msg
 * @param msg
 */
export function buildMsgErrorString(
  msg = 'ABCI code: 5: error handling packet: see events for details',
): string {
  return toPacket({
    error: msg,
  });
}

/**
 * Build a response "packet bytes string" we'd expect to see from a Query
 * request
 *
 * XXX accept multiple queries at once
 *
 * @param Encoder
 * @param query
 * @param opts
 */
export function buildQueryResponseString<T>(
  Encoder: EncoderI<T>,
  query: Partial<T>,
  opts: Omit<ResponseQuery, 'key'> = {
    value: new Uint8Array(),
    height: 0n,
    index: 0n,
    code: 0,
    log: '',
    info: '',
    codespace: '',
  },
): string {
  const encodedResp = CosmosResponse.encode(
    CosmosResponse.fromPartial({
      responses: [
        {
          key: Encoder.encode(Encoder.fromPartial(query)).finish(),
          ...opts,
        },
      ],
    }),
  ).finish();

  return toPacket({
    result: toPacket({ data: encodeBase64(encodedResp) }),
  });
}

const responses = {
  delegate: buildMsgResponseString(MsgDelegateResponse, {}),
  queryBalance: buildQueryResponseString(QueryBalanceResponse, {
    balance: { amount: '0', denom: 'uatom' },
  }),
  error5: buildMsgErrorString(
    'ABCI code: 5: error handling packet: see events for details',
  ),
};

export const protoMsgMocks = {
  delegate: {
    // delegate 10 uatom from cosmos1test to cosmosvaloper1test
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
    ack: responses.delegate,
  },
  queryBalance: {
    // query balance of uatom for cosmos1test
    msg: 'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmwiLCJtZW1vIjoiIn0=',
    ack: responses.queryBalance,
  },
  error: {
    ack: responses.error5,
  },
};

export function defaultMockAck(packetData: string): string {
  switch (packetData) {
    case protoMsgMocks.delegate.msg:
      return protoMsgMocks.delegate.ack;
    case protoMsgMocks.queryBalance.msg:
      return protoMsgMocks.queryBalance.ack;
    default:
      return protoMsgMocks.error.ack;
  }
}
