// @ts-check
import { Fail } from '@agoric/assert';

/**
 * @import { IBCConnectionID } from '@agoric/vats';
 * @import { ChainAddress, CosmosValidatorAddress } from '../types.js';
 */

/**
 * @param {IBCConnectionID} hostConnectionId Counterpart Connection ID
 * @param {IBCConnectionID} controllerConnectionId Self Connection ID
 * @param {object} [opts]
 * @param {string} [opts.encoding] - message encoding format for the channel. default is `proto3`
 * @param {'ordered' | 'unordered'} [opts.ordering] - channel ordering. currently only `ordered` is supported for ics27-1
 * @param {string} [opts.txType] - default is `sdk_multi_msg`
 * @param {string} [opts.version] - default is `ics27-1`
 */
export const makeICAChannelAddress = (
  hostConnectionId,
  controllerConnectionId,
  {
    version = 'ics27-1',
    encoding = 'proto3',
    ordering = 'ordered',
    txType = 'sdk_multi_msg',
  } = {},
) => {
  hostConnectionId || Fail`hostConnectionId is required`;
  controllerConnectionId || Fail`controllerConnectionId is required`;
  const connString = JSON.stringify({
    version,
    controllerConnectionId,
    hostConnectionId,
    address: '', // will be provided by the counterparty after channelOpenAck
    encoding,
    txType,
  });
  return `/ibc-hop/${controllerConnectionId}/ibc-port/icahost/${ordering}/${connString}`;
};

/**
 * Parse a chain address from a remote address string.
 * Assumes the address string is in a JSON format and contains an "address" field.
 * This function is designed to be safe against malformed inputs and unexpected data types, and will return `undefined` in those cases.
 * @param {string} remoteAddressString - remote address string, including version
 * @returns {string | undefined} returns undefined on error
 */
export const parseAddress = remoteAddressString => {
  try {
    // Extract JSON version string assuming it's always surrounded by {}
    const jsonStr = remoteAddressString?.match(/{.*?}/)?.[0];
    const jsonObj = jsonStr ? JSON.parse(jsonStr) : undefined;
    return jsonObj?.address ?? undefined;
  } catch (error) {
    return undefined;
  }
};
harden(parseAddress);
