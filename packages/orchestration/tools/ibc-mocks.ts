import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { CosmosResponse } from '@agoric/cosmic-proto/icq/v1/packet.js';
import {
  RequestQuery,
  ResponseQuery,
} from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { encodeBase64, btoa } from '@endo/base64';
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import { makeQueryPacket, makeTxPacket } from '../src/utils/packet.js';

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

  // cosmos-sdk double Any encodes
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

/**
 * Build a tx packet string for the mocked dibc bridge handler
 * @param msgs
 * @returns {string}
 */
export function buildTxPacketString(
  msgs: { value: Uint8Array; typeUrl: string }[],
): string {
  return btoa(makeTxPacket(msgs.map(Any.toJSON)));
}

/**
 * Build a query packet string for the mocked dibc bridge handler
 * @param msgs
 * @param opts
 * @returns {string}
 */
export function buildQueryPacketString(
  msgs: Any[],
  opts: Partial<Omit<RequestQuery, 'path' | 'data'>> = {},
): string {
  return btoa(makeQueryPacket(msgs.map(msg => toRequestQueryJson(msg, opts))));
}
