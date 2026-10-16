/**
 * @file EVM address helpers with no runtime dependencies, so that modules
 * meant to also run outside of a locked-down (SES) environment, such as the
 * EIP-712 message helpers, can use them.
 */

/**
 * @import {Address as EvmAddress} from 'viem';
 */

/**
 * Compare two EVM addresses for equality, case-insensitive.
 *
 * @param {EvmAddress} a
 * @param {EvmAddress | undefined} b
 * @returns {boolean}
 */
export const sameEvmAddress = (a, b) => a.toLowerCase() === b?.toLowerCase();

/**
 * Whether `x` has the shape of an EVM address: `0x` followed by 40 hex
 * digits, in any casing (an EIP-55 checksum is not verified).
 *
 * @param {unknown} x
 * @returns {x is EvmAddress}
 */
export const isEvmAddressShape = x =>
  typeof x === 'string' && /^0x[0-9a-fA-F]{40}$/u.test(x);
