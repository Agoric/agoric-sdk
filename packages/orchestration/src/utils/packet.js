// @ts-check
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { encodeBase64 } from '@endo/base64';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';

/**
 * Makes an IBC packet from an array of messages. Expects the `value` of each message
 * to be base64 encoded bytes.
 * Skips checks for malformed messages in favor of interface guards.
 * @param {import('@agoric/cosmic-proto').AnyJson[]} msgs
 * // XXX intellisense does not seem to infer well here
 * @param {Omit<TxBody, 'messages'>} [opts]
 * @returns {string} - IBC TX packet
 * @throws {Error} if malformed messages are provided
 */
export function makeTxPacket(msgs, opts) {
  const messages = msgs.map(Any.fromJSON);
  const bytes = TxBody.encode(
    TxBody.fromPartial({
      messages,
      ...opts,
    }),
  ).finish();

  return JSON.stringify({
    type: 1,
    data: encodeBase64(bytes),
    memo: '',
  });
}
harden(makeTxPacket);

/**
 * Looks for a result or error key in the response string, and returns
 * a Base64Bytes string. This string can be decoded using the corresponding
 * Msg*Response object.
 * Error strings seem to be plain text and do not need decoding.
 * @param {string} response
 * @returns {string} - base64 encoded bytes string
 * @throws {Error} if error key is detected in response string, or result key is not found
 */
export function parseTxPacket(response) {
  const { result, error } = JSON.parse(response);
  if (result) return result;
  else if (error) throw Error(error);
  else throw Error(response);
}
harden(parseTxPacket);
