import { encodeBech32 } from '@agoric/cosmic-proto/address-hooks.js';
import { sha256 } from '@noble/hashes/sha256';

const MODULE_NAME = 'forwarding';

/**
 * cf. https://github.com/noble-assets/forwarding/blob/main/proto/noble/forwarding/v1/packet.proto
 *
 * @import {Bech32Address} from '@agoric/orchestration';
 * @import {IBCChannelID} from '@agoric/vats';
 *
 * @typedef {{
 *   noble: {
 *     forwarding: {
 *       recipient: Bech32Address;
 *       channel?: IBCChannelID; // Optional: defaults to reverse of incoming channel
 *       fallback?: Bech32Address;
 *     };
 *   };
 * }} RegisterAccountMemo;
 */

/**
 * Generates a Noble forwarding address from channel, recipient, and fallback parameters
 *
 * https://github.com/noble-assets/forwarding/blob/main/types/account.go
 * https://github.com/cosmos/cosmos-sdk/blob/main/types/address/hash.go
 *
 * @param {`channel-${number}`} channel - The channel ID
 * @param {`${string}1${string}`} recipient - The recipient address
 * @param {`noble1${string}` | ''} [fallback] - The fallback address
 * @returns {Uint8Array} The forwarding address bytes
 */
export const GenerateAddress = (channel, recipient, fallback = '') => {
  const key = new TextEncoder().encode(channel + recipient + fallback);

  // Go: first = sha256([]byte(ModuleName))
  const moduleHash = sha256(new TextEncoder().encode(MODULE_NAME));

  // Go: second = sha256(append(first[:], key...))
  const combined = new Uint8Array(moduleHash.length + key.length);
  combined.set(moduleHash);
  combined.set(key, moduleHash.length);

  const finalHash = sha256(combined);

  // Go: return AccAddress(second[12:])
  return finalHash.slice(12);
};

/**
 *
 * @param {`channel-${number}`} channel - The channel ID
 * @param {`${string}1${string}`} recipient - The recipient address
 * @param {`noble1${string}` | ''} [fallback] - The fallback address
 */
export const generateNobleForwardingAddress = (
  channel,
  recipient,
  fallback = '',
) => {
  const bytes = GenerateAddress(channel, recipient, fallback);
  return encodeBech32('noble', bytes);
};
