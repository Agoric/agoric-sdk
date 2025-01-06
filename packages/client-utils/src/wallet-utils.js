/** @file backwards compat */

import { makeSmartWalletKit } from './smart-wallet-kit.js';

/** @typedef {import('./smart-wallet-kit.js').SmartWalletKit} WalletUtils  */

/** @deprecated use `makeSmartWalletKit` */
export const makeWalletUtils = makeSmartWalletKit;
