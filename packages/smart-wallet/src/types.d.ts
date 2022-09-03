/**
 * @file Some types for smart-wallet contract
 *
 * Similar to types.js but in TypeScript syntax because some types here need it.
 * Downside is it can't reference any ambient types, which most of agoric-sdk type are presently.
 */

import type { CapData } from '@endo/marshal';

declare const CapDataShape: unique symbol;

export type WalletCapData<T> = CapData<string> & { [CapDataShape]: T };

/**
 * A petname can either be a plain string or a path for which the first element
 * is a petname for the origin, and the rest of the elements are a snapshot of
 * the names that were first given by that origin.  We are migrating away from
 * using plain strings, for consistency.
 */
export type Petname = string | string[];
