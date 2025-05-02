/* eslint-disable */
/**
 * @file typedefs for the Smart Wallet script environment
 *
 *   To use add this to the top of the proposal:
 *
 *   /// <reference types="@agoric/smart-wallet/src/wallet-script-env" />
 *
 *   That directive has to be before imports, but this one's only useful in
 *   modules that have no imports or named exports.
 */

import type * as far from '@endo/far';
import type { Assert } from 'ses';
import type { AllPowers } from './smartWallet.js';

// Provided by 'CORE_EVAL' handler in chain-behaviors.js
declare global {
  // powers the script may be permitted to use
  var powers: AllPowers;

  // @endo/far exports
  var E: typeof far.E;

  /** Log output tagged with the execution id */
  var trace: typeof console.log;

  // This is correctly the `Assert` type from `'ses'`, not from @endo/errors
  // See https://github.com/Agoric/agoric-sdk/issues/9515
  var assert: Assert;

  // console is a VirtualConsole but this directive fails to override the extant global `console`
  // var console: VirtualConsole;

  // Base64 and URL are not available in all environments
}
