import { Fail, q } from '@endo/errors';
import { fromHex } from '@cosmjs/encoding';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {Bech32Address, CosmosChainAddress, CaipChainId} from '../types.js';
 * @import {AccountId, AccountIdArg, Caip10Record} from '../orchestration-api.js';
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
 * @returns {CosmosChainAddress['value'] | undefined} returns undefined on error
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
 * Extracts the human-readable part (HRP), aka `bech32Prefix`, from an address.
 *
 * see
 * [bech32.js](https://github.com/bitcoinjs/bech32/blob/5ceb0e3d4625561a459c85643ca6947739b2d83c/src/index.ts#L146)
 * for the reference implementation.
 *
 * @param {Bech32Address | string} address - The full Bech32-encoded address.
 * @returns {string} - The extracted HRP (prefix).
 */
export const getBech32Prefix = address => {
  assert(address, 'address is required');
  const split = address.lastIndexOf('1');
  if (split === -1) return Fail`No separator character for ${q(address)}`;
  if (split === 0) return Fail`Missing prefix for ${q(address)}`;
  return address.slice(0, split);
};

/**
 * Parse an account ID into a structured format following CAIP-10 standards.
 *
 * @param {AccountIdArg} idArg CAIP-10 account ID or an unscoped on-chain
 *   address
 * @returns {Caip10Record} - The parsed account details.
 */
export const parseAccountIdArg = idArg => {
  if (typeof idArg === 'string') {
    return parseAccountId(idArg);
  }

  // it's a CosmosChainAddress
  return {
    namespace: 'cosmos',
    reference: idArg.chainId,
    accountAddress: idArg.value,
  };
};
harden(parseAccountIdArg);

/**
 * Parse an account ID into a structured format following CAIP-10 standards.
 *
 * @param {AccountId} accountId CAIP-10 account ID
 * @returns {Caip10Record} - The parsed account details.
 */
export const parseAccountId = accountId => {
  const parts = accountId.split(':');
  parts.length === 3 || Fail`malformed CAIP-10 accountId: ${q(accountId)}`;

  // Full CAIP-10
  const [namespace, reference, accountAddress] = parts;
  return {
    namespace,
    reference,
    accountAddress,
  };
};
harden(parseAccountId);

/**
 * Extract a {@link CaipChainId} from an account ID or unscoped chain address.
 *
 * @param {AccountIdArg} accountIdArg CAIP-10 account ID or unscoped chain
 *   address
 * @returns {CaipChainId}
 */
export const chainOfAccount = accountIdArg => {
  const { namespace, reference } = parseAccountIdArg(accountIdArg);
  return `${namespace}:${reference}`;
};

/**
 * Left pad the mint recipient address with 0's to 32 bytes. standard ETH
 * addresses are 20 bytes, but for ABI data structures and other reasons, 32
 * bytes are used.
 *
 * @param {string} rawAddress
 */
export const leftPadEthAddressTo32Bytes = rawAddress => {
  const cleanedAddress = rawAddress.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedAddress.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + cleanedAddress;
  return fromHex(paddedAddress);
};

/**
 * @param {AccountId} accountId
 * @returns {Uint8Array}
 * @throws {Error} if namespace not supported
 */
export const accountIdTo32Bytes = accountId => {
  const { namespace, accountAddress } = parseAccountId(accountId);
  switch (namespace) {
    case 'eip155':
      return leftPadEthAddressTo32Bytes(accountAddress);
    default:
      throw new Error(`namespace ${namespace} not supported`);
  }
};
