import { Fail, q } from '@endo/errors';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {ChainAddress} from '../types.js';
 * @import {RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 */

/**
 * @typedef {object} ICAChannelAddressOpts
 * @property {string} [encoding='proto3'] message encoding format for the
 *   channel
 * @property {'ordered' | 'unordered'} [ordering='ordered'] channel ordering.
 *   currently only `ordered` is supported for ics27-1
 * @property {string} [txType='sdk_multi_msg'] default is `sdk_multi_msg`
 * @property {string} [version='ics27-1'] default is `ics27-1`
 */

/**
 * @param {IBCConnectionID} hostConnectionId Counterparty Connection ID
 * @param {IBCConnectionID} controllerConnectionId Self Connection ID
 * @param {ICAChannelAddressOpts} [opts]
 * @returns {RemoteIbcAddress}
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
harden(makeICAChannelAddress);

export const DEFAULT_ICQ_VERSION = 'icq-1';

/**
 * @param {IBCConnectionID} controllerConnectionId
 * @param {string} version defaults to icq-1
 * @returns {RemoteIbcAddress}
 */
export const makeICQChannelAddress = (
  controllerConnectionId,
  version = DEFAULT_ICQ_VERSION,
) => {
  controllerConnectionId || Fail`controllerConnectionId is required`;
  return `/ibc-hop/${controllerConnectionId}/ibc-port/icqhost/unordered/${version}`;
};
harden(makeICQChannelAddress);

/**
 * Parse a chain address from a remote address string. Assumes the address
 * string is in a JSON format and contains an "address" field. This function is
 * designed to be safe against malformed inputs and unexpected data types, and
 * will return `undefined` in those cases.
 *
 * @param {RemoteIbcAddress} remoteAddressString - remote address string,
 *   including version
 * @returns {ChainAddress['value'] | undefined} returns undefined on error
 */
export const findAddressField = remoteAddressString => {
  try {
    // Extract JSON version string assuming it's always surrounded by {}
    const jsonStr = remoteAddressString?.match(/{.*?}/)?.[0];
    const jsonObj = jsonStr ? JSON.parse(jsonStr) : undefined;
    if (!jsonObj?.address?.length) return undefined;
    return jsonObj.address;
  } catch (error) {
    return undefined;
  }
};
harden(findAddressField);

/**
 * Extracts the human readable part (HRP), aka `bech32Prefix`, from an address.
 *
 * see
 * [bech32.js](https://github.com/bitcoinjs/bech32/blob/5ceb0e3d4625561a459c85643ca6947739b2d83c/src/index.ts#L146)
 * for reference implementation
 *
 * @param {string} address
 */
export const getBech32Prefix = address => {
  assert(address, 'address is required');
  const split = address.lastIndexOf('1');
  if (split === -1) return Fail`No separator character for ${q(address)}`;
  if (split === 0) return Fail`Missing prefix for ${q(address)}`;
  return address.slice(0, split);
};
