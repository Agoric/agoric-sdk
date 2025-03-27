import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { IBCChannelID, IBCConnectionID, IBCPortID } from '@agoric/vats';
import {
  type LocalIbcAddress,
  type RemoteIbcAddress,
} from '@agoric/vats/tools/ibc-utils.js';
import { fromHex } from '@cosmjs/encoding';
import bs58 from 'bs58';

// XXX consider moving to vats/tools/ibc-utils by updating current values or renaming as `NEGOTIATED_...`
// These take those values and build off of them
const REMOTE_ADDR_RE =
  /^(?<hops>(?:\/ibc-hop\/[^/]+)*)\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;
const LOCAL_ADDR_RE =
  /^\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;

export const parseRemoteAddress = (
  address: RemoteIbcAddress,
): {
  rConnectionID: IBCConnectionID;
  rPortID: IBCPortID;
  rChannelID: IBCChannelID;
} => {
  const match = address.match(REMOTE_ADDR_RE);
  if (!match || !match.groups) {
    throw Error('Invalid remote address format');
  }

  const { portID, version, channelID } = match.groups;
  const versionObj = JSON.parse(version);

  return {
    rConnectionID: versionObj.host_connection_id,
    rPortID: portID,
    rChannelID: channelID as IBCChannelID,
  };
};

export const parseLocalAddress = (
  address: LocalIbcAddress,
): {
  lConnectionID: IBCConnectionID;
  lPortID: IBCPortID;
  lChannelID: IBCChannelID;
} => {
  const match = address.match(LOCAL_ADDR_RE);
  if (!match || !match.groups) {
    throw Error('Invalid local address format');
  }

  const { portID, version, channelID } = match.groups;
  const versionObj = JSON.parse(version);

  return {
    lConnectionID: versionObj.controller_connection_id,
    lPortID: portID,
    lChannelID: channelID as IBCChannelID,
  };
};

// https://github.com/Agoric/agoric-sdk/pull/11037/files#diff-ab8e7785ae43086c39c85476d30212af7ed31ef5d5f19bb56e06f25999d9b11aR153
/**
 * Left pad the mint recipient address with 0's to 32 bytes. standard ETH
 * addresses are 20 bytes, but for ABI data structures and other reasons, 32
 * bytes are used.
 *
 * @param {string} rawAddress
 */
export const leftPadEthAddressTo32Bytes = (rawAddress: string) => {
  const cleanedAddress = rawAddress.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedAddress.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + cleanedAddress;
  return fromHex(paddedAddress);
};

const solanaAddressToCctpRecipient = (solanaAddress: string) =>
  bs58.decode(solanaAddress);

const mintRecipientParser = {
  eip155: leftPadEthAddressTo32Bytes,
  solana: solanaAddressToCctpRecipient, // really? to hex? not bytes?
};

export const asMintRecipient = (destId: string) => {
  const dest = parseAccountId(destId);
  if (!('namespace' in dest)) throw Error(`missing namespace: ${dest}`);
  const parse = mintRecipientParser[dest.namespace];
  if (!parse) throw Error(`not supported: ${dest.namespace}`);
  const mintRecipient: Uint8Array = parse(dest.accountAddress);

  return { dest, mintRecipient };
};
