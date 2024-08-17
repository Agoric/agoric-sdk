import { Fail, q } from '@endo/errors';
import { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  RequestQuery,
  ResponseQuery,
} from '@agoric/cosmic-proto/tendermint/abci/types.js';
import { atob, decodeBase64, encodeBase64 } from '@endo/base64';
import {
  CosmosQuery,
  CosmosResponse,
} from '@agoric/cosmic-proto/icq/v1/packet.js';
import { Type as PacketType } from '@agoric/cosmic-proto/ibc/applications/interchain_accounts/v1/packet.js';

/**
 * @import {AnyJson, JsonSafe} from '@agoric/cosmic-proto';
 * @import {InterchainAccountPacketData} from '@agoric/cosmic-proto/ibc/applications/interchain_accounts/v1/packet.js';
 * @import {InterchainQueryPacketData} from '@agoric/cosmic-proto/icq/v1/packet.js';
 */

/**
 * Makes an IBC transaction packet from an array of messages. Expects the
 * `value` of each message to be base64 encoded bytes. Skips checks for
 * malformed messages in favor of interface guards.
 *
 * @param {AnyJson[]} msgs
 * @param {Partial<Omit<TxBody, 'messages'>>} [opts]
 * @returns {string} stringified InterchainAccountPacketData
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

  return JSON.stringify(
    /** @type {JsonSafe<InterchainAccountPacketData>} */ ({
      type: PacketType.TYPE_EXECUTE_TX,
      data: encodeBase64(bytes),
      memo: '',
    }),
  );
}
harden(makeTxPacket);

/**
 * Makes an IBC query packet from an array of query messages. Expects the `data`
 * of each message to be base64 encoded bytes. Skips checks for malformed
 * messages in favor of interface guards.
 *
 * @param {JsonSafe<RequestQuery>[]} msgs
 * @returns {string} stringified InterchainQueryPacketData
 * @throws {Error} if malformed messages are provided
 */
export function makeQueryPacket(msgs) {
  const bytes = CosmosQuery.encode(
    CosmosQuery.fromPartial({
      requests: msgs.map(RequestQuery.fromJSON),
    }),
  ).finish();

  return JSON.stringify(
    /** @type {JsonSafe<InterchainQueryPacketData>} */ ({
      data: encodeBase64(bytes),
      memo: '',
    }),
  );
}
harden(makeQueryPacket);

/**
 * Looks for a result or error key in the response string, and returns a
 * Base64Bytes string. This string can be decoded using the corresponding
 * Msg*Response object. Error strings seem to be plain text and do not need
 * decoding.
 *
 * @param {string} response
 * @returns {Promise<string>} - base64 encoded bytes string
 */
export const parseTxPacket = response =>
  new Promise((resolve, reject) => {
    try {
      const { result, error } = JSON.parse(response);
      if (result) {
        resolve(result);
      } else if (error) {
        reject(Error(error));
      } else {
        reject(Fail`Expected either result or error: ${q(response)}`);
      }
    } catch (_err) {
      reject(Fail`Expected either result or error: ${q(response)}`);
    }
  });
harden(parseTxPacket);

/**
 * Looks for a result or error key in the response string. If a result is found,
 * `responses` is decoded via `CosmosResponse`. The `key` and `value` fields on
 * the resulting entries are base64 encoded for inter-vat communication. These
 * can be decoded using the corresponding Query*Response objects. Error strings
 * seem to be plain text and do not need decoding.
 *
 * @param {string} resultString
 * @returns {Promise<JsonSafe<ResponseQuery>[]>}
 */
export const decodeQueryPacketResponse = resultString =>
  new Promise((resolve, reject) => {
    try {
      const { data } = JSON.parse(atob(resultString));
      const { responses = [] } = CosmosResponse.decode(decodeBase64(data));
      resolve(harden(responses.map(ResponseQuery.toJSON)));
    } catch (err) {
      reject(Fail`Error decoding query response: ${q(resultString)}`);
    }
  });
harden(decodeQueryPacketResponse);
