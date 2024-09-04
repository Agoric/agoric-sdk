import { makeError } from '@endo/errors';
import { decodeBase64, encodeBase64 } from '@endo/base64';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';

/**
 * @import {DenomAmount} from '../types.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js'
 */

/** maximum clock skew, in seconds, for unbonding time reported from other chain */
export const maxClockSkew = 10n * 60n;

/**
 * @param {unknown} response
 * @param {(msg: any) => Any} toProtoMsg
 * @returns {string}
 */
export const encodeTxResponse = (response, toProtoMsg) => {
  const protoMsg = toProtoMsg(response);
  const any1 = Any.fromPartial(protoMsg);
  const any2 = Any.fromPartial({ value: Any.encode(any1).finish() });
  const ackStr = encodeBase64(Any.encode(any2).finish());
  return ackStr;
};

/**
 * @template T
 * @param {string} ackStr
 * @param {(p: { typeUrl: string; value: Uint8Array }) => T} fromProtoMsg
 */
export const tryDecodeResponse = (ackStr, fromProtoMsg) => {
  try {
    const any = Any.decode(decodeBase64(ackStr));
    const protoMsg = Any.decode(any.value);

    const msg = fromProtoMsg(protoMsg);
    return msg;
  } catch (cause) {
    throw makeError(`bad response: ${ackStr}`, undefined, { cause });
  }
};

/**
 * Transform a cosmos-sdk {@link Coin} object into a {@link DenomAmount}
 *
 * @type {(c: { denom: string; amount: string }) => DenomAmount}
 */
export const toDenomAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });
