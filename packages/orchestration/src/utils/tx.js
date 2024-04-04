import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { dataToBase64, base64ToBytes } from '@agoric/network';

/** @import { Proto3Msg } from '../types' */

/** @typedef {string} Base64Bytes - Uint8Array, base64 encoded */
/** @typedef {{ typeUrl: string; value: Base64Bytes; }} Proto3Msg */

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
    value: base64ToBytes(msg.value),
  }));
  const bytes = TxBody.encode(
    TxBody.fromPartial({
      messages,
      ...opts,
    }),
  ).finish();

  return JSON.stringify({
    type: 1,
    data: dataToBase64(bytes),
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
    value: dataToBase64(tx.value),
  };
}
harden(txToBase64);

/**
 * @param {string} response
 * @param {unknown} responseDecoder - e.g. MsgDelegateResponse from '@agoric/cosmic-proto'
 * @returns {unknown} - decoded response
 */
export function decodeTxResult(response, responseDecoder) {
  const { result, error } = JSON.parse(response);
  if (error) return error;
  if (result && !responseDecoder) return result;
  if (result) return responseDecoder.decode(base64ToBytes(result));
  console.debug('Unable to decode error or result from response.', response);
  return response;
}
harden(decodeTxResult);
