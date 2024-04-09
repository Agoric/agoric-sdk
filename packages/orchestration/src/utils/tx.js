// @ts-check
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { decodeBase64, encodeBase64 } from '@endo/base64';

/** @typedef {{ typeUrl: string; value: string; }} Proto3Msg */

/**
 * Makes an IBC packet from an array of messages. Expects the `value` of each message
 * to be base64 encoded bytes.
 * Skips checks for malformed messages in favor of interface guards.
 * @param {Proto3Msg[]} msgs
 * // XXX intellisense does not seem to infer well here
 * @param {Omit<TxBody, 'messages'>} [opts]
 * @returns {string} - IBC TX packet
 * @throws {Error} if malformed messages are provided
 */
export function makeTxPacket(msgs, opts) {
  const messages = msgs.map(msg => ({
    typeUrl: msg.typeUrl,
    value: decodeBase64(msg.value),
  }));
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
 * base64 encode an EncodeObject for cross-vat communication
 * @param {{ typeUrl: string, value: Uint8Array }} tx
 * @returns {Proto3Msg}
 */
export function txToBase64(tx) {
  return {
    typeUrl: tx.typeUrl,
    value: encodeBase64(tx.value),
  };
}
harden(txToBase64);

/**
 * Looks for a result or error key in the response string, and returns
 * a Base64Bytes string. This string can be decoded using the corresponding
 * Msg*Response object.
 * Error strings seem to be plain text and do not need decoding.
 * @param {string} response
 * @returns {string} - base64 encoded bytes string
 * @throws {Error} if error key is detected in response string, or result key is not found
 */
export function parsePacketAck(response) {
  const { result, error } = JSON.parse(response);
  if (result) return result;
  else if (error) throw Error(error);
  else throw Error(response);
}
harden(parsePacketAck);
